import { useState, useEffect } from 'react';
import axios from 'axios';
import VideoCard from './VideoCard';
import '../styles/RecommendedVideos.css';

const RecommendedVideos = ({ title = '추천 동영상', limit = 12 }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/recommendations/for-you?limit=${limit}`);
      setVideos(response.data.recommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="recommended-videos">
        <h2 className="section-title">{title}</h2>
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="recommended-videos">
      <h2 className="section-title">{title}</h2>
      <div className="video-grid">
        {videos.map(video => (
          <VideoCard
            key={video.id}
            video={{
              id: video.id,
              title: video.title,
              thumbnail_url: video.thumbnail_url,
              duration: video.duration,
              view_count: video.view_count,
              like_count: video.like_count,
              created_at: video.created_at,
              channel_name: video.channel_name,
              channel_handle: video.channel_handle,
              avatar_url: video.avatar_url
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default RecommendedVideos;
