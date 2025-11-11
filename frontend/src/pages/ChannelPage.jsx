import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiUserPlus, FiUserCheck, FiShield, FiCheckCircle } from 'react-icons/fi';
import { channelsAPI } from '../services/api';
import useAuthStore from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import VideoCard from '../components/VideoCard';

function ChannelPage() {
  const { channelHandle } = useParams();
  const { user } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const { data: channelData } = useQuery({
    queryKey: ['channel', channelHandle],
    queryFn: () => channelsAPI.getChannel(channelHandle),
  });

  const { data: videosData } = useQuery({
    queryKey: ['channel-videos', channelHandle],
    queryFn: () => channelsAPI.getVideos(channelHandle),
  });

  const channel = channelData?.data?.channel;

  // Load subscription status when channel loads
  useEffect(() => {
    if (channel && user) {
      setSubscriberCount(channel.subscriber_count);
      loadSubscriptionStatus();
    } else if (channel) {
      setSubscriberCount(channel.subscriber_count);
    }
  }, [channel, user]);

  const loadSubscriptionStatus = async () => {
    try {
      const response = await channelsAPI.isSubscribed(channelHandle);
      setIsSubscribed(response.data.isSubscribed);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }

    setLoading(true);
    try {
      if (isSubscribed) {
        await channelsAPI.unsubscribe(channelHandle);
        setIsSubscribed(false);
        setSubscriberCount(prev => Math.max(0, prev - 1));
        toast.success('구독 취소되었습니다');
      } else {
        await channelsAPI.subscribe(channelHandle);
        setIsSubscribed(true);
        setSubscriberCount(prev => prev + 1);
        toast.success('구독되었습니다');
      }
    } catch (error) {
      toast.error(isSubscribed ? '구독 취소 실패' : '구독 실패');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {channel && (
        <>
          <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <img
                  src={channel.avatar_url || '/default-avatar.svg'}
                  alt={channel.channel_name}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--primary-color)'
                  }}
                  onError={(e) => { e.target.src = '/default-avatar.svg'; }}
                />
                <div>
                  <h1 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {channel.channel_name}
                    {channel.is_admin && (
                      <FiShield style={{ color: '#FFD700', fontSize: '1.8rem' }} title="관리자" />
                    )}
                    {channel.is_verified && !channel.is_admin && (
                      <FiCheckCircle style={{ color: 'var(--primary-color)', fontSize: '1.8rem' }} title="인증됨" />
                    )}
                  </h1>
                  <p style={{ color: 'var(--text-color)', opacity: 0.7, marginBottom: '0.5rem' }}>@{channel.channel_handle}</p>
                </div>
              </div>
              {user && channel.user_id !== user.id && (
                <button
                  className={`btn ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={handleSubscribe}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '120px',
                    justifyContent: 'center'
                  }}
                >
                  {isSubscribed ? <FiUserCheck /> : <FiUserPlus />}
                  {loading ? '처리중...' : (isSubscribed ? '구독 중' : '구독')}
                </button>
              )}
            </div>
            {channel.description && (
              <p style={{ marginBottom: '1rem' }}>{channel.description}</p>
            )}
            <p style={{ opacity: 0.7 }}>
              {subscriberCount} 구독자 · {channel.video_count} 영상
            </p>
          </div>
          <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Videos</h2>
          <div className="video-grid">
            {videosData?.data?.videos?.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ChannelPage;
