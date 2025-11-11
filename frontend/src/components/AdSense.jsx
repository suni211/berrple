import { useEffect } from 'react';

function AdSense({ slot, format = 'auto', responsive = true }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID;

  if (!clientId) {
    return null; // Don't show ads if client ID is not configured
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
