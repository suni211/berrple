const express = require('express');
const router = express.Router();
const axios = require('axios');
const ytdl = require('ytdl-core');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Search YouTube videos
router.get('/search', async (req, res, next) => {
  try {
    const { q, maxResults = 20, pageToken } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q,
        maxResults,
        pageToken,
        type: 'video',
        key: YOUTUBE_API_KEY
      }
    });

    res.json({
      videos: response.data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt
      })),
      nextPageToken: response.data.nextPageToken,
      prevPageToken: response.data.prevPageToken
    });
  } catch (error) {
    console.error('YouTube API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to search YouTube videos' });
  }
});

// Get YouTube video details
router.get('/video/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = response.data.items[0];

    // Parse duration (ISO 8601 format to seconds)
    const duration = parseDuration(video.contentDetails.duration);

    res.json({
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      channelTitle: video.snippet.channelTitle,
      channelId: video.snippet.channelId,
      publishedAt: video.snippet.publishedAt,
      duration,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      tags: video.snippet.tags || []
    });
  } catch (error) {
    console.error('YouTube API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch YouTube video details' });
  }
});

// Get YouTube video categories (for auto-tagging)
router.get('/categories', async (req, res, next) => {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/videoCategories`, {
      params: {
        part: 'snippet',
        regionCode: 'KR', // Korea
        key: YOUTUBE_API_KEY
      }
    });

    res.json({
      categories: response.data.items.map(item => ({
        id: item.id,
        title: item.snippet.title
      }))
    });
  } catch (error) {
    console.error('YouTube API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch YouTube categories' });
  }
});

// Get YouTube video stream URL for direct playback
router.get('/stream/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Validate video ID
    if (!ytdl.validateURL(videoUrl)) {
      return res.status(400).json({ error: 'Invalid YouTube video ID' });
    }

    // Get video info
    const info = await ytdl.getInfo(videoUrl);

    // Filter formats: video+audio combined, sorted by quality
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');

    if (formats.length === 0) {
      return res.status(404).json({ error: 'No suitable video format found' });
    }

    // Get the best quality format (highest resolution)
    const bestFormat = formats.reduce((best, format) => {
      const bestHeight = best.height || 0;
      const formatHeight = format.height || 0;
      return formatHeight > bestHeight ? format : best;
    }, formats[0]);

    // Return stream URL and video info
    res.json({
      streamUrl: bestFormat.url,
      quality: bestFormat.qualityLabel || 'unknown',
      container: bestFormat.container,
      videoCodec: bestFormat.videoCodec,
      audioCodec: bestFormat.audioCodec,
      contentLength: bestFormat.contentLength,
      // URL expires, so include expiry info
      expires: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // ~6 hours
    });
  } catch (error) {
    console.error('YouTube stream extraction error:', error.message);
    res.status(500).json({ error: 'Failed to extract YouTube stream URL' });
  }
});

// Helper function to parse ISO 8601 duration to seconds
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

  const hours = (match[1] ? parseInt(match[1]) : 0);
  const minutes = (match[2] ? parseInt(match[2]) : 0);
  const seconds = (match[3] ? parseInt(match[3]) : 0);

  return hours * 3600 + minutes * 60 + seconds;
}

module.exports = router;
