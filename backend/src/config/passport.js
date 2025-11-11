const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, users[0]);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL || 'https://berrple.com'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        const [existingUsers] = await db.query(
          'SELECT * FROM users WHERE google_id = ?',
          [profile.id]
        );

        if (existingUsers.length > 0) {
          // User exists, update last login
          await db.query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
            [existingUsers[0].id]
          );
          return done(null, existingUsers[0]);
        }

        // Check if email already exists (user signed up with email/password)
        const [emailUsers] = await db.query(
          'SELECT * FROM users WHERE email = ?',
          [profile.emails[0].value]
        );

        if (emailUsers.length > 0) {
          // Link Google account to existing user
          await db.query(
            'UPDATE users SET google_id = ?, last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
            [profile.id, emailUsers[0].id]
          );
          return done(null, emailUsers[0]);
        }

        // Create new user
        const username = profile.emails[0].value.split('@')[0] + '_' + uuidv4().substring(0, 8);
        const displayName = profile.displayName || profile.emails[0].value.split('@')[0];
        const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        const [result] = await db.query(
          `INSERT INTO users (email, username, display_name, avatar_url, google_id, is_verified, last_login_at)
           VALUES (?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)`,
          [profile.emails[0].value, username, displayName, avatarUrl, profile.id]
        );

        const [newUsers] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
        done(null, newUsers[0]);
      } catch (error) {
        console.error('Google OAuth error:', error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;
