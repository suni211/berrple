const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const channelRoutes = require('./routes/channels');
const videoRoutes = require('./routes/videos');
const cloudRoutes = require('./routes/clouds');
const postRoutes = require('./routes/posts');
const tagRoutes = require('./routes/tags');
const uploadRoutes = require('./routes/upload');
const youtubeRoutes = require('./routes/youtube');
const bookmarkRoutes = require('./routes/bookmarks');
const likeRoutes = require('./routes/likes');
const reportRoutes = require('./routes/reports');
const blockRoutes = require('./routes/blocks');
const rankingRoutes = require('./routes/rankings');
const searchRoutes = require('./routes/search');
const recommendationRoutes = require('./routes/recommendations');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - needed when behind Nginx reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.youtube.com", "https://www.google.com", "https://pagead2.googlesyndication.com", "https://s.ytimg.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://www.google.com", "https://s.ytimg.com", "https://pagead2.googlesyndication.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://googleads.g.doubleclick.net"],
      connectSrc: ["'self'", "https://www.youtube.com", "https://www.google.com", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:", "https:"],
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/clouds', cloudRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎬 BERRPLE Backend Server                          ║
║                                                       ║
║   Server running on port ${PORT}                      ║
║   Environment: ${process.env.NODE_ENV || 'development'}                       ║
║   Time: ${new Date().toLocaleString()}               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
