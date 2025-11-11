import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import '../styles/RankingsPage.css';

const RankingsPage = () => {
  const [activeTab, setActiveTab] = useState('realtime');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'realtime', label: '실시간', icon: '⚡' },
    { id: '36h', label: '36시간', icon: '🔥' },
    { id: 'daily', label: '일간', icon: '📅' },
    { id: 'weekly', label: '주간', icon: '📊' },
    { id: 'monthly', label: '월간', icon: '🏆' },
    { id: 'all-time', label: '전체', icon: '👑' }
  ];

  useEffect(() => {
    loadRankings();
  }, [activeTab]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/rankings/${activeTab}?limit=50`);
      setRankings(response.data.ranking);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rankings-page">
      <div className="page-header">
        <h1>🏆 인기 랭킹</h1>
        <p className="subtitle">가장 인기있는 동영상을 확인하세요</p>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : rankings.length === 0 ? (
        <div className="empty-state">
          <h2>랭킹 데이터가 없습니다</h2>
          <p>아직 충분한 데이터가 수집되지 않았습니다.</p>
        </div>
      ) : (
        <div className="rankings-list">
          {rankings.map((video, index) => (
            <div key={video.id} className="ranking-item">
              <div className="rank-badge">
                <span className={`rank ${index < 3 ? 'top-3' : ''}`}>
                  {index + 1}
                </span>
              </div>
              <div className="ranking-video">
                <VideoCard
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
              </div>
              <div className="ranking-stats">
                <div className="stat">
                  <span className="stat-label">조회수</span>
                  <span className="stat-value">{video.view_count?.toLocaleString() || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">좋아요</span>
                  <span className="stat-value">{video.like_count?.toLocaleString() || 0}</span>
                </div>
                {video.recent_views !== undefined && (
                  <div className="stat highlight">
                    <span className="stat-label">최근 조회</span>
                    <span className="stat-value">{video.recent_views?.toLocaleString() || 0}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingsPage;
