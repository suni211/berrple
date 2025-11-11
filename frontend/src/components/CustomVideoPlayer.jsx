import { useEffect, useRef, useState } from 'react';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiEdit3, FiEye, FiCloud, FiCloudOff, FiTrash2 } from 'react-icons/fi';
import useAuthStore from '../contexts/AuthContext';
import { cloudsAPI } from '../services/api';
import toast from 'react-hot-toast';
import './CustomVideoPlayer.css';

function CustomVideoPlayer({ video, clouds = [], onCloudCreated }) {
  const { isAuthenticated, user } = useAuthStore();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);

  const [mode, setMode] = useState('watch'); // 'watch' or 'edit'
  const [showClouds, setShowClouds] = useState(false); // 구름 표시 여부 (기본: 숨김)
  const [activeClouds, setActiveClouds] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cloudInput, setCloudInput] = useState(null);
  const [inputText, setInputText] = useState('');
  const [showControls, setShowControls] = useState(true);

  // clouds prop을 직접 사용 (내부 state 제거)

  // 모드 변경 시 입력창 닫기
  useEffect(() => {
    if (mode === 'watch' && cloudInput) {
      setCloudInput(null);
      setInputText('');
    }
  }, [mode]);

  // Update active clouds based on current time
  useEffect(() => {
    if (!clouds || clouds.length === 0) {
      setActiveClouds([]);
      return;
    }

    const active = clouds.filter(cloud => {
      const start = parseFloat(cloud.timestamp_sec);
      const end = start + parseFloat(cloud.duration || 3);
      return currentTime >= start && currentTime <= end;
    });
    setActiveClouds(active);
  }, [currentTime, clouds]);

  // Time update handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleProgressClick = (e) => {
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = async (e) => {
    if (mode !== 'edit' || !isAuthenticated) {
      togglePlay();
      return;
    }

    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCloudInput({ x, y, timestamp: currentTime });

    // Pause video when adding cloud
    videoRef.current.pause();
    setIsPlaying(false);
  };

  const handleSubmitCloud = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const response = await cloudsAPI.createCloud({
        videoId: video.id,
        content: inputText,
        timestampSec: cloudInput.timestamp,
        positionX: Math.round(cloudInput.x),
        positionY: Math.round(cloudInput.y),
        duration: 3,
        color: '#00FF80'
      });

      const newCloud = {
        id: response.data.cloudId,
        content: inputText,
        timestamp_sec: cloudInput.timestamp,
        position_x: response.data.position.x,
        position_y: response.data.position.y,
        duration: 3,
        color: '#00FF80'
      };

      setInputText('');
      setCloudInput(null);

      toast.success('구름이 등록되었습니다!');

      // 부모 컴포넌트에 새 구름 전달
      if (onCloudCreated) {
        onCloudCreated(newCloud);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || '구름 등록 실패';
      toast.error(errorMsg);
      console.error(error);
    }
  };

  const handleCancelInput = () => {
    setCloudInput(null);
    setInputText('');
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  return (
    <div className="custom-video-player-wrapper">
      <div className="player-top-controls">
        {/* 구름 보이기/숨기기 버튼 */}
        <button
          className={`cloud-toggle-btn ${showClouds ? 'active' : ''}`}
          onClick={() => setShowClouds(!showClouds)}
          title={showClouds ? '구름 숨기기' : '구름 보이기'}
        >
          {showClouds ? <FiCloud /> : <FiCloudOff />}
          {showClouds ? '구름 숨기기' : '구름 보이기'}
        </button>

        {/* 로그인한 사용자만 모드 전환 가능 */}
        {isAuthenticated && (
          <div className="player-mode-controls">
            <button
              className={`mode-btn ${mode === 'watch' ? 'active' : ''}`}
              onClick={() => setMode('watch')}
            >
              <FiEye /> 재생 모드
            </button>
            <button
              className={`mode-btn ${mode === 'edit' ? 'active' : ''}`}
              onClick={() => setMode('edit')}
            >
              <FiEdit3 /> 작성 모드
            </button>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className={`custom-video-container ${mode === 'edit' ? 'edit-mode' : ''} ${isFullscreen ? 'fullscreen' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={video.video_url}
          onClick={handleVideoClick}
          className="video-element"
          crossOrigin="anonymous"
        />

        {/* Render active clouds - showClouds가 true일 때만 표시 */}
        {mode === 'watch' && showClouds && activeClouds.map((cloud) => (
          <div
            key={cloud.id}
            className="cloud"
            style={{
              left: `${cloud.position_x}%`,
              top: `${cloud.position_y}%`,
              borderColor: cloud.color || '#00FF80',
              animationDuration: `${cloud.duration}s`
            }}
          >
            {cloud.content}
            {user && (user.id === cloud.user_id || user.is_admin) && (
              <button
                className="cloud-delete-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm('이 구름을 삭제하시겠습니까?')) {
                    try {
                      await cloudsAPI.deleteCloud(cloud.id);
                      toast.success('구름이 삭제되었습니다');
                      if (onCloudCreated) onCloudCreated();
                    } catch (error) {
                      toast.error('구름 삭제 실패');
                      console.error(error);
                    }
                  }
                }}
                title="구름 삭제"
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        ))}

        {/* Cloud input */}
        {cloudInput && (
          <form
            className="cloud-input"
            style={{
              left: `${cloudInput.x}%`,
              top: `${cloudInput.y}%`
            }}
            onSubmit={handleSubmitCloud}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="구름 내용 입력..."
              maxLength={200}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancelInput();
                  return;
                }
                e.stopPropagation();
              }}
            />
            <button type="button" className="cancel-btn" onClick={handleCancelInput}>
              ✕
            </button>
          </form>
        )}

        {/* Video Controls */}
        <div className={`video-controls ${showControls ? 'show' : ''}`}>
          <div
            ref={progressBarRef}
            className="progress-bar"
            onClick={handleProgressClick}
          >
            <div
              className="progress-filled"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          <div className="controls-row">
            <button className="control-btn" onClick={togglePlay}>
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div className="volume-control">
              <button className="control-btn" onClick={toggleMute}>
                {isMuted ? <FiVolumeX /> : <FiVolume2 />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>

            <button className="control-btn" onClick={toggleFullscreen}>
              <FiMaximize />
            </button>
          </div>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="edit-instructions">
          <p>영상을 클릭하여 구름을 남길 위치를 선택하세요. Enter로 저장, ESC로 취소</p>
        </div>
      )}
    </div>
  );
}

export default CustomVideoPlayer;
