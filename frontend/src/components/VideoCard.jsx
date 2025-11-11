import { Link } from 'react-router-dom';
import { FiEye, FiMessageSquare, FiShield, FiCheckCircle } from 'react-icons/fi';
import './VideoCard.css';

function VideoCard({ video }) {
  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views;
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-card">
      <Link to={`/watch/${video.id}`} className="video-thumbnail-link">
        <div className="video-thumbnail">
          <img
            src={video.thumbnail_url || '/default-thumbnail.svg'}
            alt={video.title}
            onError={(e) => { e.target.src = '/default-thumbnail.svg'; }}
          />
          {video.duration && (
            <span className="video-duration">{formatDuration(video.duration)}</span>
          )}
          {video.video_type && (
            <span className={`video-type-badge ${video.video_type}`}>
              {video.video_type === 'youtube' ? 'YouTube' : '업로드'}
            </span>
          )}
        </div>
      </Link>

      <div className="video-info">
        <Link to={`/watch/${video.id}`} className="video-title">
          <h3>{video.title}</h3>
        </Link>

        <Link to={`/channel/${video.channel_handle}`} className="channel-info">
          <img
            src={video.channel_avatar || '/default-avatar.svg'}
            alt={video.channel_name}
            className="channel-avatar"
            onError={(e) => { e.target.src = '/default-avatar.svg'; }}
          />
          <span className="channel-name" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {video.channel_name}
            {video.is_admin && (
              <FiShield style={{ color: '#FFD700', fontSize: '0.9rem' }} title="관리자" />
            )}
            {video.is_verified && !video.is_admin && (
              <FiCheckCircle style={{ color: 'var(--primary-color)', fontSize: '0.9rem' }} title="인증됨" />
            )}
          </span>
        </Link>

        <div className="video-stats">
          <span className="stat">
            <FiEye /> {formatViews(video.view_count)}
          </span>
          <span className="stat">
            <FiMessageSquare /> {video.cloud_count || 0} 구름
          </span>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
