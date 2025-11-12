USE berrple;

-- Add IP tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45) NULL;
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_registration_ip (registration_ip);

-- Add IP tracking to referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45) NULL;

-- Update referral_codes to have max 10 referrals
-- We'll handle this in application logic

-- Table to track known VPN/Proxy IPs (can be populated with known VPN IP ranges)
CREATE TABLE IF NOT EXISTS blocked_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    ip_type ENUM('vpn', 'proxy', 'datacenter', 'abuse') DEFAULT 'vpn',
    reason TEXT,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_ip (ip_address),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to track suspicious activity
CREATE TABLE IF NOT EXISTS ip_registration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    user_id INT NULL,
    registration_count INT DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_flagged BOOLEAN DEFAULT FALSE,
    INDEX idx_ip_address (ip_address),
    INDEX idx_flagged (is_flagged)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
