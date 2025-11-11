const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// Get clouds for a video (supports both DB videos and YouTube videos)
router.get('/video/:videoId', optionalAuth, async (req, res, next) => {
  try {
    const videoId = req.params.videoId;
    let clouds;

    // YouTube 영상인 경우 (yt_ 프리픽스)
    if (videoId.startsWith('yt_')) {
      const youtubeVideoId = videoId.substring(3); // 'yt_' 제거
      [clouds] = await db.query(
        `SELECT c.*, u.username, u.display_name, u.avatar_url
         FROM clouds c
         JOIN users u ON c.user_id = u.id
         WHERE c.youtube_video_id = ? AND c.is_flagged = FALSE
         ORDER BY c.timestamp_sec ASC`,
        [youtubeVideoId]
      );
    } else {
      // 일반 DB 영상인 경우
      [clouds] = await db.query(
        `SELECT c.*, u.username, u.display_name, u.avatar_url
         FROM clouds c
         JOIN users u ON c.user_id = u.id
         WHERE c.video_id = ? AND c.is_flagged = FALSE
         ORDER BY c.timestamp_sec ASC`,
        [parseInt(videoId)]
      );
    }

    res.json({ clouds });
  } catch (error) {
    next(error);
  }
});

// Get latest clouds (for homepage)
router.get('/latest', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const [clouds] = await db.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url,
       v.title as video_title, v.thumbnail_url as video_thumbnail
       FROM clouds c
       JOIN users u ON c.user_id = u.id
       JOIN videos v ON c.video_id = v.id
       WHERE c.is_flagged = FALSE AND v.is_public = TRUE
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({ clouds });
  } catch (error) {
    next(error);
  }
});

// Get videos with recent clouds (for homepage)
router.get('/recent-videos', async (req, res, next) => {
  try {
    const { limit = 12 } = req.query;

    // 일반 업로드 영상 (최근 구름)
    const [uploadVideos] = await db.query(
      `SELECT v.*, COUNT(c.id) as recent_cloud_count,
       MAX(c.created_at) as latest_cloud_time
       FROM videos v
       INNER JOIN clouds c ON v.id = c.video_id
       WHERE c.is_flagged = FALSE AND v.is_public = TRUE
       GROUP BY v.id
       ORDER BY latest_cloud_time DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    // YouTube 영상 (최근 구름)
    const [youtubeVideos] = await db.query(
      `SELECT
        c.youtube_video_id,
        COUNT(DISTINCT c.id) as recent_cloud_count,
        MAX(c.created_at) as latest_cloud_time,
        GROUP_CONCAT(DISTINCT c.content ORDER BY c.created_at DESC LIMIT 1) as latest_cloud
       FROM clouds c
       WHERE c.youtube_video_id IS NOT NULL AND c.is_flagged = FALSE
       GROUP BY c.youtube_video_id
       ORDER BY latest_cloud_time DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      uploadVideos,
      youtubeVideos
    });
  } catch (error) {
    next(error);
  }
});

// Create cloud comment (supports both DB videos and YouTube videos)
router.post('/', authMiddleware,
  [
    body('videoId').notEmpty(), // 문자열 또는 숫자 모두 허용
    body('content').isLength({ min: 1, max: 200 }).trim(),
    body('timestampSec').isFloat({ min: 0 }),
    body('positionX').optional().isInt({ min: 0, max: 100 }),
    body('positionY').optional().isInt({ min: 0, max: 100 }),
    body('isRandomPosition').optional().isBoolean(),
    body('duration').optional().isInt({ min: 2, max: 5 }),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i)
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        videoId,
        content,
        timestampSec,
        positionX,
        positionY,
        isRandomPosition,
        duration,
        color
      } = req.body;

      let dbVideoId = null;
      let youtubeVideoId = null;

      // YouTube 영상인 경우 (yt_ 프리픽스)
      if (typeof videoId === 'string' && videoId.startsWith('yt_')) {
        youtubeVideoId = videoId.substring(3); // 'yt_' 제거

        // 영상당 사용자당 5개 제한 확인
        const [existingClouds] = await db.query(
          'SELECT COUNT(*) as count FROM clouds WHERE youtube_video_id = ? AND user_id = ?',
          [youtubeVideoId, req.user.id]
        );

        if (existingClouds[0].count >= 5) {
          return res.status(403).json({ error: '이 영상에는 최대 5개까지만 구름을 달 수 있습니다.' });
        }
      } else {
        // 일반 DB 영상인 경우
        dbVideoId = parseInt(videoId);
        const [videos] = await db.query(
          'SELECT id, allow_clouds FROM videos WHERE id = ?',
          [dbVideoId]
        );

        if (videos.length === 0) {
          return res.status(404).json({ error: 'Video not found' });
        }

        if (!videos[0].allow_clouds) {
          return res.status(403).json({ error: 'Clouds are disabled for this video' });
        }

        // 영상당 사용자당 5개 제한 확인
        const [existingClouds] = await db.query(
          'SELECT COUNT(*) as count FROM clouds WHERE video_id = ? AND user_id = ?',
          [dbVideoId, req.user.id]
        );

        if (existingClouds[0].count >= 5) {
          return res.status(403).json({ error: '이 영상에는 최대 5개까지만 구름을 달 수 있습니다.' });
        }
      }

      // Generate random position if requested
      let finalX = positionX;
      let finalY = positionY;

      if (isRandomPosition || (positionX === undefined && positionY === undefined)) {
        finalX = Math.floor(Math.random() * 80) + 10; // 10-90%
        finalY = Math.floor(Math.random() * 60) + 10; // 10-70%
      }

      const [result] = await db.query(
        `INSERT INTO clouds (video_id, youtube_video_id, user_id, content, timestamp_sec, position_x, position_y,
         is_random_position, duration, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dbVideoId,
          youtubeVideoId,
          req.user.id,
          content,
          timestampSec,
          finalX,
          finalY,
          isRandomPosition || false,
          duration || 3,
          color || '#00FF80'
        ]
      );

      // Update video cloud count (일반 영상만)
      if (dbVideoId) {
        await db.query(
          'UPDATE videos SET cloud_count = cloud_count + 1 WHERE id = ?',
          [dbVideoId]
        );
      }

      res.status(201).json({
        message: 'Cloud created successfully',
        cloudId: result.insertId,
        position: { x: finalX, y: finalY }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete cloud
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const [clouds] = await db.query(
      'SELECT video_id, user_id FROM clouds WHERE id = ?',
      [req.params.id]
    );

    if (clouds.length === 0) {
      return res.status(404).json({ error: 'Cloud not found' });
    }

    if (clouds[0].user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query('DELETE FROM clouds WHERE id = ?', [req.params.id]);

    // Update video cloud count
    await db.query(
      'UPDATE videos SET cloud_count = GREATEST(0, cloud_count - 1) WHERE id = ?',
      [clouds[0].video_id]
    );

    res.json({ message: 'Cloud deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Like a cloud
router.post('/:id/like', authMiddleware, async (req, res, next) => {
  try {
    const [clouds] = await db.query('SELECT id FROM clouds WHERE id = ?', [req.params.id]);

    if (clouds.length === 0) {
      return res.status(404).json({ error: 'Cloud not found' });
    }

    await db.query(
      'INSERT INTO cloud_likes (cloud_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );

    await db.query(
      'UPDATE clouds SET like_count = like_count + 1 WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Cloud liked successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Already liked' });
    }
    next(error);
  }
});

// Unlike a cloud
router.delete('/:id/like', authMiddleware, async (req, res, next) => {
  try {
    const [result] = await db.query(
      'DELETE FROM cloud_likes WHERE cloud_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows > 0) {
      await db.query(
        'UPDATE clouds SET like_count = GREATEST(0, like_count - 1) WHERE id = ?',
        [req.params.id]
      );
    }

    res.json({ message: 'Cloud unliked successfully' });
  } catch (error) {
    next(error);
  }
});

// Flag a cloud
router.post('/:id/flag', authMiddleware,
  [body('reason').isLength({ min: 10, max: 500 }).trim()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await db.query(
        'UPDATE clouds SET is_flagged = TRUE WHERE id = ?',
        [req.params.id]
      );

      res.json({ message: 'Cloud flagged for review' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
