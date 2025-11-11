import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { videosAPI } from '../services/api';
import VideoCard from '../components/VideoCard';

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => videosAPI.searchVideos(query),
    enabled: !!query,
  });

  return (
    <div className="container">
      <h1 style={{ color: 'var(--primary-color)', marginBottom: '2rem' }}>
        검색 결과: "{query}"
      </h1>
      {isLoading ? (
        <div className="text-center"><div className="spinner"></div></div>
      ) : (
        <div className="video-grid">
          {data?.data?.videos?.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
