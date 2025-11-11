const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Create report
router.post('/',
  authMiddleware,
  [
    body('reportType').isIn(['spam', 'harassment', 'inappropriate', 'copyright', 'other']),
    body('reason').isLength({ min: 10, max: 1000 }).trim(),
    body('reportedUserId').optional().isInt(),
    body('videoId').optional(),
    body('cloudId').optional().isInt(),
    body('postId').optional().isInt(),
    body('commentId').optional().isInt()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        reportType,
        reason,
        reportedUserId,
        videoId,
        cloudId,
        postId,
        commentId
      } = req.body;

      // Ensure at least one target is specified
      if (!reportedUserId && !videoId && !cloudId && !postId && !commentId) {
        return res.status(400).json({ error: 'Must specify what to report' });
      }

      let youtubeVideoId = null;
      let dbVideoId = null;

      // Handle video ID (could be YouTube or DB video)
      if (videoId) {
        if (videoId.startsWith('yt_')) {
          youtubeVideoId = videoId.substring(3);
        } else {
          dbVideoId = parseInt(videoId);
        }
      }

      // Insert report
      const [result] = await db.query(
        `INSERT INTO reports
        (reporter_id, reported_user_id, video_id, youtube_video_id, cloud_id, post_id, comment_id, report_type, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          reportedUserId || null,
          dbVideoId,
          youtubeVideoId,
          cloudId || null,
          postId || null,
          commentId || null,
          reportType,
          reason
        ]
      );

      res.status(201).json({
        message: 'Report submitted successfully',
        reportId: result.insertId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user's reports
router.get('/my-reports', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        r.*,
        ru.username as reported_username,
        ru.display_name as reported_display_name,
        reviewer.username as reviewer_username
      FROM reports r
      LEFT JOIN users ru ON r.reported_user_id = ru.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      WHERE r.reporter_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [reports] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM reports WHERE reporter_id = ?';
    const countParams = [req.user.id];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      reports,
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

// Get all reports (admin only)
router.get('/admin/all', authMiddleware, async (req, res, next) => {
  try {
    // Check if user is admin
    const [users] = await db.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    if (!users[0] || !users[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, status, reportType } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        r.*,
        reporter.username as reporter_username,
        reporter.display_name as reporter_display_name,
        ru.username as reported_username,
        ru.display_name as reported_display_name,
        reviewer.username as reviewer_username
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      LEFT JOIN users ru ON r.reported_user_id = ru.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (reportType) {
      query += ' AND r.report_type = ?';
      params.push(reportType);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [reports] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM reports WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (reportType) {
      countQuery += ' AND report_type = ?';
      countParams.push(reportType);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      reports,
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

// Update report status (admin only)
router.patch('/:reportId',
  authMiddleware,
  [
    body('status').isIn(['pending', 'reviewed', 'resolved', 'dismissed']),
    body('adminNotes').optional().isLength({ max: 1000 }).trim()
  ],
  async (req, res, next) => {
    try {
      // Check if user is admin
      const [users] = await db.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (!users[0] || !users[0].is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { reportId } = req.params;
      const { status, adminNotes } = req.body;

      const [result] = await db.query(
        `UPDATE reports
        SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
        WHERE id = ?`,
        [status, adminNotes || null, req.user.id, parseInt(reportId)]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({ message: 'Report updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Get report statistics (admin only)
router.get('/admin/stats', authMiddleware, async (req, res, next) => {
  try {
    // Check if user is admin
    const [users] = await db.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    if (!users[0] || !users[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [statusStats] = await db.query(`
      SELECT status, COUNT(*) as count
      FROM reports
      GROUP BY status
    `);

    const [typeStats] = await db.query(`
      SELECT report_type, COUNT(*) as count
      FROM reports
      GROUP BY report_type
    `);

    const [recentStats] = await db.query(`
      SELECT
        COUNT(*) as total_24h,
        COUNT(DISTINCT reporter_id) as unique_reporters_24h
      FROM reports
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    res.json({
      byStatus: statusStats,
      byType: typeStats,
      recent24h: recentStats[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
