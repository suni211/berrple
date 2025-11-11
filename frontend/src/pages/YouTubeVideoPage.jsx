import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiExternalLink } from 'react-icons/fi';
import { youtubeAPI, cloudsAPI } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import './YouTubeVideoPage.css';

function YouTubeVideoPage() {
  const { videoId } = useParams();
  const [clouds, setClouds] = useState([]);

  // YouTube 영상 정보 가져오기
  const { data: videoData, isLoading } = useQuery({
    queryKey: ['youtube-video', videoId],
    queryFn: () => youtubeAPI.getVideo(videoId),
  });

  // 구름 데이터 가져오기 (YouTube 영상 ID 기준)
  useEffect(() => {
    if (videoId) {
      loadClouds();
    }
  }, [videoId]);

  const loadClouds = async () => {
    try {
      const response = await cloudsAPI.getClouds(`yt_${videoId}`);
      setClouds(response.data.clouds || []);
    } catch (error) {
      console.error('Failed to load clouds:', error);
      setClouds([]);
    }
  };

  const handleCloudCreated = (newCloud) => {
    // 구름 목록 새로고침 (새 구름이 생성되거나 삭제됨)
    loadClouds();
  };

  if (isLoading) {
    return (
      <div className="container text-center mt-4">
        <div className="spinner"></div>
      </div>
    );
  }

  const video = videoData?.data;

  if (!video) {
    return (
      <div className="container text-center mt-4">
        <h2>Video not found</h2>
      </div>
    );
  }

  // VideoPlayer에 전달할 형식으로 변환
  const videoForPlayer = {
    id: `yt_${videoId}`,
    video_type: 'youtube',
    youtube_video_id: videoId,
    title: video.title,
    description: video.description,
    duration: video.duration,
    allow_clouds: true
  };

  return (
    <div className="youtube-video-page container">
      <div className="copyright-warning">
        <p>⚠️ 이 영상은 YouTube에서 재생됩니다. 저작권은 원 제작자에게 있습니다.</p>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="youtube-original-link"
        >
          <FiExternalLink /> YouTube에서 보기
        </a>
      </div>

      <div className="video-main">
        <VideoPlayer
          video={videoForPlayer}
          clouds={clouds}
          onCloudCreated={handleCloudCreated}
        />

        <div className="video-details">
          <h1 className="video-title">{video.title}</h1>
          <div className="video-meta">
            <span>{video.viewCount || 0} views</span>
            <span>{clouds.length} 구름</span>
            <a
              href={`https://www.youtube.com/channel/${video.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-link"
            >
              {video.channelTitle} <FiExternalLink />
            </a>
          </div>
          <div className="video-description">
            <p>{video.description}</p>
          </div>
          <div className="video-tags">
            {video.tags?.slice(0, 10).map((tag, index) => (
              <Link key={index} to={`/search?q=${tag}`} className="tag">
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="clouds-section">
        <h2>구름 목록 ({clouds.length}개)</h2>
        {clouds.length === 0 ? (
          <p className="no-clouds">아직 구름이 없습니다. 첫 번째 구름을 달아보세요!</p>
        ) : (
          <div className="clouds-list">
            {clouds.filter(cloud => cloud && cloud.id).map((cloud) => (
              <div key={cloud.id} className="cloud-item">
                <div className="cloud-time">
                  {Math.floor(cloud.timestamp_sec / 60)}:
                  {(cloud.timestamp_sec % 60).toFixed(0).padStart(2, '0')}
                </div>
                <div className="cloud-content-text">{cloud.content}</div>
                <div className="cloud-author">{cloud.username}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default YouTubeVideoPage;
