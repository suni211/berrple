const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Get user's blocked users
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [blocks] = await db.query(
      `SELECT
        ub.id as block_id,
        ub.created_at as blocked_at,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.bio
      FROM user_blocks ub
      JOIN users u ON ub.blocked_id = u.id
      WHERE ub.blocker_id = ?
      ORDER BY ub.created_at DESC
      LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    // Get total count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM user_blocks WHERE blocker_id = ?',
      [req.user.id]
    );

    res.json({
      blocks,
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

// Check if user is blocked
router.get('/check/:userId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [blocks] = await db.query(
      'SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
      [req.user.id, parseInt(userId)]
    );

    res.json({
      isBlocked: blocks.length > 0,
      blockId: blocks.length > 0 ? blocks[0].id : null
    });
  } catch (error) {
    next(error);
  }
});

// Block user
router.post('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const blockedId = parseInt(userId);

    // Can't block yourself
    if (blockedId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if user exists
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [blockedId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already blocked
    const [existing] = await db.query(
      'SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
      [req.user.id, blockedId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already blocked' });
    }

    // Insert block
    const [result] = await db.query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)',
      [req.user.id, blockedId]
    );

    res.status(201).json({
      message: 'User blocked successfully',
      blockId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

// Unblock user
router.delete('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [result] = await db.query(
      'DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
      [req.user.id, parseInt(userId)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
