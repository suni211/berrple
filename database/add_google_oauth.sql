-- Add Google OAuth support to users table
USE berrple;

-- Add google_id column for OAuth users
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) UNIQUE AFTER email,
ADD INDEX idx_google_id (google_id);

-- Make password_hash nullable (Google OAuth users won't have a password)
ALTER TABLE users
MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Update existing users to ensure they have non-null passwords
-- (This is just a safety check, existing users should already have passwords)
