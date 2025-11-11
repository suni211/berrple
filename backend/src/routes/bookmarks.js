const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Get user's bookmarks
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [bookmarks] = await db.query(
      `SELECT
        vb.id as bookmark_id,
        vb.created_at as bookmarked_at,
        vb.video_id,
        vb.youtube_video_id,
        v.title,
        v.description,
        v.thumbnail_url,
        v.duration,
        v.view_count,
        v.like_count,
        v.created_at,
        c.channel_name,
        c.channel_handle,
        u.username,
        u.display_name,
        u.avatar_url
      FROM video_bookmarks vb
      LEFT JOIN videos v ON vb.video_id = v.id
      LEFT JOIN channels c ON v.channel_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE vb.user_id = ?
      ORDER BY vb.created_at DESC
      LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    // Get total count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM video_bookmarks WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      bookmarks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Check if video is bookmarked
router.get('/check/:videoId', authMiddleware, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    let query, params;

    // Check if YouTube video (yt_ prefix)
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);
      query = 'SELECT id FROM video_bookmarks WHERE user_id = ? AND youtube_video_id = ?';
      params = [req.user.id, youtubeVideoId];
    } else {
      query = 'SELECT id FROM video_bookmarks WHERE user_id = ? AND video_id = ?';
      params = [req.user.id, parseInt(videoId)];
    }

    const [bookmarks] = await db.query(query, params);

    res.json({
      isBookmarked: bookmarks.length > 0,
      bookmarkId: bookmarks.length > 0 ? bookmarks[0].id : null
    });
  } catch (error) {
    next(error);
  }
});

// Add bookmark
router.post('/:videoId', authMiddleware, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    let query, params;

    // Check if YouTube video (yt_ prefix)
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);

      // Check if already bookmarked
      const [existing] = await db.query(
        'SELECT id FROM video_bookmarks WHERE user_id = ? AND youtube_video_id = ?',
        [req.user.id, youtubeVideoId]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: 'Video already bookmarked' });
      }

      query = 'INSERT INTO video_bookmarks (user_id, youtube_video_id) VALUES (?, ?)';
      params = [req.user.id, youtubeVideoId];
    } else {
      // Check if video exists
      const [videos] = await db.query('SELECT id FROM videos WHERE id = ?', [parseInt(videoId)]);

      if (videos.length === 0) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Check if already bookmarked
      const [existing] = await db.query(
        'SELECT id FROM video_bookmarks WHERE user_id = ? AND video_id = ?',
        [req.user.id, parseInt(videoId)]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: 'Video already bookmarked' });
      }

      query = 'INSERT INTO video_bookmarks (user_id, video_id) VALUES (?, ?)';
      params = [req.user.id, parseInt(videoId)];
    }

    const [result] = await db.query(query, params);

    res.status(201).json({
      message: 'Video bookmarked successfully',
      bookmarkId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

// Remove bookmark
router.delete('/:videoId', authMiddleware, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    let query, params;

    // Check if YouTube video (yt_ prefix)
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);
      query = 'DELETE FROM video_bookmarks WHERE user_id = ? AND youtube_video_id = ?';
      params = [req.user.id, youtubeVideoId];
    } else {
      query = 'DELETE FROM video_bookmarks WHERE user_id = ? AND video_id = ?';
      params = [req.user.id, parseInt(videoId)];
    }

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
