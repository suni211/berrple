const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 검색 자동완성
router.get('/autocomplete', async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ suggestions: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    const suggestions = [];

    // 동영상 제목 검색
    const [videoResults] = await db.query(
      `SELECT DISTINCT
        v.title,
        'video' as type,
        v.id,
        v.thumbnail_url,
        c.channel_name,
        u.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE v.title LIKE ? AND v.is_active = TRUE
      ORDER BY v.view_count DESC
      LIMIT ?`,
      [searchTerm, Math.ceil(parseInt(limit) / 2)]
    );

    suggestions.push(...videoResults.map(v => ({
      text: v.title,
      type: 'video',
      id: v.id,
      thumbnail: v.thumbnail_url,
      channel: v.channel_name,
      channelAvatar: v.channel_avatar
    })));

    // 채널명 검색
    const [channelResults] = await db.query(
      `SELECT DISTINCT
        c.channel_name,
        'channel' as type,
        c.id,
        u.avatar_url,
        COUNT(DISTINCT v.id) as video_count
      FROM channels c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN videos v ON c.id = v.channel_id AND v.is_active = TRUE
      WHERE c.channel_name LIKE ? OR c.channel_handle LIKE ?
      GROUP BY c.id, u.id
      ORDER BY video_count DESC
      LIMIT ?`,
      [searchTerm, searchTerm, Math.ceil(parseInt(limit) / 4)]
    );

    suggestions.push(...channelResults.map(c => ({
      text: c.channel_name,
      type: 'channel',
      id: c.id,
      avatar: c.avatar_url,
      videoCount: c.video_count
    })));

    // 태그 검색
    const [tagResults] = await db.query(
      `SELECT DISTINCT
        t.tag_name,
        'tag' as type,
        COUNT(DISTINCT vt.video_id) as video_count
      FROM tags t
      JOIN video_tags vt ON t.id = vt.tag_id
      JOIN videos v ON vt.video_id = v.id
      WHERE t.tag_name LIKE ? AND v.is_active = TRUE
      GROUP BY t.id
      ORDER BY video_count DESC
      LIMIT ?`,
      [searchTerm, Math.ceil(parseInt(limit) / 4)]
    );

    suggestions.push(...tagResults.map(t => ({
      text: t.tag_name,
      type: 'tag',
      videoCount: t.video_count
    })));

    // 중복 제거 및 정렬
    const uniqueSuggestions = suggestions
      .filter((item, index, self) =>
        index === self.findIndex(t => t.text === item.text && t.type === item.type)
      )
      .slice(0, parseInt(limit));

    res.json({ suggestions: uniqueSuggestions });
  } catch (error) {
    next(error);
  }
});

// 인기 검색어
router.get('/trending', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // 최근 7일간 가장 많이 조회된 동영상의 제목과 태그
    const [trendingVideos] = await db.query(
      `SELECT
        v.title,
        COUNT(DISTINCT vv.id) as view_count
      FROM videos v
      JOIN video_views vv ON v.id = vv.video_id
      WHERE vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND v.is_active = TRUE
      GROUP BY v.id
      ORDER BY view_count DESC
      LIMIT ?`,
      [Math.ceil(parseInt(limit) / 2)]
    );

    const [trendingTags] = await db.query(
      `SELECT
        t.tag_name,
        COUNT(DISTINCT vv.id) as view_count
      FROM tags t
      JOIN video_tags vt ON t.id = vt.tag_id
      JOIN video_views vv ON vt.video_id = vv.video_id
      WHERE vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY t.id
      ORDER BY view_count DESC
      LIMIT ?`,
      [Math.ceil(parseInt(limit) / 2)]
    );

    const trending = [
      ...trendingVideos.map(v => ({ term: v.title, type: 'video' })),
      ...trendingTags.map(t => ({ term: t.tag_name, type: 'tag' }))
    ].slice(0, parseInt(limit));

    res.json({ trending });
  } catch (error) {
    next(error);
  }
});

// 전체 검색
router.get('/', async (req, res, next) => {
  try {
    const { q, type = 'all', page = 1, limit = 20, sortBy = 'relevance' } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const offset = (page - 1) * limit;
    const searchTerm = `%${q.trim()}%`;
    const results = {};

    // 정렬 기준
    let orderBy = 'v.created_at DESC';
    if (sortBy === 'views') {
      orderBy = 'v.view_count DESC';
    } else if (sortBy === 'likes') {
      orderBy = 'v.like_count DESC';
    } else if (sortBy === 'recent') {
      orderBy = 'v.created_at DESC';
    }

    // 동영상 검색
    if (type === 'all' || type === 'videos') {
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
          u.avatar_url
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE (v.title LIKE ? OR v.description LIKE ?)
          AND v.is_active = TRUE
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
        [searchTerm, searchTerm, parseInt(limit), offset]
      );

      const [videoCount] = await db.query(
        `SELECT COUNT(*) as total
        FROM videos v
        WHERE (v.title LIKE ? OR v.description LIKE ?)
          AND v.is_active = TRUE`,
        [searchTerm, searchTerm]
      );

      results.videos = {
        items: videos,
        total: videoCount[0].total,
        page: parseInt(page),
        limit: parseInt(limit)
      };
    }

    // 채널 검색
    if (type === 'all' || type === 'channels') {
      const [channels] = await db.query(
        `SELECT
          c.id,
          c.channel_name,
          c.channel_handle,
          c.description,
          u.username,
          u.display_name,
          u.avatar_url,
          COUNT(DISTINCT v.id) as video_count,
          COUNT(DISTINCT s.subscriber_id) as subscriber_count
        FROM channels c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN videos v ON c.id = v.channel_id AND v.is_active = TRUE
        LEFT JOIN subscriptions s ON c.id = s.channel_id
        WHERE c.channel_name LIKE ? OR c.channel_handle LIKE ? OR c.description LIKE ?
        GROUP BY c.id, u.id
        ORDER BY subscriber_count DESC
        LIMIT ? OFFSET ?`,
        [searchTerm, searchTerm, searchTerm, parseInt(limit), offset]
      );

      const [channelCount] = await db.query(
        `SELECT COUNT(DISTINCT c.id) as total
        FROM channels c
        WHERE c.channel_name LIKE ? OR c.channel_handle LIKE ? OR c.description LIKE ?`,
        [searchTerm, searchTerm, searchTerm]
      );

      results.channels = {
        items: channels,
        total: channelCount[0].total,
        page: parseInt(page),
        limit: parseInt(limit)
      };
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
