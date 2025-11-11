const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// Get posts by board type
router.get('/:boardType', optionalAuth, async (req, res, next) => {
  try {
    const { boardType } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!['lol', 'free', 'suggestion'].includes(boardType)) {
      return res.status(400).json({ error: 'Invalid board type' });
    }

    const offset = (page - 1) * limit;

    const [posts] = await db.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.board_type = ?
       ORDER BY p.is_pinned DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [boardType, parseInt(limit), parseInt(offset)]
    );

    res.json({ posts, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    next(error);
  }
});

// Get single post
router.get('/post/:id', optionalAuth, async (req, res, next) => {
  try {
    const [posts] = await db.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count
    await db.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ post: posts[0] });
  } catch (error) {
    next(error);
  }
});

// Create post
router.post('/', authMiddleware,
  [
    body('boardType').isIn(['lol', 'free', 'suggestion']),
    body('title').isLength({ min: 1, max: 255 }).trim(),
    body('content').isLength({ min: 1, max: 10000 }).trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { boardType, title, content } = req.body;

      const [result] = await db.query(
        'INSERT INTO posts (user_id, board_type, title, content) VALUES (?, ?, ?, ?)',
        [req.user.id, boardType, title, content]
      );

      res.status(201).json({
        message: 'Post created successfully',
        postId: result.insertId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update post
router.put('/:id', authMiddleware,
  [
    body('title').optional().isLength({ min: 1, max: 255 }).trim(),
    body('content').optional().isLength({ min: 1, max: 10000 }).trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const [posts] = await db.query(
        'SELECT user_id FROM posts WHERE id = ?',
        [req.params.id]
      );

      if (posts.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (posts[0].user_id !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { title, content } = req.body;
      const updates = [];
      const values = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (content !== undefined) {
        updates.push('content = ?');
        values.push(content);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);

      await db.query(
        `UPDATE posts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      res.json({ message: 'Post updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Delete post
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const [posts] = await db.query(
      'SELECT user_id FROM posts WHERE id = ?',
      [req.params.id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (posts[0].user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query('DELETE FROM posts WHERE id = ?', [req.params.id]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Like post
router.post('/:id/like', authMiddleware, async (req, res, next) => {
  try {
    const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [req.params.id]);

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await db.query(
      'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );

    await db.query(
      'UPDATE posts SET like_count = like_count + 1 WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Post liked successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Already liked' });
    }
    next(error);
  }
});

// Unlike post
router.delete('/:id/like', authMiddleware, async (req, res, next) => {
  try {
    const [result] = await db.query(
      'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows > 0) {
      await db.query(
        'UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = ?',
        [req.params.id]
      );
    }

    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    next(error);
  }
});

// Get post comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const [comments] = await db.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.is_flagged = FALSE
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    res.json({ comments });
  } catch (error) {
    next(error);
  }
});

// Create comment
router.post('/:id/comments', authMiddleware,
  [
    body('content').isLength({ min: 1, max: 1000 }).trim(),
    body('parentCommentId').optional().isInt()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { content, parentCommentId } = req.body;

      const [result] = await db.query(
        'INSERT INTO post_comments (post_id, user_id, parent_comment_id, content) VALUES (?, ?, ?, ?)',
        [req.params.id, req.user.id, parentCommentId || null, content]
      );

      // Update post comment count
      await db.query(
        'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?',
        [req.params.id]
      );

      res.status(201).json({
        message: 'Comment created successfully',
        commentId: result.insertId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete comment
router.delete('/comments/:commentId', authMiddleware, async (req, res, next) => {
  try {
    const [comments] = await db.query(
      'SELECT post_id, user_id FROM post_comments WHERE id = ?',
      [req.params.commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comments[0].user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query('DELETE FROM post_comments WHERE id = ?', [req.params.commentId]);

    // Update post comment count
    await db.query(
      'UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ?',
      [comments[0].post_id]
    );

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
