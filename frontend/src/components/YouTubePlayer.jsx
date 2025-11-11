import { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiEdit3, FiEye, FiExternalLink, FiCloud, FiCloudOff, FiTrash2 } from 'react-icons/fi';
import useAuthStore from '../contexts/AuthContext';
import { cloudsAPI } from '../services/api';
import toast from 'react-hot-toast';
import './YouTubePlayer.css';

function YouTubePlayer({ video, clouds = [], onCloudCreated }) {
  const { isAuthenticated, user } = useAuthStore();
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  const [mode, setMode] = useState('watch'); // 'watch' or 'edit'
  const [showClouds, setShowClouds] = useState(false); // 구름 표시 여부 (기본: 숨김)
  const [activeClouds, setActiveClouds] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [cloudInput, setCloudInput] = useState(null);
  const [inputText, setInputText] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);

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

  // Time tracking interval
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [playerReady]);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    setPlayerReady(true);
    setDuration(event.target.getDuration());
    setVolume(event.target.getVolume());
  };

  const onPlayerStateChange = (event) => {
    // 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
    setIsPlaying(event.data === 1);
  };

  const togglePlay = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (newTime) => {
    if (playerRef.current) {
      playerRef.current.seekTo(newTime, true);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
      } else {
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;

    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 50);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOverlayClick = async (e) => {
    if (mode !== 'edit' || !isAuthenticated) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCloudInput({ x, y, timestamp: currentTime });

    // Pause video when adding cloud
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
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

  const youtubeOpts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0, // 커스텀 컨트롤 사용
      modestbranding: 1,
      rel: 0,
      fs: 0, // 전체화면 버튼 숨김 (우리가 만든 것 사용)
      iv_load_policy: 3, // 비디오 주석 숨김
    },
  };

  return (
    <div className="youtube-player-wrapper">
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
        className={`youtube-player-container ${mode === 'edit' ? 'edit-mode' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <div className="youtube-embed">
          <YouTube
            videoId={video.youtube_video_id}
            opts={youtubeOpts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            className="youtube-iframe"
          />
        </div>

        {/* Overlay for clouds and click detection */}
        <div
          className={`player-overlay ${mode === 'edit' ? 'clickable' : ''}`}
          onClick={handleOverlayClick}
        >
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
        </div>

        {/* Custom Controls */}
        <div className={`youtube-controls ${showControls ? 'show' : ''}`}>
          <div
            className="progress-bar"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              handleSeek(pos * duration);
            }}
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
                {isMuted || volume === 0 ? <FiVolumeX /> : <FiVolume2 />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>

            <a
              href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="control-btn youtube-link"
              title="YouTube에서 보기"
            >
              <FiExternalLink />
            </a>

            <button className="control-btn" onClick={toggleFullscreen}>
              <FiMaximize />
            </button>
          </div>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="edit-instructions">
          <p>영상 위를 클릭하여 구름을 남길 위치를 선택하세요. Enter로 저장, ESC로 취소</p>
        </div>
      )}
    </div>
  );
}

export default YouTubePlayer;
