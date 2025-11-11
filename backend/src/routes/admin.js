const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(authMiddleware, adminMiddleware);

// Dashboard statistics
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    // Total counts
    const [userStats] = await db.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as new_users_24h,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_7d,
        COUNT(CASE WHEN is_verified = TRUE THEN 1 END) as verified_users
      FROM users
    `);

    const [videoStats] = await db.query(`
      SELECT
        COUNT(*) as total_videos,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as new_videos_24h,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_videos_7d,
        SUM(view_count) as total_views,
        SUM(like_count) as total_likes
      FROM videos
      WHERE is_active = TRUE
    `);

    const [cloudStats] = await db.query(`
      SELECT
        COUNT(*) as total_clouds,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as new_clouds_24h,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_clouds_7d,
        COUNT(CASE WHEN is_flagged = TRUE THEN 1 END) as flagged_clouds
      FROM clouds
    `);

    const [reportStats] = await db.query(`
      SELECT
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_reports,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as new_reports_24h
      FROM reports
    `);

    const [channelStats] = await db.query(`
      SELECT COUNT(*) as total_channels
      FROM channels
    `);

    res.json({
      users: userStats[0],
      videos: videoStats[0],
      clouds: cloudStats[0],
      reports: reportStats[0],
      channels: channelStats[0]
    });
  } catch (error) {
    next(error);
  }
});

// User management - Get all users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, verified, admin } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        u.id,
        u.email,
        u.username,
        u.display_name,
        u.avatar_url,
        u.is_verified,
        u.is_admin,
        u.created_at,
        u.last_login_at,
        COUNT(DISTINCT v.id) as video_count,
        COUNT(DISTINCT c.id) as cloud_count
      FROM users u
      LEFT JOIN channels ch ON u.id = ch.user_id
      LEFT JOIN videos v ON ch.id = v.channel_id
      LEFT JOIN clouds c ON u.id = c.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.display_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (verified !== undefined) {
      query += ' AND u.is_verified = ?';
      params.push(verified === 'true' ? 1 : 0);
    }

    if (admin !== undefined) {
      query += ' AND u.is_admin = ?';
      params.push(admin === 'true' ? 1 : 0);
    }

    query += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ' AND (username LIKE ? OR email LIKE ? OR display_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (verified !== undefined) {
      countQuery += ' AND is_verified = ?';
      countParams.push(verified === 'true' ? 1 : 0);
    }

    if (admin !== undefined) {
      countQuery += ' AND is_admin = ?';
      countParams.push(admin === 'true' ? 1 : 0);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      users,
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

// Update user status
router.patch('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { is_verified, is_admin } = req.body;

    const updates = [];
    const values = [];

    if (is_verified !== undefined) {
      updates.push('is_verified = ?');
      values.push(is_verified ? 1 : 0);
    }

    if (is_admin !== undefined) {
      updates.push('is_admin = ?');
      values.push(is_admin ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(parseInt(userId));

    const [result] = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Don't allow deleting yourself
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const [result] = await db.query('DELETE FROM users WHERE id = ?', [parseInt(userId)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Video management - Get all videos
router.get('/videos', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, active } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        v.id,
        v.title,
        v.description,
        v.thumbnail_url,
        v.duration,
        v.view_count,
        v.like_count,
        v.is_active,
        v.created_at,
        c.channel_name,
        u.username,
        u.display_name
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (v.title LIKE ? OR v.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (active !== undefined) {
      query += ' AND v.is_active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    query += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [videos] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM videos WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    if (active !== undefined) {
      countQuery += ' AND is_active = ?';
      countParams.push(active === 'true' ? 1 : 0);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      videos,
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

// Update video status
router.patch('/videos/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ error: 'is_active field is required' });
    }

    const [result] = await db.query(
      'UPDATE videos SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, parseInt(videoId)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ message: 'Video updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete video
router.delete('/videos/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const [result] = await db.query('DELETE FROM videos WHERE id = ?', [parseInt(videoId)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Cloud management - Get flagged clouds
router.get('/clouds/flagged', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [clouds] = await db.query(
      `SELECT
        c.*,
        u.username,
        u.display_name,
        v.title as video_title
      FROM clouds c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN videos v ON c.video_id = v.id
      WHERE c.is_flagged = TRUE
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM clouds WHERE is_flagged = TRUE'
    );

    res.json({
      clouds,
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

// Delete cloud
router.delete('/clouds/:cloudId', async (req, res, next) => {
  try {
    const { cloudId } = req.params;

    const [result] = await db.query('DELETE FROM clouds WHERE id = ?', [parseInt(cloudId)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cloud not found' });
    }

    res.json({ message: 'Cloud deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Activity logs
router.get('/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const offset = (page - 1) * limit;

    // Combine recent activities from multiple tables
    const activities = [];

    // Recent user registrations
    const [newUsers] = await db.query(
      `SELECT
        'user_registration' as type,
        id as ref_id,
        username,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10`
    );

    // Recent video uploads
    const [newVideos] = await db.query(
      `SELECT
        'video_upload' as type,
        v.id as ref_id,
        v.title,
        u.username,
        v.created_at
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      ORDER BY v.created_at DESC
      LIMIT 10`
    );

    // Recent reports
    const [newReports] = await db.query(
      `SELECT
        'report' as type,
        r.id as ref_id,
        r.report_type,
        u.username as reporter_username,
        r.created_at
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 10`
    );

    activities.push(...newUsers, ...newVideos, ...newReports);

    // Sort by created_at
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      activities: activities.slice(offset, offset + parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
