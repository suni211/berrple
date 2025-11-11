-- YouTube 영상 구름 지원을 위한 스키마 업데이트

USE berrple;

-- clouds 테이블에 youtube_video_id 컬럼 추가
ALTER TABLE clouds
ADD COLUMN youtube_video_id VARCHAR(20) NULL AFTER video_id;

-- video_id를 NULL 허용으로 변경
ALTER TABLE clouds
MODIFY COLUMN video_id INT NULL;

-- youtube_video_id에 인덱스 추가
ALTER TABLE clouds
ADD INDEX idx_youtube_video_id (youtube_video_id);

-- 기존 외래 키 제약조건을 nullable로 변경하기 위해 제거 후 재생성
ALTER TABLE clouds
DROP FOREIGN KEY clouds_ibfk_1;

ALTER TABLE clouds
ADD CONSTRAINT clouds_ibfk_1
FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;
