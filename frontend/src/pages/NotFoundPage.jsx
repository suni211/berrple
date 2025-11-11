import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="container text-center" style={{ padding: '4rem' }}>
      <h1 style={{ fontSize: '4rem', color: 'var(--primary-color)' }}>404</h1>
      <h2>페이지를 찾을 수 없습니다</h2>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '2rem' }}>
        홈으로 돌아가기
      </Link>
    </div>
  );
}

export default NotFoundPage;
