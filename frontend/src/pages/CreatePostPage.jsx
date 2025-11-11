import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postsAPI } from '../services/api';
import toast from 'react-hot-toast';

function CreatePostPage() {
  const { boardType } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await postsAPI.createPost({
        boardType,
        title: e.target.title.value,
        content: e.target.content.value,
      });
      toast.success('게시글 작성 완료!');
      navigate(`/post/${response.data.postId}`);
    } catch (error) {
      toast.error('작성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <h1 style={{ color: 'var(--primary-color)', marginBottom: '2rem' }}>글쓰기</h1>
      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <div className="form-group">
          <label>제목</label>
          <input type="text" name="title" required />
        </div>
        <div className="form-group">
          <label>내용</label>
          <textarea name="content" rows="15" required></textarea>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '작성 중...' : '작성 완료'}
        </button>
      </form>
    </div>
  );
}

export default CreatePostPage;
