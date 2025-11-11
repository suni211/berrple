-- ======================================
-- Berrple 관리자 계정 생성 스크립트
-- ======================================
--
-- 관리자 계정 정보:
-- - 아이디: ataturk324
-- - 이메일: loyalmontic@gmail.com
-- - 비밀번호: ss092888!
-- - 표시 이름: 관리자
--
-- 실행 방법:
-- mysql -u root -p berrple < create_admin.sql
--
-- ⚠️ 보안 주의사항:
-- 1. 계정 생성 후 반드시 비밀번호를 변경하세요
-- 2. 이 파일은 실행 후 안전한 곳에 보관하거나 삭제하세요
-- ======================================

USE berrple;

-- 기존 ataturk324 계정이 있으면 삭제 (선택사항)
-- DELETE FROM users WHERE username = 'ataturk324';

-- 관리자 계정 생성
INSERT INTO users (
    email,
    username,
    password_hash,
    display_name,
    is_admin,
    is_verified,
    bio,
    created_at,
    updated_at
) VALUES (
    'loyalmontic@gmail.com',
    'ataturk324',
    '$2b$10$R6mLwsUBBuH1pJocSfxsfeO1NASqZlk5eriBoeIE0eQLzrpJ1m40e',  -- 비밀번호: ss092888!
    '관리자',
    1,  -- is_admin = true
    1,  -- is_verified = true
    'Berrple 시스템 관리자',
    NOW(),
    NOW()
);

-- 관리자 채널 생성
INSERT INTO channels (
    user_id,
    channel_name,
    channel_handle,
    description,
    created_at,
    updated_at
) VALUES (
    LAST_INSERT_ID(),
    'Berrple 공식',
    'ataturk324',
    'Berrple 공식 채널입니다. 공지사항과 업데이트 소식을 확인하세요.',
    NOW(),
    NOW()
);

-- 생성된 관리자 계정 확인
SELECT
    id,
    username,
    email,
    display_name,
    is_admin,
    is_verified,
    created_at
FROM users
WHERE username = 'ataturk324';

-- 완료 메시지
SELECT '관리자 계정이 성공적으로 생성되었습니다.' AS message;
SELECT '로그인 정보 - 아이디: ataturk324, 비밀번호: ss092888!' AS login_info;
SELECT '⚠️ 보안을 위해 로그인 후 반드시 비밀번호를 변경하세요!' AS security_warning;
