const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

// 추천 코드 생성 함수
function generateReferralCode(username) {
  const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${username.substring(0, 4).toUpperCase()}_${randomStr}`;
}

// 내 추천 코드 가져오기 또는 생성
router.get('/my-code', authMiddleware, async (req, res, next) => {
  try {
    // 기존 코드 확인
    let [codes] = await db.query(
      'SELECT * FROM referral_codes WHERE user_id = ?',
      [req.user.id]
    );

    // 코드가 없으면 생성
    if (codes.length === 0) {
      const [user] = await db.query('SELECT username FROM users WHERE id = ?', [req.user.id]);

      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      let code;
      let codeExists = true;

      // 중복되지 않는 코드 생성
      while (codeExists) {
        code = generateReferralCode(user[0].username);
        const [existing] = await db.query('SELECT id FROM referral_codes WHERE code = ?', [code]);
        codeExists = existing.length > 0;
      }

      await db.query(
        'INSERT INTO referral_codes (user_id, code) VALUES (?, ?)',
        [req.user.id, code]
      );

      [codes] = await db.query(
        'SELECT * FROM referral_codes WHERE user_id = ?',
        [req.user.id]
      );
    }

    const referralCode = codes[0];

    // 추천한 사람들 목록
    const [referredUsers] = await db.query(
      `SELECT u.id, u.username, u.display_name, u.created_at, r.status
       FROM referrals r
       JOIN users u ON r.referred_user_id = u.id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    // 보상 내역
    const [rewards] = await db.query(
      `SELECT * FROM referral_rewards
       WHERE user_id = ?
       ORDER BY reward_milestone ASC`,
      [req.user.id]
    );

    res.json({
      code: referralCode.code,
      referralCount: referralCode.referral_count,
      referredUsers,
      rewards,
      milestones: [
        { count: 5, reached: referralCode.referral_count >= 5 },
        { count: 10, reached: referralCode.referral_count >= 10 },
        { count: 20, reached: referralCode.referral_count >= 20 }
      ]
    });
  } catch (error) {
    next(error);
  }
});

// 추천 코드로 사용자 검증
router.get('/validate/:code', async (req, res, next) => {
  try {
    const [codes] = await db.query(
      `SELECT rc.*, u.username, u.display_name
       FROM referral_codes rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.code = ?`,
      [req.params.code]
    );

    if (codes.length === 0) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    res.json({
      valid: true,
      referrer: {
        username: codes[0].username,
        displayName: codes[0].display_name
      }
    });
  } catch (error) {
    next(error);
  }
});

// 추천 통계 (관리자용)
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    // 관리자만 접근 가능
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [totalReferrals] = await db.query(
      'SELECT COUNT(*) as total FROM referrals'
    );

    const [topReferrers] = await db.query(
      `SELECT u.id, u.username, u.display_name, u.email, rc.code, rc.referral_count
       FROM referral_codes rc
       JOIN users u ON rc.user_id = u.id
       ORDER BY rc.referral_count DESC
       LIMIT 20`
    );

    const [pendingRewards] = await db.query(
      `SELECT rr.*, u.username, u.display_name, u.email
       FROM referral_rewards rr
       JOIN users u ON rr.user_id = u.id
       WHERE rr.reward_status = 'notified'
       ORDER BY rr.created_at DESC`
    );

    res.json({
      totalReferrals: totalReferrals[0].total,
      topReferrers,
      pendingRewards
    });
  } catch (error) {
    next(error);
  }
});

// 보상 상태 업데이트 (관리자용)
router.put('/rewards/:rewardId/status', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, adminNotes } = req.body;

    if (!['pending', 'notified', 'sent'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateFields = ['reward_status = ?'];
    const values = [status];

    if (status === 'sent') {
      updateFields.push('reward_sent_at = NOW()');
    }

    if (adminNotes) {
      updateFields.push('admin_notes = ?');
      values.push(adminNotes);
    }

    values.push(req.params.rewardId);

    await db.query(
      `UPDATE referral_rewards SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    res.json({ message: 'Reward status updated successfully' });
  } catch (error) {
    next(error);
  }
});

// 추천 리더보드 (공개)
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const [topReferrers] = await db.query(
      `SELECT u.username, u.display_name, u.avatar_url, rc.referral_count
       FROM referral_codes rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.referral_count > 0
       ORDER BY rc.referral_count DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ leaderboard: topReferrers });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
