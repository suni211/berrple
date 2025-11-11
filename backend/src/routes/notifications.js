const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Get user's notifications
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        n.id,
        n.type,
        n.title,
        n.message,
        n.link,
        n.is_read,
        n.created_at
      FROM notifications n
      WHERE n.user_id = ?
    `;
    const params = [req.user.id];

    if (unreadOnly === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [notifications] = await db.query(query, params);

    // Get unread count
    const [unreadCount] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({
      notifications,
      unreadCount: unreadCount[0].count,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req, res, next) => {
  try {
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ unreadCount: result[0].count });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authMiddleware, async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const [result] = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [parseInt(notificationId), req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.patch('/read-all', authMiddleware, async (req, res, next) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:notificationId', authMiddleware, async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const [result] = await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [parseInt(notificationId), req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

// Get email notification preferences
router.get('/preferences', authMiddleware, async (req, res, next) => {
  try {
    const [preferences] = await db.query(
      'SELECT * FROM email_preferences WHERE user_id = ?',
      [req.user.id]
    );

    if (preferences.length === 0) {
      // Create default preferences if not exists
      await db.query(
        `INSERT INTO email_preferences (user_id) VALUES (?)`,
        [req.user.id]
      );

      const [newPreferences] = await db.query(
        'SELECT * FROM email_preferences WHERE user_id = ?',
        [req.user.id]
      );

      return res.json({ preferences: newPreferences[0] });
    }

    res.json({ preferences: preferences[0] });
  } catch (error) {
    next(error);
  }
});

// Update email notification preferences
router.patch('/preferences', authMiddleware, async (req, res, next) => {
  try {
    const {
      notify_likes,
      notify_comments,
      notify_clouds,
      notify_follows,
      notify_replies,
      notify_mentions,
      notify_system
    } = req.body;

    // Check if preferences exist
    const [existing] = await db.query(
      'SELECT id FROM email_preferences WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length === 0) {
      // Create preferences
      await db.query(
        `INSERT INTO email_preferences
        (user_id, notify_likes, notify_comments, notify_clouds, notify_follows,
         notify_replies, notify_mentions, notify_system)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          notify_likes ?? true,
          notify_comments ?? true,
          notify_clouds ?? true,
          notify_follows ?? true,
          notify_replies ?? true,
          notify_mentions ?? true,
          notify_system ?? true
        ]
      );
    } else {
      // Update preferences
      const updates = [];
      const values = [];

      if (notify_likes !== undefined) {
        updates.push('notify_likes = ?');
        values.push(notify_likes);
      }
      if (notify_comments !== undefined) {
        updates.push('notify_comments = ?');
        values.push(notify_comments);
      }
      if (notify_clouds !== undefined) {
        updates.push('notify_clouds = ?');
        values.push(notify_clouds);
      }
      if (notify_follows !== undefined) {
        updates.push('notify_follows = ?');
        values.push(notify_follows);
      }
      if (notify_replies !== undefined) {
        updates.push('notify_replies = ?');
        values.push(notify_replies);
      }
      if (notify_mentions !== undefined) {
        updates.push('notify_mentions = ?');
        values.push(notify_mentions);
      }
      if (notify_system !== undefined) {
        updates.push('notify_system = ?');
        values.push(notify_system);
      }

      if (updates.length > 0) {
        values.push(req.user.id);
        await db.query(
          `UPDATE email_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
          values
        );
      }
    }

    const [updatedPreferences] = await db.query(
      'SELECT * FROM email_preferences WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences: updatedPreferences[0]
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to create notification (for internal use)
async function createNotification(userId, type, title, message, link = null) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?)`,
      [userId, type, title, message, link]
    );
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

module.exports = router;
module.exports.createNotification = createNotification;
