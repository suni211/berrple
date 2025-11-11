import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function AdSense({ slot, format = 'auto', responsive = true }) {
  const location = useLocation();

  // YouTube 관련 페이지에서는 광고 표시 안함
  const isYouTubePage =
    location.pathname.startsWith('/youtube') ||
    location.pathname.includes('youtube-search');

  useEffect(() => {
    if (isYouTubePage) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, [isYouTubePage]);

  const clientId = 'ca-pub-2418723931724986';

  // YouTube 페이지에서는 광고 표시 안함
  if (isYouTubePage || !clientId) {
    return null;
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={clientId}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    ></ins>
  );
}

export default AdSense;

// Usage:
// Import Google AdSense script in index.html:
// <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR_CLIENT_ID" crossorigin="anonymous"></script>

// Then use the component:
// <AdSense slot="1234567890" />

// Note: Only show AdSense on self-uploaded videos, NOT on YouTube videos
