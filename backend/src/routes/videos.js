const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// Get video by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const [videos] = await db.query(
      `SELECT v.*, c.channel_name, c.channel_handle, c.avatar_url as channel_avatar,
       u.id as user_id, u.username, u.display_name, u.is_admin, u.is_verified
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE v.id = ?`,
      [req.params.id]
    );

    if (videos.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videos[0];

    // Record view if not the owner
    if (!req.user || req.user.id !== video.user_id) {
      // 중복 조회 방지: 같은 사용자/IP에서 24시간 내 중복 조회 체크
      const [recentViews] = await db.query(
        `SELECT id FROM video_views
         WHERE video_id = ?
         AND (user_id = ? OR ip_address = ?)
         AND viewed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         LIMIT 1`,
        [video.id, req.user?.id || null, req.ip]
      );

      // 24시간 내 조회 기록이 없으면 조회수 증가
      if (recentViews.length === 0) {
        await db.query(
          'INSERT INTO video_views (video_id, user_id, ip_address) VALUES (?, ?, ?)',
          [video.id, req.user?.id || null, req.ip]
        );

        await db.query(
          'UPDATE videos SET view_count = view_count + 1 WHERE id = ?',
          [video.id]
        );
      }
    }

    res.json({ video });
  } catch (error) {
    next(error);
  }
});

// Get videos list
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type, // 'youtube' or 'upload'
      tag,
      sort = 'recent' // 'recent', 'popular', 'weekly', 'monthly'
    } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT v.*, c.channel_name, c.channel_handle, c.avatar_url as channel_avatar, u.id as user_id, u.is_admin, u.is_verified
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE v.is_public = TRUE
    `;
    const params = [];

    if (type) {
      query += ' AND v.video_type = ?';
      params.push(type);
    }

    if (tag) {
      query += ` AND v.id IN (
        SELECT vt.video_id FROM video_tags vt
        JOIN tags t ON vt.tag_id = t.id
        WHERE t.tag_name = ?
      )`;
      params.push(tag);
    }

    // Sorting
    if (sort === 'popular') {
      query += ' ORDER BY v.view_count DESC';
    } else if (sort === 'weekly') {
      query += ' AND v.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY v.view_count DESC';
    } else if (sort === 'monthly') {
      query += ' AND v.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) ORDER BY v.view_count DESC';
    } else {
      query += ' ORDER BY v.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [videos] = await db.query(query, params);

    res.json({ videos, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    next(error);
  }
});

// Create video entry (for YouTube videos)
router.post('/', authMiddleware,
  [
    body('channelHandle').notEmpty().trim(),
    body('videoType').isIn(['youtube', 'upload']),
    body('youtubeVideoId').if(body('videoType').equals('youtube')).notEmpty(),
    body('title').isLength({ min: 1, max: 255 }).trim(),
    body('description').optional().trim(),
    body('thumbnailUrl').optional().isURL(),
    body('duration').optional().isInt({ min: 0 }),
    body('tags').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        channelHandle,
        videoType,
        youtubeVideoId,
        title,
        description,
        thumbnailUrl,
        duration,
        tags
      } = req.body;

      // Verify channel ownership
      const [channels] = await db.query(
        'SELECT id, user_id FROM channels WHERE channel_handle = ?',
        [channelHandle]
      );

      if (channels.length === 0) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      if (channels[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Check for duplicate YouTube video
      if (videoType === 'youtube') {
        const [existing] = await db.query(
          'SELECT id FROM videos WHERE youtube_video_id = ?',
          [youtubeVideoId]
        );

        if (existing.length > 0) {
          return res.status(409).json({ error: 'Video already exists' });
        }
      }

      const [result] = await db.query(
        `INSERT INTO videos (channel_id, video_type, youtube_video_id, title, description, thumbnail_url, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [channels[0].id, videoType, youtubeVideoId || null, title, description, thumbnailUrl, duration]
      );

      const videoId = result.insertId;

      // Add tags
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          // Create tag if doesn't exist
          const [tagResult] = await db.query(
            'INSERT INTO tags (tag_name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
            [tagName]
          );
          const tagId = tagResult.insertId;

          // Link video to tag
          await db.query(
            'INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)',
            [videoId, tagId]
          );

          // Update tag usage count
          await db.query(
            'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
            [tagId]
          );
        }
      }

      // Update channel video count
      await db.query(
        'UPDATE channels SET video_count = video_count + 1 WHERE id = ?',
        [channels[0].id]
      );

      res.status(201).json({
        message: 'Video created successfully',
        videoId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update video
router.put('/:id', authMiddleware,
  [
    body('title').optional().isLength({ min: 1, max: 255 }).trim(),
    body('description').optional().trim(),
    body('isPublic').optional().isBoolean(),
    body('allowClouds').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify ownership
      const [videos] = await db.query(
        `SELECT v.id, c.user_id
         FROM videos v
         JOIN channels c ON v.channel_id = c.id
         WHERE v.id = ?`,
        [req.params.id]
      );

      if (videos.length === 0) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (videos[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { title, description, isPublic, allowClouds } = req.body;
      const updates = [];
      const values = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (isPublic !== undefined) {
        updates.push('is_public = ?');
        values.push(isPublic);
      }
      if (allowClouds !== undefined) {
        updates.push('allow_clouds = ?');
        values.push(allowClouds);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);

      await db.query(
        `UPDATE videos SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      res.json({ message: 'Video updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Delete video
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const [videos] = await db.query(
      `SELECT v.id, v.channel_id, c.user_id
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       WHERE v.id = ?`,
      [req.params.id]
    );

    if (videos.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (videos[0].user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query('DELETE FROM videos WHERE id = ?', [req.params.id]);

    // Update channel video count
    await db.query(
      'UPDATE channels SET video_count = GREATEST(0, video_count - 1) WHERE id = ?',
      [videos[0].channel_id]
    );

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Search videos
router.get('/search/query', async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const offset = (page - 1) * limit;

    const [videos] = await db.query(
      `SELECT v.*, c.channel_name, c.channel_handle, c.avatar_url as channel_avatar, u.id as user_id, u.is_admin, u.is_verified
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE v.is_public = TRUE
       AND (v.title LIKE ? OR v.description LIKE ?)
       ORDER BY v.view_count DESC, v.created_at DESC
       LIMIT ? OFFSET ?`,
      [`%${q}%`, `%${q}%`, parseInt(limit), parseInt(offset)]
    );

    res.json({ videos, query: q });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
