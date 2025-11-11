import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/BookmarkButton.css';

const BookmarkButton = ({ videoId, className = '' }) => {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && videoId) {
      checkBookmarkStatus();
    }
  }, [user, videoId]);

  const checkBookmarkStatus = async () => {
    try {
      const response = await axios.get(`/api/bookmarks/check/${videoId}`);
      setIsBookmarked(response.data.isBookmarked);
    } catch (error) {
      console.error('Failed to check bookmark status:', error);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        await axios.delete(`/api/bookmarks/${videoId}`);
        setIsBookmarked(false);
      } else {
        // Add bookmark
        await axios.post(`/api/bookmarks/${videoId}`);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      alert('북마크 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`bookmark-button ${isBookmarked ? 'bookmarked' : ''} ${className}`}
      onClick={handleBookmark}
      disabled={loading}
      title={isBookmarked ? '북마크 취소' : '북마크'}
    >
      <svg
        className="bookmark-icon"
        viewBox="0 0 24 24"
        fill={isBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span className="bookmark-text">
        {isBookmarked ? '저장됨' : '저장'}
      </span>
    </button>
  );
};

export default BookmarkButton;
