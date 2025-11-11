USE berrple;
DROP TABLE IF EXISTS video_views;
DROP TABLE IF EXISTS cloud_likes;
DROP TABLE IF EXISTS clouds;
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS video_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS videos;
DROP TABLE IF EXISTS channel_subscribers;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Channels Table
CREATE TABLE channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    channel_handle VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    banner_url VARCHAR(500),
    avatar_url VARCHAR(500),
    subscriber_count INT DEFAULT 0,
    video_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_channel_handle (channel_handle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Channel Subscribers Table
CREATE TABLE channel_subscribers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id INT NOT NULL,
    user_id INT NOT NULL,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subscription (channel_id, user_id),
    INDEX idx_channel_id (channel_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Videos Table (supports both YouTube and self-uploaded)
CREATE TABLE videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id INT NOT NULL,
    video_type ENUM('youtube', 'upload') NOT NULL,
    youtube_video_id VARCHAR(20) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    duration INT, -- in seconds
    video_url VARCHAR(500), -- for uploaded videos (Cloudflare R2)
    video_file_size BIGINT, -- in bytes
    view_count INT DEFAULT 0,
    cloud_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    allow_clouds BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    INDEX idx_channel_id (channel_id),
    INDEX idx_video_type (video_type),
    INDEX idx_youtube_video_id (youtube_video_id),
    INDEX idx_created_at (created_at),
    INDEX idx_view_count (view_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tags Table
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_name VARCHAR(50) UNIQUE NOT NULL,
    tag_type ENUM('manual', 'auto') DEFAULT 'manual',
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tag_name (tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Video Tags (Many-to-Many relationship)
CREATE TABLE video_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_video_tag (video_id, tag_id),
    INDEX idx_video_id (video_id),
    INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clouds Table (Comments on videos with timing and position)
CREATE TABLE clouds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    timestamp_sec DECIMAL(10,2) NOT NULL, -- video timestamp in seconds
    position_x INT, -- X position on video (0-100%)
    position_y INT, -- Y position on video (0-100%)
    is_random_position BOOLEAN DEFAULT FALSE,
    duration INT DEFAULT 3, -- display duration in seconds (2-5)
    color VARCHAR(7) DEFAULT '#00FF80', -- text color
    like_count INT DEFAULT 0,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp_sec)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cloud Likes Table
CREATE TABLE cloud_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cloud_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cloud_id) REFERENCES clouds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cloud_like (cloud_id, user_id),
    INDEX idx_cloud_id (cloud_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Video Views Table
CREATE TABLE video_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id INT NOT NULL,
    user_id INT NULL, -- NULL for anonymous views
    ip_address VARCHAR(45),
    user_agent TEXT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_video_id (video_id),
    INDEX idx_viewed_at (viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Posts Table (for boards: lol, free, suggestions)
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    board_type ENUM('lol', 'free', 'suggestion') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_board_type (board_type),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Post Comments Table
CREATE TABLE post_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_comment_id INT NULL, -- for nested comments
    content TEXT NOT NULL,
    like_count INT DEFAULT 0,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_comment_id (parent_comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Post Likes Table
CREATE TABLE post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_post_like (post_id, user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default data
INSERT INTO tags (tag_name, tag_type) VALUES
    ('게임', 'manual'),
    ('음악', 'manual'),
    ('스포츠', 'manual'),
    ('교육', 'manual'),
    ('엔터테인먼트', 'manual'),
    ('리그오브레전드', 'manual'),
    ('롤', 'manual'),
    ('하이라이트', 'manual'),
    ('튜토리얼', 'manual'),
    ('리뷰', 'manual');
