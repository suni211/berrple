import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadAPI, usersAPI } from '../services/api';
import useAuthStore from '../contexts/AuthContext';
import toast from 'react-hot-toast';

function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [tags, setTags] = useState('');

  // 사용자의 채널 목록 가져오기
  useEffect(() => {
    const fetchChannels = async () => {
      if (!user) return;
      try {
        const response = await usersAPI.getChannels(user.username);
        setChannels(response.data.channels || []);
        if (response.data.channels?.length > 0) {
          setSelectedChannel(response.data.channels[0].channel_handle);
        }
      } catch (error) {
        console.error('Failed to fetch channels:', error);
        toast.error('채널 정보를 가져올 수 없습니다');
      }
    };
    fetchChannels();
  }, [user]);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const maxSize = 1.5 * 1024 * 1024 * 1024; // 1.5 GB
      if (selectedFile.size > maxSize) {
        toast.error('파일 크기는 1.5GB를 초과할 수 없습니다');
        e.target.value = ''; // 파일 선택 초기화
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('동영상 파일을 선택해주세요');
      return;
    }

    if (!selectedChannel) {
      toast.error('채널을 선택해주세요');
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      let thumbnailUrl = '';

      // 썸네일 업로드 (선택사항)
      if (thumbnail) {
        const thumbnailFormData = new FormData();
        thumbnailFormData.append('thumbnail', thumbnail);
        const thumbnailResponse = await uploadAPI.uploadThumbnail(thumbnailFormData);
        thumbnailUrl = thumbnailResponse.data.thumbnailUrl;
      }

      // 비디오 업로드
      const formData = new FormData();
      formData.append('video', file);
      formData.append('channelHandle', selectedChannel);
      formData.append('title', e.target.title.value);
      formData.append('description', e.target.description.value || '');
      if (thumbnailUrl) {
        formData.append('thumbnailUrl', thumbnailUrl);
      }
      if (tags) {
        formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(t => t)));
      }

      const response = await uploadAPI.uploadVideo(formData, setProgress);
      toast.success('업로드 성공!');
      navigate(`/watch/${response.data.videoId}`);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.error || '업로드 실패';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (channels.length === 0) {
    return (
      <div className="container" style={{ maxWidth: '800px', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--primary-color)', marginBottom: '2rem' }}>동영상 업로드</h1>
        <div className="card" style={{ padding: '2rem' }}>
          <p>먼저 채널을 만들어야 동영상을 업로드할 수 있습니다.</p>
          <button className="btn btn-primary" onClick={() => navigate('/mypage')}>
            마이페이지에서 채널 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px', padding: '2rem' }}>
      <h1 style={{ color: 'var(--primary-color)', marginBottom: '2rem' }}>동영상 업로드</h1>
      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <div className="form-group">
          <label>채널 선택</label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '2px solid var(--border-color)' }}
          >
            {channels.map((channel) => (
              <option key={channel.channel_handle} value={channel.channel_handle}>
                {channel.channel_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>제목 *</label>
          <input
            type="text"
            name="title"
            required
            placeholder="동영상 제목을 입력하세요"
            style={{ width: '100%', padding: '0.75rem' }}
          />
        </div>

        <div className="form-group">
          <label>설명</label>
          <textarea
            name="description"
            rows="5"
            placeholder="동영상 설명을 입력하세요"
            style={{ width: '100%', padding: '0.75rem' }}
          ></textarea>
        </div>

        <div className="form-group">
          <label>태그 (쉼표로 구분)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="예: 게임, 리그오브레전드, 하이라이트"
            style={{ width: '100%', padding: '0.75rem' }}
          />
        </div>

        <div className="form-group">
          <label>썸네일 이미지 (선택사항)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            style={{ width: '100%' }}
          />
          {thumbnailPreview && (
            <div style={{ marginTop: '1rem' }}>
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                style={{ maxWidth: '300px', borderRadius: '8px', border: '2px solid var(--border-color)' }}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>동영상 파일 * (최대 1.5GB, 권장: 1080p 60fps)</label>
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            required
            style={{ width: '100%' }}
          />
          {file && (
            <p style={{ marginTop: '0.5rem', color: 'var(--primary-color)' }}>
              선택된 파일: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.7, marginTop: '0.5rem' }}>
            최적 포맷: MP4, 해상도: 1920x1080, 프레임레이트: 60fps
          </p>
        </div>

        {progress > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ background: 'var(--border-color)', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.3s' }}></div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>
              업로드 중... {progress}%
            </p>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '1rem' }}>
          {loading ? '업로드 중...' : '업로드'}
        </button>
      </form>
    </div>
  );
}

export default UploadPage;
