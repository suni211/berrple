import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { postsAPI } from '../services/api';

const BOARD_NAMES = { lol: '롤 게시판', free: '자유 게시판', suggestion: '건의 개선' };

function BoardPage() {
  const { boardType } = useParams();
  const { data } = useQuery({
    queryKey: ['posts', boardType],
    queryFn: () => postsAPI.getPosts(boardType),
  });

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-color)' }}>{BOARD_NAMES[boardType]}</h1>
        <Link to={`/board/${boardType}/create`} className="btn btn-primary">글쓰기</Link>
      </div>
      <div>
        {data?.data?.posts?.map((post) => (
          <Link key={post.id} to={`/post/${post.id}`} className="card" style={{ display: 'block', marginBottom: '1rem', padding: '1.5rem' }}>
            <h3>{post.title}</h3>
            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
              {post.username} · {post.view_count} views · {post.comment_count} comments
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default BoardPage;
