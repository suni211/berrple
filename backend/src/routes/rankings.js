const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 실시간 랭킹 (최근 1시간 기준)
router.get('/realtime', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const [videos] = await db.query(
      `SELECT
        v.id,
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
        u.avatar_url,
        COUNT(DISTINCT vv.id) as recent_views,
        COUNT(DISTINCT vl.id) as recent_likes,
        COUNT(DISTINCT cl.id) as recent_clouds,
        (COUNT(DISTINCT vv.id) * 1.0 +
         COUNT(DISTINCT vl.id) * 3.0 +
         COUNT(DISTINCT cl.id) * 2.0) as score
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN video_views vv ON v.id = vv.video_id
        AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      LEFT JOIN video_likes vl ON v.id = vl.video_id
        AND vl.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      LEFT JOIN clouds cl ON v.id = cl.video_id
        AND cl.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      WHERE v.is_active = TRUE
      GROUP BY v.id, c.id, u.id
      HAVING score > 0
      ORDER BY score DESC, v.created_at DESC
      LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      ranking: videos,
      period: 'realtime',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// 36시간 랭킹
router.get('/36h', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const [videos] = await db.query(
      `SELECT
        v.id,
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
        u.avatar_url,
        COUNT(DISTINCT vv.id) as recent_views,
        COUNT(DISTINCT vl.id) as recent_likes,
        COUNT(DISTINCT cl.id) as recent_clouds,
        (COUNT(DISTINCT vv.id) * 1.0 +
         COUNT(DISTINCT vl.id) * 3.0 +
         COUNT(DISTINCT cl.id) * 2.0) as score
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN video_views vv ON v.id = vv.video_id
        AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 36 HOUR)
      LEFT JOIN video_likes vl ON v.id = vl.video_id
        AND vl.created_at >= DATE_SUB(NOW(), INTERVAL 36 HOUR)
      LEFT JOIN clouds cl ON v.id = cl.video_id
        AND cl.created_at >= DATE_SUB(NOW(), INTERVAL 36 HOUR)
      WHERE v.is_active = TRUE
        AND v.created_at >= DATE_SUB(NOW(), INTERVAL 36 HOUR)
      GROUP BY v.id, c.id, u.id
      HAVING score > 0
      ORDER BY score DESC, v.created_at DESC
      LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      ranking: videos,
      period: '36h',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// 일간 랭킹 (최근 24시간)
router.get('/daily', async (req, res, next) => {
  try {
    const { limit = 50, date } = req.query;

    // date 파라미터가 있으면 해당 날짜, 없으면 오늘
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const [videos] = await db.query(
      `SELECT
        v.id,
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
        u.avatar_url,
        COUNT(DISTINCT vv.id) as daily_views,
        COUNT(DISTINCT vl.id) as daily_likes,
        COUNT(DISTINCT cl.id) as daily_clouds,
        (COUNT(DISTINCT vv.id) * 1.0 +
         COUNT(DISTINCT vl.id) * 3.0 +
         COUNT(DISTINCT cl.id) * 2.0) as score
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN video_views vv ON v.id = vv.video_id
        AND vv.viewed_at >= ? AND vv.viewed_at <= ?
      LEFT JOIN video_likes vl ON v.id = vl.video_id
        AND vl.created_at >= ? AND vl.created_at <= ?
      LEFT JOIN clouds cl ON v.id = cl.video_id
        AND cl.created_at >= ? AND cl.created_at <= ?
      WHERE v.is_active = TRUE
      GROUP BY v.id, c.id, u.id
      HAVING score > 0
      ORDER BY score DESC, v.created_at DESC
      LIMIT ?`,
      [startOfDay, endOfDay, startOfDay, endOfDay, startOfDay, endOfDay, parseInt(limit)]
    );

    res.json({
      ranking: videos,
      period: 'daily',
      date: startOfDay.toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// 주간 랭킹 (최근 7일)
router.get('/weekly', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const [videos] = await db.query(
      `SELECT
        v.id,
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
        u.avatar_url,
        COUNT(DISTINCT vv.id) as weekly_views,
        COUNT(DISTINCT vl.id) as weekly_likes,
        COUNT(DISTINCT cl.id) as weekly_clouds,
        (COUNT(DISTINCT vv.id) * 1.0 +
         COUNT(DISTINCT vl.id) * 3.0 +
         COUNT(DISTINCT cl.id) * 2.0) as score
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN video_views vv ON v.id = vv.video_id
        AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      LEFT JOIN video_likes vl ON v.id = vl.video_id
        AND vl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      LEFT JOIN clouds cl ON v.id = cl.video_id
        AND cl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      WHERE v.is_active = TRUE
      GROUP BY v.id, c.id, u.id
      HAVING score > 0
      ORDER BY score DESC, v.created_at DESC
      LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      ranking: videos,
      period: 'weekly',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// 월간 랭킹 (최근 30일)
router.get('/monthly', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const [videos] = await db.query(
      `SELECT
        v.id,
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
        u.avatar_url,
        COUNT(DISTINCT vv.id) as monthly_views,
        COUNT(DISTINCT vl.id) as monthly_likes,
        COUNT(DISTINCT cl.id) as monthly_clouds,
        (COUNT(DISTINCT vv.id) * 1.0 +
         COUNT(DISTINCT vl.id) * 3.0 +
         COUNT(DISTINCT cl.id) * 2.0) as score
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN video_views vv ON v.id = vv.video_id
        AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      LEFT JOIN video_likes vl ON v.id = vl.video_id
        AND vl.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      LEFT JOIN clouds cl ON v.id = cl.video_id
        AND cl.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      WHERE v.is_active = TRUE
      GROUP BY v.id, c.id, u.id
      HAVING score > 0
      ORDER BY score DESC, v.created_at DESC
      LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      ranking: videos,
      period: 'monthly',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// 전체기간 랭킹 (조회수 + 좋아요 기준)
router.get('/all-time', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const [videos] = await db.query(
      `SELECT
        v.id,
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
        u.avatar_url,
        (v.view_count * 1.0 + v.like_count * 5.0) as score
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE v.is_active = TRUE
      ORDER BY score DESC, v.created_at DESC
      LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      ranking: videos,
      period: 'all-time',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
