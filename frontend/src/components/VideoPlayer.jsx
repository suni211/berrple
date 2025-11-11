import CustomVideoPlayer from './CustomVideoPlayer';
import YouTubePlayer from './YouTubePlayer';

function VideoPlayer({ video, clouds, onCloudCreated }) {
  const isYouTube = video.video_type === 'youtube';

  // YouTube 영상은 YouTubePlayer 사용
  if (isYouTube) {
    return <YouTubePlayer video={video} clouds={clouds} onCloudCreated={onCloudCreated} />;
  }

  // 일반 비디오는 CustomVideoPlayer 사용
  return <CustomVideoPlayer video={video} clouds={clouds} onCloudCreated={onCloudCreated} />;
}

export default VideoPlayer;
