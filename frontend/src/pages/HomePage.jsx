import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { videosAPI, cloudsAPI, tagsAPI } from '../services/api';
import VideoCard from '../components/VideoCard';
import './HomePage.css';

function HomePage() {
  // 최근 구름이 달린 영상
  const { data: recentCloudVideos } = useQuery({
    queryKey: ['clouds', 'recent-videos'],
    queryFn: () => cloudsAPI.getRecentCloudVideos(12),
  });

  const { data: uploadedVideos } = useQuery({
    queryKey: ['videos', 'uploaded'],
    queryFn: () => videosAPI.getVideos({ type: 'upload', sort: 'recent', limit: 8 }),
  });

  const { data: weeklyPopular } = useQuery({
    queryKey: ['videos', 'weekly'],
    queryFn: () => videosAPI.getVideos({ sort: 'weekly', limit: 8 }),
  });

  const { data: popularTags } = useQuery({
    queryKey: ['tags', 'popular'],
    queryFn: () => tagsAPI.getPopularTags(15),
  });

  return (
    <div className="home-page container">
      <section className="hero-section">
        <div className="hero-logo-container">
          <img src="/logo-icon.svg" alt="Berrple Cloud" className="hero-cloud-icon" />
        </div>
        <h1>BERRPLE</h1>
        <p className="hero-subtitle">구름 코멘트와 함께하는 동영상 플랫폼</p>
        <p className="hero-description">
          영상의 원하는 위치에 구름 코멘트를 남겨보세요!
        </p>
      </section>

      {/* Popular Tags */}
      {popularTags?.data?.tags && (
        <section className="tags-section">
          <h2>인기 태그</h2>
          <div className="tags-container">
            {popularTags.data.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/search?tag=${tag.tag_name}`}
                className="tag"
              >
                #{tag.tag_name} ({tag.usage_count})
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Cloud Videos */}
      {recentCloudVideos?.data && (
        <section className="videos-section">
          <h2>🌥️ 최근 구름이 달린 영상</h2>
          <div className="video-grid">
            {recentCloudVideos.data.uploadVideos?.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
            {recentCloudVideos.data.youtubeVideos?.map((yt) => (
              <Link
                key={yt.youtube_video_id}
                to={`/youtube/${yt.youtube_video_id}`}
                className="video-card youtube-card"
              >
                <div className="video-thumbnail">
                  <img
                    src={`https://img.youtube.com/vi/${yt.youtube_video_id}/mqdefault.jpg`}
                    alt="YouTube Video"
                  />
                  <div className="youtube-badge">▶ YouTube</div>
                </div>
                <div className="video-info">
                  <p className="cloud-count">{yt.recent_cloud_count} 구름</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Uploaded Videos */}
      {uploadedVideos?.data?.videos && uploadedVideos.data.videos.length > 0 && (
        <section className="videos-section">
          <h2>최신 업로드 영상</h2>
          <div className="video-grid">
            {uploadedVideos.data.videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* Weekly Popular */}
      {weeklyPopular?.data?.videos && weeklyPopular.data.videos.length > 0 && (
        <section className="videos-section">
          <h2>📈 주간 인기 영상</h2>
          <div className="video-grid">
            {weeklyPopular.data.videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;
