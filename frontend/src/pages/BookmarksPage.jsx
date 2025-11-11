import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import '../styles/BookmarksPage.css';

const BookmarksPage = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (user) {
      loadBookmarks();
    }
  }, [user, page]);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/bookmarks?page=${page}&limit=20`);

      if (page === 1) {
        setBookmarks(response.data.bookmarks);
      } else {
        setBookmarks(prev => [...prev, ...response.data.bookmarks]);
      }

      setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (!user) {
    return (
      <div className="bookmarks-page">
        <div className="empty-state">
          <h2>로그인이 필요합니다</h2>
          <p>북마크한 동영상을 보려면 로그인하세요.</p>
          <Link to="/login" className="btn-primary">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmarks-page">
      <div className="page-header">
        <h1>저장한 동영상</h1>
        <p className="subtitle">나중에 볼 동영상 목록</p>
      </div>

      {loading && page === 1 ? (
        <div className="loading">로딩 중...</div>
      ) : bookmarks.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeWidth="2" />
          </svg>
          <h2>저장한 동영상이 없습니다</h2>
          <p>마음에 드는 동영상을 저장해보세요!</p>
          <Link to="/" className="btn-primary">
            홈으로 가기
          </Link>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {bookmarks.map((bookmark) => (
              <VideoCard
                key={bookmark.bookmark_id}
                video={{
                  id: bookmark.video_id || `yt_${bookmark.youtube_video_id}`,
                  title: bookmark.title,
                  thumbnail_url: bookmark.thumbnail_url,
                  duration: bookmark.duration,
                  view_count: bookmark.view_count,
                  created_at: bookmark.created_at,
                  channel_name: bookmark.channel_name,
                  channel_handle: bookmark.channel_handle,
                  avatar_url: bookmark.avatar_url
                }}
              />
            ))}
          </div>

          {hasMore && (
            <div className="load-more-container">
              <button
                className="btn-secondary"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BookmarksPage;
