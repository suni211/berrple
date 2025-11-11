import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/LikeButton.css';

const LikeButton = ({ videoId, initialLikeCount = 0, className = '' }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && videoId) {
      checkLikeStatus();
    }
  }, [user, videoId]);

  const checkLikeStatus = async () => {
    try {
      const response = await axios.get(`/api/likes/check/${videoId}`);
      setIsLiked(response.data.isLiked);
    } catch (error) {
      console.error('Failed to check like status:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      if (isLiked) {
        // Unlike
        const response = await axios.delete(`/api/likes/${videoId}`);
        setIsLiked(false);
        setLikeCount(response.data.likeCount);
      } else {
        // Like
        const response = await axios.post(`/api/likes/${videoId}`);
        setIsLiked(true);
        setLikeCount(response.data.likeCount);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`like-button ${isLiked ? 'liked' : ''} ${className}`}
      onClick={handleLike}
      disabled={loading}
      title={isLiked ? '좋아요 취소' : '좋아요'}
    >
      <svg
        className="like-icon"
        viewBox="0 0 24 24"
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="like-count">{likeCount.toLocaleString()}</span>
    </button>
  );
};

export default LikeButton;
