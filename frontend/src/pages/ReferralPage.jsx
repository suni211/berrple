import { useState, useEffect } from 'react';
import { Copy, Check, Users, Gift, Award, Share2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ReferralPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ReferralPage() {
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/referrals/my-code`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReferralData(response.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('추천 정보를 불러올 수 없습니다.');
      }
      console.error('Failed to fetch referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const referralUrl = `${window.location.origin}/register?ref=${referralData.code}`;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('복사에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const getProgressPercentage = () => {
    if (!referralData) return 0;
    return Math.min((referralData.referralCount / 10) * 100, 100);
  };

  if (loading) {
    return (
      <div className="referral-page">
        <div className="container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="referral-page">
        <div className="container">
          <div className="error-container">
            <AlertCircle size={48} />
            <h2>{error}</h2>
            <button onClick={fetchReferralData} className="btn-primary">
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="referral-page">
      <div className="container">
        {/* Hero Section */}
        <div className="referral-hero">
          <div className="hero-icon">
            <Gift size={64} />
          </div>
          <h1>친구 초대 프로그램</h1>
          <p className="hero-subtitle">친구를 초대하고 멋진 선물을 받으세요!</p>
        </div>

        {/* Main Stats */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <Users size={40} />
            <div className="stat-content">
              <div className="stat-value">
                {referralData.referralCount} <span className="stat-max">/ 10</span>
              </div>
              <div className="stat-label">초대한 친구</div>
            </div>
          </div>
          <div className="stat-card success">
            <Gift size={40} />
            <div className="stat-content">
              <div className="stat-value">{referralData.rewards?.length || 0}</div>
              <div className="stat-label">받은 보상</div>
            </div>
          </div>
          <div className="stat-card warning">
            <Award size={40} />
            <div className="stat-content">
              <div className="stat-value">
                {referralData.milestones?.filter(m => m.reached).length || 0}
              </div>
              <div className="stat-label">달성한 단계</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-header">
            <h3>진행 상황</h3>
            <span className="progress-text">
              {referralData.referralCount}/10명
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          {!referralData.canReceiveMore && (
            <div className="progress-complete">
              🎉 최대 추천 인원에 도달했습니다!
            </div>
          )}
        </div>

        {/* Referral Code Section */}
        <div className="referral-code-section">
          <h2>
            <Share2 size={24} />
            내 추천 링크
          </h2>
          <div className="code-display">
            <div className="code-badge">
              <span className="code-label">코드:</span>
              <span className="code-value">{referralData.code}</span>
            </div>
            <div className="code-input-group">
              <input
                type="text"
                value={`${window.location.origin}/register?ref=${referralData.code}`}
                readOnly
                className="code-input"
              />
              <button onClick={copyToClipboard} className="btn-copy">
                {copied ? (
                  <>
                    <Check size={20} />
                    복사완료
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    복사
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {!referralData.canReceiveMore && (
          <div className="alert alert-warning">
            <AlertCircle size={20} />
            <span>최대 추천 인원(10명)에 도달했습니다. 더 이상 추천을 받을 수 없습니다.</span>
          </div>
        )}

        {/* Milestones */}
        <div className="milestones-section">
          <h2>보상 단계</h2>
          <div className="milestones-grid">
            {referralData.milestones.map((milestone) => (
              <div
                key={milestone.count}
                className={`milestone-card ${milestone.reached ? 'reached' : ''}`}
              >
                <div className="milestone-icon">
                  {milestone.reached ? <Check size={32} /> : <Gift size={32} />}
                </div>
                <div className="milestone-content">
                  <h3>{milestone.count}명 초대</h3>
                  <p>기프티콘 증정</p>
                  {milestone.reached ? (
                    <span className="milestone-badge reached">달성!</span>
                  ) : (
                    <span className="milestone-badge pending">
                      {milestone.count - referralData.referralCount}명 남음
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referred Users List */}
        {referralData.referredUsers && referralData.referredUsers.length > 0 && (
          <div className="referred-users-section">
            <h2>초대한 친구 ({referralData.referredUsers.length}명)</h2>
            <div className="users-list">
              {referralData.referredUsers.map((user) => (
                <div key={user.id} className="user-card">
                  <div className="user-info">
                    <div className="user-name">{user.display_name}</div>
                    <div className="user-username">@{user.username}</div>
                  </div>
                  <div className="user-date">
                    {new Date(user.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards List */}
        {referralData.rewards && referralData.rewards.length > 0 && (
          <div className="rewards-section">
            <h2>보상 내역</h2>
            <div className="rewards-list">
              {referralData.rewards.map((reward) => (
                <div key={reward.id} className="reward-card">
                  <div className="reward-info">
                    <div className="reward-title">
                      {reward.reward_milestone}명 달성 보상
                    </div>
                    <div className="reward-status">
                      {reward.reward_status === 'sent'
                        ? '✅ 발송 완료'
                        : reward.reward_status === 'notified'
                        ? '⏳ 확인 중'
                        : '🎁 대기 중'}
                    </div>
                  </div>
                  <div className="reward-date">
                    {new Date(reward.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Points Rewards Info */}
        <div className="instructions-section" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)', border: '2px solid #f59e0b' }}>
          <h3 style={{ color: '#92400e' }}>💰 포인트 보상</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '8px', fontWeight: '500' }}>
              <span>친구 1명 가입</span>
              <span style={{ color: '#f59e0b', fontWeight: '700' }}>+500P</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '8px', fontWeight: '500' }}>
              <span>5명 달성 보너스</span>
              <span style={{ color: '#f59e0b', fontWeight: '700' }}>+1,000P</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '8px', fontWeight: '500' }}>
              <span>10명 달성 보너스</span>
              <span style={{ color: '#f59e0b', fontWeight: '700' }}>+3,000P</span>
            </div>
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#fbbf24', borderRadius: '8px', textAlign: 'center', fontWeight: '700', color: 'white' }}>
              최대 획득 가능: 9,000 포인트
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="instructions-section">
          <h3>💡 사용 방법 및 주의사항</h3>
          <ol className="instructions-list">
            <li>위의 추천 링크를 복사하세요</li>
            <li>친구에게 링크를 공유하세요</li>
            <li>친구가 링크를 통해 가입하면 자동으로 포인트가 지급됩니다</li>
            <li>최대 10명까지만 추천 가능합니다</li>
            <li>5명, 10명 달성 시 보너스 포인트와 이메일 알림을 받습니다</li>
            <li>포인트는 상점에서 다양한 아이템 구매에 사용할 수 있습니다</li>
          </ol>
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>
              <strong>중요:</strong> 다중 계정 생성 및 VPN 사용은 금지되며, 적발 시 보상이 취소됩니다.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
