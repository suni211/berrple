const db = require('../config/database');

// Point reward amounts
const POINT_REWARDS = {
  REFERRAL_SIGNUP: 500,           // 친구가 가입하면 500 포인트
  REFERRAL_MILESTONE_5: 1000,     // 5명 달성 보너스
  REFERRAL_MILESTONE_10: 3000,    // 10명 달성 보너스
  DAILY_LOGIN: 10,                // 일일 출석 (향후 구현)
  VIDEO_UPLOAD: 50,               // 영상 업로드 (향후 구현)
  CLOUD_COMMENT: 5,               // 구름 댓글 작성 (향후 구현)
  RECEIVE_LIKE: 1                 // 좋아요 받기 (향후 구현)
};

/**
 * Add points to user account
 */
async function addPoints(userId, amount, source, description, metadata = null) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Get or create user_points record
    let [userPoints] = await connection.query(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    if (userPoints.length === 0) {
      await connection.query(
        'INSERT INTO user_points (user_id, total_points, spent_points) VALUES (?, 0, 0)',
        [userId]
      );
      userPoints = [{ total_points: 0, spent_points: 0 }];
    }

    const currentPoints = userPoints[0];
    const newTotal = currentPoints.total_points + amount;
    const balanceAfter = newTotal - currentPoints.spent_points;

    // Update total points
    await connection.query(
      'UPDATE user_points SET total_points = total_points + ? WHERE user_id = ?',
      [amount, userId]
    );

    // Record transaction
    await connection.query(
      `INSERT INTO point_transactions (user_id, amount, transaction_type, source, description, metadata, balance_after)
       VALUES (?, ?, 'earn', ?, ?, ?, ?)`,
      [userId, amount, source, description, JSON.stringify(metadata || {}), balanceAfter]
    );

    await connection.commit();
    return { success: true, newBalance: balanceAfter };
  } catch (error) {
    await connection.rollback();
    console.error('Error adding points:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Spend points from user account
 */
async function spendPoints(userId, amount, source, description, metadata = null) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Get current points
    const [userPoints] = await connection.query(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );

    if (userPoints.length === 0) {
      throw new Error('User points record not found');
    }

    const currentPoints = userPoints[0];
    const availablePoints = currentPoints.total_points - currentPoints.spent_points;

    if (availablePoints < amount) {
      throw new Error('Insufficient points');
    }

    const newSpent = currentPoints.spent_points + amount;
    const balanceAfter = currentPoints.total_points - newSpent;

    // Update spent points
    await connection.query(
      'UPDATE user_points SET spent_points = spent_points + ? WHERE user_id = ?',
      [amount, userId]
    );

    // Record transaction
    await connection.query(
      `INSERT INTO point_transactions (user_id, amount, transaction_type, source, description, metadata, balance_after)
       VALUES (?, ?, 'spend', ?, ?, ?, ?)`,
      [userId, amount, source, description, JSON.stringify(metadata || {}), balanceAfter]
    );

    await connection.commit();
    return { success: true, newBalance: balanceAfter };
  } catch (error) {
    await connection.rollback();
    console.error('Error spending points:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get user points balance
 */
async function getUserPoints(userId) {
  const [result] = await db.query(
    'SELECT total_points, spent_points, available_points FROM user_points WHERE user_id = ?',
    [userId]
  );

  if (result.length === 0) {
    return { total: 0, spent: 0, available: 0 };
  }

  return {
    total: result[0].total_points,
    spent: result[0].spent_points,
    available: result[0].available_points
  };
}

/**
 * Get user transaction history
 */
async function getTransactionHistory(userId, limit = 50, offset = 0) {
  const [transactions] = await db.query(
    `SELECT * FROM point_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return transactions;
}

/**
 * Award points for referral signup
 */
async function awardReferralPoints(referrerId, referredUserId, referralCode) {
  return await addPoints(
    referrerId,
    POINT_REWARDS.REFERRAL_SIGNUP,
    'referral',
    `친구 초대 완료 (코드: ${referralCode})`,
    { referred_user_id: referredUserId, referral_code: referralCode }
  );
}

/**
 * Award points for referral milestone
 */
async function awardMilestonePoints(userId, milestoneCount) {
  const pointAmount = POINT_REWARDS[`REFERRAL_MILESTONE_${milestoneCount}`];

  if (!pointAmount) {
    return { success: false, message: 'Invalid milestone' };
  }

  return await addPoints(
    userId,
    pointAmount,
    'milestone',
    `${milestoneCount}명 초대 달성 보너스`,
    { milestone: milestoneCount }
  );
}

/**
 * Purchase item from shop
 */
async function purchaseShopItem(userId, shopItemId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Get shop item details
    const [items] = await connection.query(
      'SELECT * FROM shop_items WHERE id = ? AND is_active = TRUE',
      [shopItemId]
    );

    if (items.length === 0) {
      throw new Error('Shop item not found or inactive');
    }

    const item = items[0];

    // Check if user already owns this item (for permanent items)
    if (item.is_permanent) {
      const [existing] = await connection.query(
        'SELECT id FROM user_inventory WHERE user_id = ? AND shop_item_id = ?',
        [userId, shopItemId]
      );

      if (existing.length > 0) {
        throw new Error('You already own this item');
      }
    }

    // Spend points
    await spendPoints(
      userId,
      item.price,
      'shop_purchase',
      `구매: ${item.item_name}`,
      { shop_item_id: shopItemId, item_type: item.item_type }
    );

    // Add to inventory
    const expiresAt = item.duration_days
      ? new Date(Date.now() + item.duration_days * 24 * 60 * 60 * 1000)
      : null;

    await connection.query(
      'INSERT INTO user_inventory (user_id, shop_item_id, expires_at) VALUES (?, ?, ?)',
      [userId, shopItemId, expiresAt]
    );

    await connection.commit();
    return { success: true, item };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get user inventory
 */
async function getUserInventory(userId) {
  const [inventory] = await db.query(
    `SELECT ui.*, si.*
     FROM user_inventory ui
     JOIN shop_items si ON ui.shop_item_id = si.id
     WHERE ui.user_id = ? AND ui.is_active = TRUE
     AND (ui.expires_at IS NULL OR ui.expires_at > NOW())
     ORDER BY ui.purchased_at DESC`,
    [userId]
  );

  return inventory;
}

/**
 * Equip customization item
 */
async function equipItem(userId, itemType, itemValue) {
  const columnMap = {
    'nickname_color': 'nickname_color',
    'badge': 'active_badge_id',
    'title': 'active_title',
    'profile_theme': 'profile_theme_id'
  };

  const column = columnMap[itemType];
  if (!column) {
    throw new Error('Invalid item type');
  }

  await db.query(
    `UPDATE user_customization SET ${column} = ? WHERE user_id = ?`,
    [itemValue, userId]
  );

  return { success: true };
}

/**
 * Get user customization
 */
async function getUserCustomization(userId) {
  const [result] = await db.query(
    'SELECT * FROM user_customization WHERE user_id = ?',
    [userId]
  );

  if (result.length === 0) {
    // Create default customization
    await db.query(
      'INSERT INTO user_customization (user_id) VALUES (?)',
      [userId]
    );
    return {
      nickname_color: null,
      active_badge_id: null,
      active_title: null,
      profile_theme_id: null
    };
  }

  return result[0];
}

module.exports = {
  POINT_REWARDS,
  addPoints,
  spendPoints,
  getUserPoints,
  getTransactionHistory,
  awardReferralPoints,
  awardMilestonePoints,
  purchaseShopItem,
  getUserInventory,
  equipItem,
  getUserCustomization
};
