const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// 추천 동영상 (사용자 맞춤형)
router.get('/for-you', optionalAuth, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      // 비로그인 사용자: 인기 동영상 추천
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
          (v.view_count * 0.3 + v.like_count * 2.0) as score
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE v.is_active = TRUE
          AND v.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY score DESC, v.created_at DESC
        LIMIT ?`,
        [parseInt(limit)]
      );

      return res.json({ recommendations: videos, type: 'popular' });
    }

    // 로그인 사용자: 개인화 추천
    // 1. 사용자가 최근 시청한 동영상의 태그 분석
    const [userTags] = await db.query(
      `SELECT DISTINCT t.id, t.tag_name, COUNT(*) as frequency
      FROM video_views vv
      JOIN video_tags vt ON vv.video_id = vt.video_id
      JOIN tags t ON vt.tag_id = t.id
      WHERE vv.user_id = ?
        AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY t.id
      ORDER BY frequency DESC
      LIMIT 10`,
      [userId]
    );

    // 2. 사용자가 구독한 채널의 새 동영상
    const [subscriptionVideos] = await db.query(
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
        'subscription' as reason
      FROM subscriptions s
      JOIN channels c ON s.channel_id = c.id
      JOIN videos v ON c.id = v.channel_id
      JOIN users u ON c.user_id = u.id
      WHERE s.subscriber_id = ?
        AND v.is_active = TRUE
        AND v.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY v.created_at DESC
      LIMIT ?`,
      [userId, Math.ceil(parseInt(limit) / 3)]
    );

    let recommendations = [...subscriptionVideos];

    // 3. 유사한 태그를 가진 동영상 추천
    if (userTags.length > 0) {
      const tagIds = userTags.map(t => t.id);
      const placeholders = tagIds.map(() => '?').join(',');

      const [tagBasedVideos] = await db.query(
        `SELECT DISTINCT
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
          COUNT(DISTINCT vt.tag_id) as tag_match_count,
          'similar_tags' as reason
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        JOIN users u ON c.user_id = u.id
        JOIN video_tags vt ON v.id = vt.video_id
        WHERE vt.tag_id IN (${placeholders})
          AND v.is_active = TRUE
          AND v.id NOT IN (
            SELECT video_id FROM video_views
            WHERE user_id = ? AND viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          )
        GROUP BY v.id, c.id, u.id
        ORDER BY tag_match_count DESC, v.like_count DESC
        LIMIT ?`,
        [...tagIds, userId, Math.ceil(parseInt(limit) / 2)]
      );

      recommendations = [...recommendations, ...tagBasedVideos];
    }

    // 4. 인기 급상승 동영상 (최근 24시간 기준)
    const [trendingVideos] = await db.query(
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
        'trending' as reason
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN video_views vv ON v.id = vv.video_id
        AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      WHERE v.is_active = TRUE
        AND v.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND v.id NOT IN (
          SELECT video_id FROM video_views
          WHERE user_id = ? AND viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        )
      GROUP BY v.id, c.id, u.id
      HAVING recent_views > 0
      ORDER BY recent_views DESC
      LIMIT ?`,
      [userId, Math.ceil(parseInt(limit) / 4)]
    );

    recommendations = [...recommendations, ...trendingVideos];

    // 중복 제거 및 셔플
    const uniqueVideos = recommendations
      .filter((video, index, self) =>
        index === self.findIndex(v => v.id === video.id)
      )
      .slice(0, parseInt(limit));

    res.json({
      recommendations: uniqueVideos,
      type: 'personalized'
    });
  } catch (error) {
    next(error);
  }
});

// 관련 동영상 (특정 동영상 기반)
router.get('/related/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { limit = 20 } = req.query;

    // 해당 동영상의 태그 가져오기
    const [videoTags] = await db.query(
      `SELECT t.id, t.tag_name
      FROM video_tags vt
      JOIN tags t ON vt.tag_id = t.id
      WHERE vt.video_id = ?`,
      [parseInt(videoId)]
    );

    // 해당 동영상의 채널 정보
    const [videoInfo] = await db.query(
      `SELECT channel_id FROM videos WHERE id = ?`,
      [parseInt(videoId)]
    );

    if (videoInfo.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const channelId = videoInfo[0].channel_id;
    let relatedVideos = [];

    // 1. 같은 채널의 다른 동영상
    const [sameChannelVideos] = await db.query(
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
        'same_channel' as reason
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE v.channel_id = ?
        AND v.id != ?
        AND v.is_active = TRUE
      ORDER BY v.created_at DESC
      LIMIT ?`,
      [channelId, parseInt(videoId), Math.ceil(parseInt(limit) / 3)]
    );

    relatedVideos = [...sameChannelVideos];

    // 2. 같은 태그를 가진 동영상
    if (videoTags.length > 0) {
      const tagIds = videoTags.map(t => t.id);
      const placeholders = tagIds.map(() => '?').join(',');

      const [tagSimilarVideos] = await db.query(
        `SELECT DISTINCT
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
          COUNT(DISTINCT vt.tag_id) as tag_match_count,
          'similar_tags' as reason
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        JOIN users u ON c.user_id = u.id
        JOIN video_tags vt ON v.id = vt.video_id
        WHERE vt.tag_id IN (${placeholders})
          AND v.id != ?
          AND v.is_active = TRUE
        GROUP BY v.id, c.id, u.id
        ORDER BY tag_match_count DESC, v.view_count DESC
        LIMIT ?`,
        [...tagIds, parseInt(videoId), Math.ceil(parseInt(limit) * 2 / 3)]
      );

      relatedVideos = [...relatedVideos, ...tagSimilarVideos];
    }

    // 중복 제거 및 정렬
    const uniqueVideos = relatedVideos
      .filter((video, index, self) =>
        index === self.findIndex(v => v.id === video.id)
      )
      .slice(0, parseInt(limit));

    res.json({ related: uniqueVideos });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
