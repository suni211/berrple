import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { postsAPI } from '../services/api';

function PostPage() {
  const { postId } = useParams();
  const { data } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postsAPI.getPost(postId),
  });

  const post = data?.data?.post;

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      {post && (
        <div className="card" style={{ padding: '2rem' }}>
          <h1 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>{post.title}</h1>
          <p style={{ opacity: 0.7, marginBottom: '2rem' }}>{post.username} · {new Date(post.created_at).toLocaleDateString()}</p>
          <div style={{ lineHeight: 1.8 }}>{post.content}</div>
        </div>
      )}
    </div>
  );
}

export default PostPage;
