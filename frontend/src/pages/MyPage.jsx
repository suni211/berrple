import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEdit2, FiSave, FiX, FiPlus, FiUsers, FiVideo, FiUpload, FiShield, FiCheckCircle } from 'react-icons/fi';
import useAuthStore from '../contexts/AuthContext';
import { usersAPI, channelsAPI, uploadAPI } from '../services/api';
import toast from 'react-hot-toast';

function MyPage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 프로필 편집 상태
  const [profileData, setProfileData] = useState({
    displayName: '',
    bio: '',
    avatarUrl: ''
  });

  // 채널 및 구독 데이터
  const [myChannels, setMyChannels] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isEditingChannel, setIsEditingChannel] = useState(false);
  const [channelData, setChannelData] = useState({
    channelName: '',
    description: '',
    avatarUrl: '',
    bannerUrl: ''
  });

  // 아바타 업로드
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.display_name || user.username,
        bio: user.bio || '',
        avatarUrl: user.avatar_url || ''
      });
      loadMyChannels();
      loadSubscriptions();
    }
  }, [user]);

  const loadMyChannels = async () => {
    try {
      const response = await usersAPI.getChannels(user.username);
      setMyChannels(response.data.channels || []);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const response = await usersAPI.getMySubscriptions();
      setSubscriptions(response.data.subscriptions || []);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let finalAvatarUrl = profileData.avatarUrl;

      // 아바타 이미지 업로드
      if (avatarFile) {
        const formData = new FormData();
        formData.append('thumbnail', avatarFile);
        const uploadResponse = await uploadAPI.uploadThumbnail(formData);
        finalAvatarUrl = uploadResponse.data.thumbnailUrl;
      }

      const response = await usersAPI.updateProfile({
        displayName: profileData.displayName,
        bio: profileData.bio,
        avatarUrl: finalAvatarUrl
      });

      setUser(response.data.user);
      toast.success('프로필이 업데이트되었습니다');
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      toast.error('프로필 업데이트 실패');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChannel = (channel) => {
    setSelectedChannel(channel);
    setChannelData({
      channelName: channel.channel_name,
      description: channel.description || '',
      avatarUrl: channel.avatar_url || '',
      bannerUrl: channel.banner_url || ''
    });
    setIsEditingChannel(true);
  };

  const handleSaveChannel = async () => {
    if (!selectedChannel) return;

    setLoading(true);
    try {
      await channelsAPI.updateChannel(selectedChannel.channel_handle, channelData);
      toast.success('채널이 업데이트되었습니다');
      setIsEditingChannel(false);
      loadMyChannels();
    } catch (error) {
      toast.error('채널 업데이트 실패');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>로그인이 필요합니다</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>
          로그인하기
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>
      <h1 style={{ color: 'var(--primary-color)', marginBottom: '2rem' }}>마이페이지</h1>

      {/* 탭 메뉴 */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)' }}>
        <button
          style={{
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'profile' ? 'var(--primary-color)' : 'var(--text-color)',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onClick={() => setActiveTab('profile')}
        >
          <FiEdit2 /> 프로필
        </button>
        <button
          style={{
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'channels' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'channels' ? 'var(--primary-color)' : 'var(--text-color)',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onClick={() => setActiveTab('channels')}
        >
          <FiVideo /> 내 채널 ({myChannels.length})
        </button>
        <button
          style={{
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'subscriptions' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'subscriptions' ? 'var(--primary-color)' : 'var(--text-color)',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onClick={() => setActiveTab('subscriptions')}
        >
          <FiUsers /> 구독 ({subscriptions.length})
        </button>
      </div>

      {/* 프로필 탭 */}
      {activeTab === 'profile' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>프로필 정보</h2>
            {!isEditing ? (
              <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                <FiEdit2 /> 편집
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={loading}>
                  <FiSave /> 저장
                </button>
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  <FiX /> 취소
                </button>
              </div>
            )}
          </div>

          {/* 아바타 */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img
              src={avatarPreview || profileData.avatarUrl || '/default-avatar.svg'}
              alt="Avatar"
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid var(--primary-color)',
                marginBottom: '1rem'
              }}
              onError={(e) => { e.target.src = '/default-avatar.svg'; }}
            />
            {isEditing && (
              <div>
                <label htmlFor="avatar-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <FiUpload /> 이미지 변경
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {/* 프로필 폼 */}
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="form-group">
              <label>사용자명</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="text" value={user.username} disabled style={{ flex: 1 }} />
                {user.is_admin && (
                  <FiShield style={{ color: '#FFD700', fontSize: '1.5rem' }} title="관리자" />
                )}
                {user.is_verified && !user.is_admin && (
                  <FiCheckCircle style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }} title="인증됨" />
                )}
              </div>
            </div>

            <div className="form-group">
              <label>표시 이름</label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label>소개</label>
              <textarea
                rows="4"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="자기소개를 입력하세요..."
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label>이메일</label>
              <input type="text" value={user.email} disabled />
            </div>

            <div className="form-group">
              <label>가입일</label>
              <input type="text" value={new Date(user.created_at).toLocaleDateString()} disabled />
            </div>
          </div>
        </div>
      )}

      {/* 내 채널 탭 */}
      {activeTab === 'channels' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>내 채널 ({myChannels.length})</h2>
          </div>

          {myChannels.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem' }}>아직 채널이 없습니다</p>
              <p style={{ color: 'var(--text-color)', opacity: 0.7 }}>채널을 만들어서 비디오를 업로드하세요!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {myChannels.map((channel) => (
                <div key={channel.id} className="card" style={{ padding: '1.5rem' }}>
                  <img
                    src={channel.avatar_url || '/default-avatar.svg'}
                    alt={channel.channel_name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }}
                    onError={(e) => { e.target.src = '/default-avatar.svg'; }}
                  />
                  <h3 style={{ marginBottom: '0.5rem' }}>{channel.channel_name}</h3>
                  <p style={{ color: 'var(--text-color)', opacity: 0.7, marginBottom: '0.5rem' }}>@{channel.channel_handle}</p>
                  <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {channel.subscriber_count} 구독자 • {channel.video_count} 영상
                  </p>
                  {channel.description && (
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.8 }}>{channel.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/channel/${channel.channel_handle}`} className="btn btn-secondary" style={{ flex: 1 }}>
                      채널 보기
                    </Link>
                    <button className="btn btn-primary" onClick={() => handleEditChannel(channel)} style={{ flex: 1 }}>
                      <FiEdit2 /> 편집
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 채널 편집 모달 */}
          {isEditingChannel && selectedChannel && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
              onClick={() => setIsEditingChannel(false)}
            >
              <div
                className="card"
                style={{ maxWidth: '600px', width: '90%', padding: '2rem' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>채널 편집</h2>
                  <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setIsEditingChannel(false)}>
                    <FiX />
                  </button>
                </div>
                <div className="form-group">
                  <label>채널 이름</label>
                  <input
                    type="text"
                    value={channelData.channelName}
                    onChange={(e) => setChannelData({ ...channelData, channelName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>설명</label>
                  <textarea
                    rows="4"
                    value={channelData.description}
                    onChange={(e) => setChannelData({ ...channelData, description: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setIsEditingChannel(false)}>
                    취소
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveChannel} disabled={loading}>
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 구독 탭 */}
      {activeTab === 'subscriptions' && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>구독한 채널 ({subscriptions.length})</h2>
          {subscriptions.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <p>구독한 채널이 없습니다</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {subscriptions.map((channel) => (
                <Link
                  key={channel.id}
                  to={`/channel/${channel.channel_handle}`}
                  className="card"
                  style={{ padding: '1.5rem', textDecoration: 'none', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <img
                    src={channel.avatar_url || '/default-avatar.svg'}
                    alt={channel.channel_name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }}
                    onError={(e) => { e.target.src = '/default-avatar.svg'; }}
                  />
                  <h3 style={{ marginBottom: '0.5rem' }}>{channel.channel_name}</h3>
                  <p style={{ color: 'var(--text-color)', opacity: 0.7, marginBottom: '0.5rem' }}>@{channel.channel_handle}</p>
                  <p style={{ fontSize: '0.9rem' }}>
                    {channel.subscriber_count} 구독자 • {channel.video_count} 영상
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyPage;
