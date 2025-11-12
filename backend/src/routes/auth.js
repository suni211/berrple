const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { sendReferralRewardEmail, sendAdminNotificationEmail } = require('../utils/email');
const { validateIpForRegistration, logIpRegistration, getClientIp, canReceiveReferrals } = require('../utils/ipValidator');
const { awardReferralPoints, awardMilestonePoints } = require('../utils/pointsManager');

// Register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('password').isLength({ min: 6 }),
    body('displayName').optional().isLength({ max: 100 }).trim(),
    body('referralCode').optional().isLength({ max: 20 }).trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, username, password, displayName, referralCode } = req.body;

      // Validate IP for registration (VPN/Proxy/Multi-account detection)
      const ipValidation = await validateIpForRegistration(req);
      if (!ipValidation.valid) {
        return res.status(403).json({ error: ipValidation.reason });
      }

      const clientIp = ipValidation.ip;

      // Check if user exists
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Validate referral code if provided
      let referrerId = null;
      if (referralCode) {
        const [referralCodes] = await db.query(
          'SELECT user_id FROM referral_codes WHERE code = ?',
          [referralCode]
        );

        if (referralCodes.length > 0) {
          referrerId = referralCodes[0].user_id;

          // Check if referrer can still receive referrals (max 10)
          const canReceive = await canReceiveReferrals(referrerId);
          if (!canReceive.allowed) {
            return res.status(400).json({
              error: '이 추천 코드는 최대 추천 인원에 도달했습니다.'
            });
          }
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with IP tracking
      const [result] = await db.query(
        'INSERT INTO users (email, username, password_hash, display_name, referred_by_code, registration_ip, last_login_ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, username, passwordHash, displayName || username, referralCode || null, clientIp, clientIp]
      );

      // Log IP registration for tracking
      await logIpRegistration(clientIp, result.insertId);

      // Create default channel for user
      await db.query(
        'INSERT INTO channels (user_id, channel_name, channel_handle) VALUES (?, ?, ?)',
        [result.insertId, displayName || username, username]
      );

      // Process referral if valid
      if (referrerId) {
        await db.query(
          'INSERT INTO referrals (referrer_id, referred_user_id, referral_code, status, registration_ip) VALUES (?, ?, ?, ?, ?)',
          [referrerId, result.insertId, referralCode, 'completed', clientIp]
        );

        // Update referral count
        await db.query(
          'UPDATE referral_codes SET referral_count = referral_count + 1, updated_at = NOW() WHERE user_id = ?',
          [referrerId]
        );

        // Award points for referral signup (500 points)
        try {
          await awardReferralPoints(referrerId, result.insertId, referralCode);
        } catch (error) {
          console.error('Error awarding referral points:', error);
        }

        // Check for milestone rewards
        const [updatedCode] = await db.query(
          'SELECT referral_count FROM referral_codes WHERE user_id = ?',
          [referrerId]
        );

        const count = updatedCode[0].referral_count;
        const milestones = [5, 10]; // Only 5 and 10 person milestones

        // Check if user just reached a milestone
        if (milestones.includes(count)) {
          // Check if reward already exists
          const [existingReward] = await db.query(
            'SELECT id FROM referral_rewards WHERE user_id = ? AND reward_milestone = ?',
            [referrerId, count]
          );

          if (existingReward.length === 0) {
            // Create new reward
            await db.query(
              'INSERT INTO referral_rewards (user_id, reward_milestone, reward_status, notification_sent_at) VALUES (?, ?, ?, NOW())',
              [referrerId, count, 'notified']
            );

            // Award milestone bonus points
            try {
              await awardMilestonePoints(referrerId, count);
            } catch (error) {
              console.error('Error awarding milestone points:', error);
            }

            // Send email notification to referrer
            const [referrerUser] = await db.query(
              'SELECT email, username FROM users WHERE id = ?',
              [referrerId]
            );

            if (referrerUser.length > 0) {
              // 사용자에게 보상 알림 이메일 발송
              await sendReferralRewardEmail(
                referrerUser[0].email,
                referrerUser[0].username,
                count
              );

              // 관리자에게 알림 이메일 발송
              await sendAdminNotificationEmail(
                referrerUser[0].email,
                referrerUser[0].username,
                count
              );
            }
          }
        }
      }

      // Generate token
      const token = jwt.sign(
        { userId: result.insertId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: result.insertId,
          email,
          username,
          displayName: displayName || username,
          isAdmin: 0,
          is_admin: 0,
          is_verified: 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post('/login',
  [
    body('username').notEmpty().trim(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Find user
      const [users] = await db.query(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login with IP
      const loginIp = getClientIp(req);
      await db.query('UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?', [loginIp, user.id]);

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          isAdmin: user.is_admin,
          is_admin: user.is_admin,
          is_verified: user.is_verified
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, email, username, display_name, avatar_url, bio, is_verified, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    next(error);
  }
});

// Logout (client-side token removal, but we can blacklist tokens if needed)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
