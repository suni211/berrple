const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const passport = require('../config/passport');

// Register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('password').isLength({ min: 6 }),
    body('displayName').optional().isLength({ max: 100 }).trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, username, password, displayName } = req.body;

      // Check if user exists
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const [result] = await db.query(
        'INSERT INTO users (email, username, password_hash, display_name) VALUES (?, ?, ?, ?)',
        [email, username, passwordHash, displayName || username]
      );

      // Create default channel for user
      await db.query(
        'INSERT INTO channels (user_id, channel_name, channel_handle) VALUES (?, ?, ?)',
        [result.insertId, displayName || username, username]
      );

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

      // Update last login
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

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

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res, next) => {
    try {
      // Generate JWT token for the authenticated user
      const token = jwt.sign(
        { userId: req.user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Create default channel if doesn't exist
      const [channels] = await db.query(
        'SELECT id FROM channels WHERE user_id = ?',
        [req.user.id]
      );

      if (channels.length === 0) {
        await db.query(
          'INSERT INTO channels (user_id, channel_name, channel_handle) VALUES (?, ?, ?)',
          [req.user.id, req.user.display_name, req.user.username]
        );
      }

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL || 'https://berrple.com'}/auth/callback?token=${token}`);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
