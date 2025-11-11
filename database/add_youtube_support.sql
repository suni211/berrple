-- Add YouTube video support to clouds table
USE berrple;

-- Add youtube_video_id column
ALTER TABLE clouds
ADD COLUMN youtube_video_id VARCHAR(50) AFTER video_id,
ADD INDEX idx_youtube_video_id (youtube_video_id);

-- Make video_id nullable (since YouTube clouds won't have a DB video_id)
ALTER TABLE clouds
MODIFY COLUMN video_id INT NULL;

-- Drop the foreign key constraint on video_id
ALTER TABLE clouds
DROP FOREIGN KEY clouds_ibfk_1;

-- Add check constraint to ensure either video_id or youtube_video_id is set
-- Note: MySQL 8.0.16+ supports CHECK constraints
ALTER TABLE clouds
ADD CONSTRAINT chk_video_source
CHECK ((video_id IS NOT NULL AND youtube_video_id IS NULL) OR
       (video_id IS NULL AND youtube_video_id IS NOT NULL));
