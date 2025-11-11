import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiTrash2 } from 'react-icons/fi';
import { videosAPI, cloudsAPI } from '../services/api';
import useAuthStore from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import VideoPlayer from '../components/VideoPlayer';
import './VideoPage.css';

function VideoPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: videoData, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => videosAPI.getVideo(videoId),
  });

  const { data: cloudsData } = useQuery({
    queryKey: ['clouds', videoId],
    queryFn: () => cloudsAPI.getClouds(videoId),
    enabled: !!videoId,
  });

  const handleCloudCreated = () => {
    // 구름 목록 새로고침
    queryClient.invalidateQueries(['clouds', videoId]);
  };

  const handleDeleteVideo = async () => {
    if (!window.confirm('이 비디오를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await videosAPI.deleteVideo(videoId);
      toast.success('비디오가 삭제되었습니다');
      navigate('/');
    } catch (error) {
      toast.error('비디오 삭제 실패');
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="container text-center mt-4"><div className="spinner"></div></div>;
  }

  const video = videoData?.data?.video;
  const clouds = cloudsData?.data?.clouds || [];

  if (!video) {
    return <div className="container text-center mt-4"><h2>Video not found</h2></div>;
  }

  return (
    <div className="video-page container">
      <div className="video-main">
        <VideoPlayer
          video={video}
          clouds={clouds}
          onCloudCreated={handleCloudCreated}
        />

        <div className="video-details">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1 className="video-title">{video.title}</h1>
            {user && (user.id === video.user_id || user.is_admin) && (
              <button
                className="btn btn-danger"
                onClick={handleDeleteVideo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                <FiTrash2 /> 삭제
              </button>
            )}
          </div>
          <div className="video-meta">
            <span>{video.view_count} views</span>
            <span>{clouds.length} 구름</span>
          </div>
          <div className="video-description">
            <p>{video.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPage;
