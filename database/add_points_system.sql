USE berrple;

-- Points System Table
CREATE TABLE IF NOT EXISTS user_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_points INT DEFAULT 0,
    spent_points INT DEFAULT 0,
    available_points INT GENERATED ALWAYS AS (total_points - spent_points) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_points (user_id),
    INDEX idx_available_points (available_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Points Transaction History
CREATE TABLE IF NOT EXISTS point_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    transaction_type ENUM('earn', 'spend', 'refund') NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'referral', 'daily', 'upload', 'comment', 'purchase', etc.
    description TEXT,
    metadata JSON, -- Additional info like item_id, referral_id, etc.
    balance_after INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_transactions (user_id, created_at),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shop Items (포인트로 구매할 수 있는 아이템들)
CREATE TABLE IF NOT EXISTS shop_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_type ENUM('badge', 'nickname_color', 'cloud_color', 'cloud_sticker', 'profile_theme', 'title') NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_description TEXT,
    price INT NOT NULL,
    is_permanent BOOLEAN DEFAULT TRUE, -- 영구 아이템인지, 기간제인지
    duration_days INT DEFAULT NULL, -- 기간제인 경우 일수
    icon_url VARCHAR(255),
    color_code VARCHAR(20), -- 색상 아이템의 경우
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_item_type (item_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Inventory (구매한 아이템)
CREATE TABLE IF NOT EXISTS user_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    shop_item_id INT NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- 기간제 아이템의 만료일
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shop_item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
    INDEX idx_user_items (user_id, is_active),
    INDEX idx_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Profile Customization (현재 착용 중인 아이템)
CREATE TABLE IF NOT EXISTS user_customization (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nickname_color VARCHAR(20) DEFAULT NULL,
    active_badge_id INT DEFAULT NULL,
    active_title VARCHAR(100) DEFAULT NULL,
    profile_theme_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_customization (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add columns to clouds table for customization
ALTER TABLE clouds
ADD COLUMN IF NOT EXISTS color_code VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sticker_id INT DEFAULT NULL;

-- Add index only if it doesn't exist
SET @index_exists = (
    SELECT COUNT(1)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'berrple'
    AND TABLE_NAME = 'clouds'
    AND INDEX_NAME = 'idx_color'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE clouds ADD INDEX idx_color (color_code)',
    'SELECT "Index idx_color already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert default shop items (without emojis in icon_url to avoid encoding issues)
INSERT INTO shop_items (item_type, item_name, item_description, price, is_permanent, icon_url, color_code) VALUES
-- 닉네임 색상
('nickname_color', '빨강 닉네임', '닉네임을 빨간색으로 변경', 300, TRUE, 'red', '#ef4444'),
('nickname_color', '파랑 닉네임', '닉네임을 파란색으로 변경', 300, TRUE, 'blue', '#3b82f6'),
('nickname_color', '보라 닉네임', '닉네임을 보라색으로 변경', 500, TRUE, 'purple', '#a855f7'),
('nickname_color', '금색 닉네임', '닉네임을 금색으로 변경', 800, TRUE, 'gold', '#fbbf24'),
('nickname_color', '무지개 닉네임', '닉네임에 무지개 그라디언트 효과', 1500, TRUE, 'rainbow', 'rainbow'),

-- 프로필 뱃지
('badge', '초보 뱃지', '새싹 아이콘', 100, TRUE, 'seedling', NULL),
('badge', '별 뱃지', '반짝이는 별 아이콘', 300, TRUE, 'star', NULL),
('badge', '왕관 뱃지', '왕관 아이콘', 500, TRUE, 'crown', NULL),
('badge', '불 뱃지', '불꽃 아이콘', 500, TRUE, 'fire', NULL),
('badge', '하트 뱃지', '하트 아이콘', 400, TRUE, 'heart', NULL),
('badge', '다이아 뱃지', '다이아몬드 아이콘', 1000, TRUE, 'diamond', NULL),

-- 구름 댓글 색상
('cloud_color', '분홍 구름', '구름 댓글을 분홍색으로', 200, FALSE, 'pink', '#fecdd3'),
('cloud_color', '하늘색 구름', '구름 댓글을 하늘색으로', 200, FALSE, 'sky', '#bfdbfe'),
('cloud_color', '민트 구름', '구름 댓글을 민트색으로', 200, FALSE, 'mint', '#a7f3d0'),
('cloud_color', '노랑 구름', '구름 댓글을 노란색으로', 200, FALSE, 'yellow', '#fef08a'),
('cloud_color', '금색 구름', '구름 댓글을 금색으로', 500, FALSE, 'gold', '#fbbf24'),
('cloud_color', '무지개 구름', '구름 댓글에 무지개 효과', 800, FALSE, 'rainbow', 'rainbow'),

-- 칭호
('title', '초대왕', '친구 10명 초대 달성 칭호', 1000, TRUE, 'king', NULL),
('title', '베타 테스터', '초기 사용자 칭호', 500, TRUE, 'beta', NULL),
('title', 'VIP', 'VIP 회원 칭호', 2000, TRUE, 'vip', NULL),
('title', '구름 마스터', '구름 댓글 전문가', 1500, TRUE, 'cloud', NULL);

-- Update referral rewards to give points instead of gifts
UPDATE referral_rewards SET admin_notes = 'Points will be awarded automatically' WHERE admin_notes IS NULL;

-- Create trigger to initialize user_points when user is created
DELIMITER //
CREATE TRIGGER IF NOT EXISTS init_user_points AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_points (user_id, total_points, spent_points)
    VALUES (NEW.id, 0, 0);

    INSERT INTO user_customization (user_id)
    VALUES (NEW.id);
END//
DELIMITER ;

-- Initialize points for existing users
INSERT IGNORE INTO user_points (user_id, total_points, spent_points)
SELECT id, 0, 0 FROM users;

INSERT IGNORE INTO user_customization (user_id)
SELECT id FROM users;
