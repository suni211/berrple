const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Get channel by handle
router.get('/:handle', async (req, res, next) => {
  try {
    const [channels] = await db.query(
      `SELECT c.*, u.username, u.display_name as owner_name, u.is_admin, u.is_verified
       FROM channels c
       JOIN users u ON c.user_id = u.id
       WHERE c.channel_handle = ?`,
      [req.params.handle]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ channel: channels[0] });
  } catch (error) {
    next(error);
  }
});

// Create new channel
router.post('/', authMiddleware,
  [
    body('channelName').isLength({ min: 3, max: 100 }).trim(),
    body('channelHandle').isLength({ min: 3, max: 50 }).trim().matches(/^[a-zA-Z0-9_-]+$/),
    body('description').optional().isLength({ max: 1000 }).trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { channelName, channelHandle, description } = req.body;

      // Check if handle is taken
      const [existing] = await db.query(
        'SELECT id FROM channels WHERE channel_handle = ?',
        [channelHandle]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: 'Channel handle already taken' });
      }

      const [result] = await db.query(
        'INSERT INTO channels (user_id, channel_name, channel_handle, description) VALUES (?, ?, ?, ?)',
        [req.user.id, channelName, channelHandle, description]
      );

      res.status(201).json({
        message: 'Channel created successfully',
        channelId: result.insertId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update channel
router.put('/:handle', authMiddleware,
  [
    body('channelName').optional().isLength({ min: 3, max: 100 }).trim(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    body('bannerUrl').optional().isURL(),
    body('avatarUrl').optional().isURL()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify ownership
      const [channels] = await db.query(
        'SELECT id, user_id FROM channels WHERE channel_handle = ?',
        [req.params.handle]
      );

      if (channels.length === 0) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      if (channels[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { channelName, description, bannerUrl, avatarUrl } = req.body;
      const updates = [];
      const values = [];

      if (channelName) {
        updates.push('channel_name = ?');
        values.push(channelName);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (bannerUrl !== undefined) {
        updates.push('banner_url = ?');
        values.push(bannerUrl);
      }
      if (avatarUrl !== undefined) {
        updates.push('avatar_url = ?');
        values.push(avatarUrl);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(channels[0].id);

      await db.query(
        `UPDATE channels SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      res.json({ message: 'Channel updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Check if user is subscribed to channel
router.get('/:handle/is-subscribed', authMiddleware, async (req, res, next) => {
  try {
    const [channels] = await db.query(
      'SELECT id FROM channels WHERE channel_handle = ?',
      [req.params.handle]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const [subscriptions] = await db.query(
      'SELECT id FROM channel_subscribers WHERE channel_id = ? AND user_id = ?',
      [channels[0].id, req.user.id]
    );

    res.json({ isSubscribed: subscriptions.length > 0 });
  } catch (error) {
    next(error);
  }
});

// Subscribe to channel
router.post('/:handle/subscribe', authMiddleware, async (req, res, next) => {
  try {
    const [channels] = await db.query(
      'SELECT id FROM channels WHERE channel_handle = ?',
      [req.params.handle]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    await db.query(
      'INSERT INTO channel_subscribers (channel_id, user_id) VALUES (?, ?)',
      [channels[0].id, req.user.id]
    );

    await db.query(
      'UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?',
      [channels[0].id]
    );

    res.json({ message: 'Subscribed successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Already subscribed' });
    }
    next(error);
  }
});

// Unsubscribe from channel
router.delete('/:handle/subscribe', authMiddleware, async (req, res, next) => {
  try {
    const [channels] = await db.query(
      'SELECT id FROM channels WHERE channel_handle = ?',
      [req.params.handle]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const [result] = await db.query(
      'DELETE FROM channel_subscribers WHERE channel_id = ? AND user_id = ?',
      [channels[0].id, req.user.id]
    );

    if (result.affectedRows > 0) {
      await db.query(
        'UPDATE channels SET subscriber_count = GREATEST(0, subscriber_count - 1) WHERE id = ?',
        [channels[0].id]
      );
    }

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    next(error);
  }
});

// Get channel videos
router.get('/:handle/videos', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [channels] = await db.query(
      'SELECT id FROM channels WHERE channel_handle = ?',
      [req.params.handle]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const [videos] = await db.query(
      `SELECT v.*, c.channel_name, c.channel_handle, c.avatar_url as channel_avatar, u.id as user_id, u.is_admin, u.is_verified
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE v.channel_id = ? AND v.is_public = TRUE
       ORDER BY v.created_at DESC
       LIMIT ? OFFSET ?`,
      [channels[0].id, parseInt(limit), parseInt(offset)]
    );

    res.json({ videos });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
