const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Get user's liked videos
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [likes] = await db.query(
      `SELECT
        vl.id as like_id,
        vl.created_at as liked_at,
        vl.video_id,
        vl.youtube_video_id,
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
      FROM video_likes vl
      LEFT JOIN videos v ON vl.video_id = v.id
      LEFT JOIN channels c ON v.channel_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE vl.user_id = ?
      ORDER BY vl.created_at DESC
      LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    // Get total count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM video_likes WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      likes,
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

// Check if video is liked
router.get('/check/:videoId', authMiddleware, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    let query, params;

    // Check if YouTube video (yt_ prefix)
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);
      query = 'SELECT id FROM video_likes WHERE user_id = ? AND youtube_video_id = ?';
      params = [req.user.id, youtubeVideoId];
    } else {
      query = 'SELECT id FROM video_likes WHERE user_id = ? AND video_id = ?';
      params = [req.user.id, parseInt(videoId)];
    }

    const [likes] = await db.query(query, params);

    res.json({
      isLiked: likes.length > 0,
      likeId: likes.length > 0 ? likes[0].id : null
    });
  } catch (error) {
    next(error);
  }
});

// Get video like count
router.get('/count/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    let query, params;

    // Check if YouTube video (yt_ prefix)
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);
      query = 'SELECT COUNT(*) as like_count FROM video_likes WHERE youtube_video_id = ?';
      params = [youtubeVideoId];
    } else {
      query = 'SELECT like_count FROM videos WHERE id = ?';
      params = [parseInt(videoId)];
    }

    const [result] = await db.query(query, params);

    res.json({
      likeCount: videoId.startsWith('yt_') ? result[0].like_count : (result[0]?.like_count || 0)
    });
  } catch (error) {
    next(error);
  }
});

// Like video
router.post('/:videoId', authMiddleware, async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { videoId } = req.params;
    let insertQuery, insertParams, updateQuery, updateParams;

    // Check if YouTube video (yt_ prefix)
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);

      // Check if already liked
      const [existing] = await connection.query(
        'SELECT id FROM video_likes WHERE user_id = ? AND youtube_video_id = ?',
        [req.user.id, youtubeVideoId]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Video already liked' });
      }

      insertQuery = 'INSERT INTO video_likes (user_id, youtube_video_id) VALUES (?, ?)';
      insertParams = [req.user.id, youtubeVideoId];
    } else {
      // Check if video exists
      const [videos] = await connection.query('SELECT id FROM videos WHERE id = ?', [parseInt(videoId)]);

      if (videos.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Video not found' });
      }

      // Check if already liked
      const [existing] = await connection.query(
        'SELECT id FROM video_likes WHERE user_id = ? AND video_id = ?',
        [req.user.id, parseInt(videoId)]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Video already liked' });
      }

      insertQuery = 'INSERT INTO video_likes (user_id, video_id) VALUES (?, ?)';
      insertParams = [req.user.id, parseInt(videoId)];

      // Update like count for DB videos
      updateQuery = 'UPDATE videos SET like_count = like_count + 1 WHERE id = ?';
      updateParams = [parseInt(videoId)];
    }

    // Insert like
    const [result] = await connection.query(insertQuery, insertParams);

    // Update like count if it's a DB video
    if (updateQuery) {
      await connection.query(updateQuery, updateParams);
    }

    await connection.commit();

    // Get updated like count
    let likeCount = 0;
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);
      const [countResult] = await db.query(
        'SELECT COUNT(*) as like_count FROM video_likes WHERE youtube_video_id = ?',
        [youtubeVideoId]
      );
      likeCount = countResult[0].like_count;
    } else {
      const [countResult] = await db.query(
        'SELECT like_count FROM videos WHERE id = ?',
        [parseInt(videoId)]
      );
      likeCount = countResult[0].like_count;
    }

    res.status(201).json({
      message: 'Video liked successfully',
      likeId: result.insertId,
      likeCount
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// Unlike video
router.delete('/:videoId', authMiddleware, async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { videoId } = req.params;
    let deleteQuery, deleteParams, updateQuery, updateParams;

    // Check if YouTube video (yt_ prefix)
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);
      deleteQuery = 'DELETE FROM video_likes WHERE user_id = ? AND youtube_video_id = ?';
      deleteParams = [req.user.id, youtubeVideoId];
    } else {
      deleteQuery = 'DELETE FROM video_likes WHERE user_id = ? AND video_id = ?';
      deleteParams = [req.user.id, parseInt(videoId)];

      // Update like count for DB videos
      updateQuery = 'UPDATE videos SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?';
      updateParams = [parseInt(videoId)];
    }

    // Delete like
    const [result] = await connection.query(deleteQuery, deleteParams);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Like not found' });
    }

    // Update like count if it's a DB video
    if (updateQuery) {
      await connection.query(updateQuery, updateParams);
    }

    await connection.commit();

    // Get updated like count
    let likeCount = 0;
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3);
      const [countResult] = await db.query(
        'SELECT COUNT(*) as like_count FROM video_likes WHERE youtube_video_id = ?',
        [youtubeVideoId]
      );
      likeCount = countResult[0].like_count;
    } else {
      const [countResult] = await db.query(
        'SELECT like_count FROM videos WHERE id = ?',
        [parseInt(videoId)]
      );
      likeCount = countResult[0].like_count;
    }

    res.json({
      message: 'Like removed successfully',
      likeCount
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
