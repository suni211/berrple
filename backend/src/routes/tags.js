const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all tags
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const [tags] = await db.query(
      'SELECT * FROM tags ORDER BY usage_count DESC LIMIT ?',
      [parseInt(limit)]
    );

    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

// Get popular tags
router.get('/popular', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const [tags] = await db.query(
      'SELECT * FROM tags ORDER BY usage_count DESC LIMIT ?',
      [parseInt(limit)]
    );

    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

// Get videos by tag
router.get('/:tagName/videos', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [videos] = await db.query(
      `SELECT v.*, c.channel_name, c.channel_handle
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       JOIN video_tags vt ON v.id = vt.video_id
       JOIN tags t ON vt.tag_id = t.id
       WHERE t.tag_name = ? AND v.is_public = TRUE
       ORDER BY v.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.params.tagName, parseInt(limit), parseInt(offset)]
    );

    res.json({ videos, tag: req.params.tagName });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
