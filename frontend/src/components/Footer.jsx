import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>BERRPLE</h3>
            <p>구름 코멘트와 함께하는 동영상 플랫폼</p>
          </div>

          <div className="footer-section">
            <h4>서비스</h4>
            <ul>
              <li><Link to="/">홈</Link></li>
              <li><Link to="/search">검색</Link></li>
              <li><Link to="/upload">업로드</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>게시판</h4>
            <ul>
              <li><Link to="/board/lol">롤 게시판</Link></li>
              <li><Link to="/board/free">자유 게시판</Link></li>
              <li><Link to="/board/suggestion">건의 개선</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>정책</h4>
            <ul>
              <li><Link to="/copyright">저작권 정책</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Berrple. All rights reserved.</p>
          <p className="copyright-notice">
            본 사이트는 저작권을 존중합니다. 부적절한 콘텐츠는 즉시 삭제됩니다.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
