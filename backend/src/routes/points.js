const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const {
  getUserPoints,
  getTransactionHistory,
  purchaseShopItem,
  getUserInventory,
  equipItem,
  getUserCustomization
} = require('../utils/pointsManager');

// Get user points balance
router.get('/balance', authMiddleware, async (req, res, next) => {
  try {
    const points = await getUserPoints(req.user.id);
    res.json(points);
  } catch (error) {
    next(error);
  }
});

// Get transaction history
router.get('/transactions', authMiddleware, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const transactions = await getTransactionHistory(req.user.id, limit, offset);
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

// Get shop items
router.get('/shop', async (req, res, next) => {
  try {
    const itemType = req.query.type;

    let query = 'SELECT * FROM shop_items WHERE is_active = TRUE';
    const params = [];

    if (itemType) {
      query += ' AND item_type = ?';
      params.push(itemType);
    }

    query += ' ORDER BY sort_order ASC, price ASC';

    const [items] = await db.query(query, params);

    // Group by type
    const groupedItems = items.reduce((acc, item) => {
      if (!acc[item.item_type]) {
        acc[item.item_type] = [];
      }
      acc[item.item_type].push(item);
      return acc;
    }, {});

    res.json({
      items,
      grouped: groupedItems
    });
  } catch (error) {
    next(error);
  }
});

// Get user inventory
router.get('/inventory', authMiddleware, async (req, res, next) => {
  try {
    const inventory = await getUserInventory(req.user.id);
    res.json({ inventory });
  } catch (error) {
    next(error);
  }
});

// Purchase item
router.post('/purchase/:itemId', authMiddleware, async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const result = await purchaseShopItem(req.user.id, itemId);

    res.json({
      message: 'Purchase successful',
      item: result.item
    });
  } catch (error) {
    if (error.message === 'Insufficient points') {
      return res.status(400).json({ error: '포인트가 부족합니다.' });
    }
    if (error.message === 'You already own this item') {
      return res.status(400).json({ error: '이미 보유한 아이템입니다.' });
    }
    if (error.message === 'Shop item not found or inactive') {
      return res.status(404).json({ error: '아이템을 찾을 수 없습니다.' });
    }
    next(error);
  }
});

// Get user customization
router.get('/customization', authMiddleware, async (req, res, next) => {
  try {
    const customization = await getUserCustomization(req.user.id);

    // Get badge details if badge is equipped
    if (customization.active_badge_id) {
      const [badge] = await db.query(
        'SELECT * FROM shop_items WHERE id = ?',
        [customization.active_badge_id]
      );
      customization.badge_details = badge[0] || null;
    }

    res.json(customization);
  } catch (error) {
    next(error);
  }
});

// Equip item
router.post('/equip', authMiddleware, async (req, res, next) => {
  try {
    const { itemType, itemId } = req.body;

    if (!itemType) {
      return res.status(400).json({ error: 'Item type is required' });
    }

    // Verify user owns the item
    if (itemId) {
      const [owned] = await db.query(
        `SELECT ui.* FROM user_inventory ui
         JOIN shop_items si ON ui.shop_item_id = si.id
         WHERE ui.user_id = ? AND si.id = ? AND ui.is_active = TRUE
         AND si.item_type = ?
         AND (ui.expires_at IS NULL OR ui.expires_at > NOW())`,
        [req.user.id, itemId, itemType]
      );

      if (owned.length === 0) {
        return res.status(403).json({ error: '이 아이템을 보유하고 있지 않습니다.' });
      }
    }

    // Get item value based on type
    let itemValue = null;
    if (itemId) {
      const [item] = await db.query('SELECT * FROM shop_items WHERE id = ?', [itemId]);
      if (item.length > 0) {
        if (itemType === 'nickname_color') {
          itemValue = item[0].color_code;
        } else if (itemType === 'badge') {
          itemValue = itemId;
        } else if (itemType === 'title') {
          itemValue = item[0].item_name;
        }
      }
    }

    await equipItem(req.user.id, itemType, itemValue);

    res.json({
      message: 'Item equipped successfully',
      itemType,
      itemValue
    });
  } catch (error) {
    next(error);
  }
});

// Unequip item
router.post('/unequip', authMiddleware, async (req, res, next) => {
  try {
    const { itemType } = req.body;

    if (!itemType) {
      return res.status(400).json({ error: 'Item type is required' });
    }

    await equipItem(req.user.id, itemType, null);

    res.json({
      message: 'Item unequipped successfully',
      itemType
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Give points to user
router.post('/admin/give', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, amount, description } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'User ID and amount are required' });
    }

    const { addPoints } = require('../utils/pointsManager');
    await addPoints(userId, amount, 'admin_grant', description || 'Admin grant', {
      admin_id: req.user.id
    });

    res.json({ message: 'Points granted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get points leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const [leaderboard] = await db.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              up.available_points, up.total_points
       FROM user_points up
       JOIN users u ON up.user_id = u.id
       WHERE up.available_points > 0
       ORDER BY up.available_points DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
