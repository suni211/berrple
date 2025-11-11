import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import useAuthStore from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './AuthPage.css';

function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    displayName: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      setAuth(user, token);

      toast.success('회원가입 성공!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || '회원가입 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container">
      <div className="auth-card">
        <h1>회원가입</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>사용자명</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              minLength={3}
            />
          </div>
          <div className="form-group">
            <label>표시 이름</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
        <p className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
