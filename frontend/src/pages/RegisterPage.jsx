import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import useAuthStore from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import './AuthPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    displayName: '',
    referralCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode }));
      validateReferralCode(refCode);
    }
  }, [searchParams]);

  const validateReferralCode = async (code) => {
    if (!code) {
      setReferrerInfo(null);
      return;
    }

    setValidatingCode(true);
    try {
      const response = await axios.get(`${API_URL}/referrals/validate/${code}`);
      if (response.data.valid) {
        setReferrerInfo(response.data.referrer);
        toast.success(`${response.data.referrer.displayName}님의 추천으로 가입하시는군요!`);
      }
    } catch (error) {
      setReferrerInfo(null);
      toast.error('유효하지 않은 추천 코드입니다.');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      setAuth(user, token);

      if (formData.referralCode && referrerInfo) {
        toast.success(`회원가입 성공! ${referrerInfo.displayName}님께 감사 포인트가 지급됩니다.`);
      } else {
        toast.success('회원가입 성공!');
      }
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

        {referrerInfo && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #7dd3fc',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            🎉 <strong>{referrerInfo.displayName}</strong>님의 추천으로 가입하시는군요!
          </div>
        )}

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
          <div className="form-group">
            <label>추천 코드 (선택)</label>
            <input
              type="text"
              value={formData.referralCode}
              onChange={(e) => {
                const code = e.target.value;
                setFormData({ ...formData, referralCode: code });
                if (code.length > 5) {
                  validateReferralCode(code);
                }
              }}
              placeholder="친구의 추천 코드가 있다면 입력하세요"
              disabled={validatingCode}
            />
            {validatingCode && (
              <small style={{ color: '#666' }}>추천 코드 확인 중...</small>
            )}
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
