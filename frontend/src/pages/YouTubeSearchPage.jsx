import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPlay, FiYoutube, FiExternalLink } from 'react-icons/fi';
import { youtubeAPI } from '../services/api';
import toast from 'react-hot-toast';
import './YouTubeSearchPage.css';

function YouTubeSearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 검색 실행
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await youtubeAPI.search(searchQuery, { maxResults: 20 });
      setSearchResults(response.data.videos || []);

      if (response.data.videos?.length === 0) {
        toast('검색 결과가 없습니다');
      }
    } catch (error) {
      toast.error('YouTube 검색 실패');
      console.error('YouTube search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // YouTube 영상 재생 페이지로 이동
  const handlePlayVideo = (video) => {
    navigate(`/youtube/${video.videoId}`);
  };

  // YouTube 원본 채널로 이동
  const handleOpenChannel = (video, e) => {
    e.stopPropagation();
    window.open(`https://www.youtube.com/channel/${video.channelId || ''}`, '_blank');
  };

  return (
    <div className="youtube-search-page container">
      <div className="page-header">
        <h1>
          <FiYoutube className="youtube-icon" />
          YouTube 영상 검색
        </h1>
        <p>YouTube에서 영상을 검색하고 구름을 달아보세요</p>
        <p className="copyright-notice">
          ⚠️ Berrple은 저작권자를 존중합니다. 영상은 YouTube에서 재생되며, 구름만 Berrple에 저장됩니다.
        </p>
      </div>

      {/* 검색 폼 */}
      <form className="youtube-search-form" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="YouTube에서 영상 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="youtube-search-input"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? '검색 중...' : '검색'}
        </button>
      </form>


      {/* 검색 결과 */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>YouTube에서 검색 중...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="youtube-results">
          <h2>검색 결과 ({searchResults.length}개)</h2>
          <div className="youtube-grid">
            {searchResults.map((video) => (
              <div
                key={video.videoId}
                className="youtube-card"
                onClick={() => handlePlayVideo(video)}
              >
                <div className="youtube-thumbnail">
                  <img src={video.thumbnailUrl} alt={video.title} />
                  <div className="youtube-overlay">
                    <button className="btn-play-video">
                      <FiPlay size={32} />
                      <span>재생 및 구름 달기</span>
                    </button>
                  </div>
                </div>
                <div className="youtube-info">
                  <h3>{video.title}</h3>
                  <div className="channel-info-row">
                    <p className="channel-title">{video.channelTitle}</p>
                    <button
                      className="channel-link"
                      onClick={(e) => handleOpenChannel(video, e)}
                      title="YouTube 채널로 이동"
                    >
                      <FiExternalLink />
                    </button>
                  </div>
                  <p className="video-description">
                    {video.description.substring(0, 100)}
                    {video.description.length > 100 ? '...' : ''}
                  </p>
                  <p className="published-date">
                    {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-results">
          <FiYoutube size={64} />
          <p>YouTube에서 영상을 검색해보세요</p>
        </div>
      )}
    </div>
  );
}

export default YouTubeSearchPage;
