const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Get user profile
router.get('/:username', async (req, res, next) => {
  try {
    const [users] = await db.query(
      `SELECT id, username, display_name, avatar_url, bio, is_verified, created_at,
      (SELECT COUNT(*) FROM channels WHERE user_id = users.id) as channel_count
      FROM users WHERE username = ?`,
      [req.params.username]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authMiddleware,
  [
    body('displayName').optional().isLength({ max: 100 }).trim(),
    body('bio').optional().isLength({ max: 500 }).trim(),
    body('avatarUrl').optional().custom((value) => {
      if (!value || value === '') return true; // 빈 문자열 허용
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(value)) {
        throw new Error('Invalid URL format');
      }
      return true;
    })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { displayName, bio, avatarUrl } = req.body;
      const updates = [];
      const values = [];

      if (displayName !== undefined) {
        updates.push('display_name = ?');
        values.push(displayName);
      }
      if (bio !== undefined) {
        updates.push('bio = ?');
        values.push(bio);
      }
      if (avatarUrl !== undefined) {
        updates.push('avatar_url = ?');
        values.push(avatarUrl);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.user.id);

      await db.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      const [updatedUser] = await db.query(
        'SELECT id, username, display_name, avatar_url, bio, email, is_admin, is_verified, created_at FROM users WHERE id = ?',
        [req.user.id]
      );

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user's channels
router.get('/:username/channels', async (req, res, next) => {
  try {
    const [user] = await db.query('SELECT id FROM users WHERE username = ?', [req.params.username]);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [channels] = await db.query(
      'SELECT * FROM channels WHERE user_id = ? ORDER BY created_at DESC',
      [user[0].id]
    );

    res.json({ channels });
  } catch (error) {
    next(error);
  }
});

// Get my subscriptions (내가 구독한 채널 목록)
router.get('/me/subscriptions', authMiddleware, async (req, res, next) => {
  try {
    const [subscriptions] = await db.query(
      `SELECT c.*, u.username, u.display_name,
       (SELECT COUNT(*) FROM videos WHERE channel_id = c.id) as video_count
       FROM channel_subscribers cs
       JOIN channels c ON cs.channel_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE cs.user_id = ?
       ORDER BY cs.subscribed_at DESC`,
      [req.user.id]
    );

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
