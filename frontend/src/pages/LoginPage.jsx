import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import useAuthStore from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './AuthPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      setAuth(user, token);

      toast.success('로그인 성공!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container">
      <div className="auth-card">
        <h1>로그인</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사용자명 또는 이메일</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <p className="auth-link">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
