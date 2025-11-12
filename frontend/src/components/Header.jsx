import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FiSearch, FiUpload, FiUser, FiMenu, FiX, FiSun, FiMoon, FiShield, FiGift, FiShoppingBag } from 'react-icons/fi';
import useAuthStore from '../contexts/AuthContext';
import useThemeStore from '../contexts/ThemeContext';
import axios from 'axios';
import './Header.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPoints();
    }
  }, [isAuthenticated]);

  const fetchPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/points/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPoints(response.data.available);
    } catch (error) {
      console.error('Error fetching points:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-container">
        <Link to="/" className="logo">
          <img src="/berrple-logo.svg" alt="Berrple Logo" className="logo-image" />
        </Link>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="영상 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            <FiSearch />
          </button>
        </form>

        <nav className={`nav ${mobileMenuOpen ? 'nav-open' : ''}`}>
          <Link to="/youtube-search" className="nav-link youtube-link">
            <span className="youtube-icon">▶</span> YouTube 검색
          </Link>
          <Link to="/board/lol" className="nav-link">롤 게시판</Link>
          <Link to="/board/free" className="nav-link">자유 게시판</Link>
          <Link to="/board/suggestion" className="nav-link">건의 개선</Link>

          <button
            onClick={toggleTheme}
            className="theme-toggle-btn nav-link"
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>

          {isAuthenticated ? (
            <>
              <Link
                to="/shop"
                className="nav-link points-link"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fbbf24' }}
                title="포인트 샵"
              >
                <FiShoppingBag /> {points.toLocaleString()}P
              </Link>
              <Link
                to="/referral"
                className="nav-link"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9333ea' }}
                title="친구 초대하고 선물 받기"
              >
                <FiGift /> 친구 초대
              </Link>
              <Link to="/upload" className="nav-link">
                <FiUpload /> 업로드
              </Link>
              <Link to="/mypage" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <FiUser /> {user?.display_name || user?.username}
                {user?.is_admin && (
                  <FiShield style={{ color: '#FFD700', fontSize: '1rem' }} title="관리자" />
                )}
              </Link>
              <button onClick={handleLogout} className="nav-link btn-link">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">로그인</Link>
              <Link to="/register" className="btn btn-primary">회원가입</Link>
            </>
          )}
        </nav>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </header>
  );
}

export default Header;
