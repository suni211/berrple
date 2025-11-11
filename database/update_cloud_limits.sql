-- 구름 제한 시스템 추가

USE berrple;

-- users 테이블에 구름 잔액과 일일 보상 컬럼 추가
ALTER TABLE users
ADD COLUMN cloud_balance INT DEFAULT 10 COMMENT '보유 구름 개수',
ADD COLUMN last_daily_reward DATETIME NULL COMMENT '마지막 일일 보상 받은 시간';

-- 기존 사용자들에게 기본 10개 지급
UPDATE users SET cloud_balance = 10 WHERE cloud_balance IS NULL;

-- 인덱스 추가
ALTER TABLE users
ADD INDEX idx_last_daily_reward (last_daily_reward);
