# 관리자 계정 생성 가이드

## 📋 관리자 계정 정보

- **아이디**: `ataturk324`
- **이메일**: `loyalmontic@gmail.com`
- **초기 비밀번호**: `ss092888!`
- **권한**: 시스템 관리자 (is_admin = true)

## 🚀 설치 방법

### 방법 1: SQL 파일로 실행

```bash
# MariaDB/MySQL에 로그인하여 실행
mysql -u root -p berrple < create_admin.sql
```

### 방법 2: MySQL Workbench 사용

1. MySQL Workbench 실행
2. `create_admin.sql` 파일 열기
3. 스크립트 실행 (⚡ 아이콘 클릭 또는 Ctrl+Shift+Enter)

### 방법 3: 명령줄에서 직접 실행

```bash
mysql -u root -p
```

데이터베이스 접속 후:

```sql
USE berrple;

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
    '$2b$10$R6mLwsUBBuH1pJocSfxsfeO1NASqZlk5eriBoeIE0eQLzrpJ1m40e',
    '관리자',
    1,
    1,
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
```

## ✅ 확인 방법

관리자 계정이 제대로 생성되었는지 확인:

```sql
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
```

결과에서 `is_admin` 값이 `1`이면 성공입니다.

## 🔐 보안 주의사항

### ⚠️ 필수 작업

1. **비밀번호 즉시 변경**
   - 로그인 후 마이페이지에서 비밀번호 변경
   - 또는 다음 SQL로 새 비밀번호 설정:

   ```bash
   # 새 비밀번호 해시 생성
   cd backend
   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('새비밀번호', 10).then(hash => console.log(hash));"
   ```

   ```sql
   -- 생성된 해시로 비밀번호 업데이트
   UPDATE users SET password_hash = '생성된_해시값' WHERE username = 'admin';
   ```

2. **SQL 파일 보안**
   - `create_admin.sql` 파일을 안전한 곳에 백업하거나 삭제
   - Git에 커밋하지 마세요 (이미 .gitignore에 포함되어야 함)

3. **이메일 주소 변경**
   - 실제 사용할 관리자 이메일로 변경 권장

   ```sql
   UPDATE users SET email = '실제이메일@example.com' WHERE username = 'admin';
   ```

## 🔑 비밀번호 해시 생성 방법

새로운 관리자 계정이나 비밀번호를 추가로 생성하려면:

```bash
cd backend
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('원하는비밀번호', 10).then(hash => console.log(hash));"
```

출력된 해시값을 SQL INSERT 문의 `password_hash`에 사용하세요.

## 🛠️ 관리자 권한

`is_admin = 1`인 사용자는 다음 권한을 가집니다:

- 모든 비디오 삭제 가능 (videos.js:304)
- 신고된 컨텐츠 관리
- 사용자 관리
- 시스템 설정 변경

## 📝 추가 관리자 생성

추가 관리자가 필요한 경우:

```sql
-- 기존 사용자를 관리자로 승격
UPDATE users SET is_admin = 1 WHERE username = '사용자이름';

-- 또는 새 관리자 계정 생성 (위의 INSERT 문 재사용)
```

## ❓ 문제 해결

### "Duplicate entry" 오류 발생 시

이미 ataturk324 계정이 존재하는 경우:

```sql
-- 기존 ataturk324 계정 확인
SELECT * FROM users WHERE username = 'ataturk324';

-- 기존 계정 삭제 후 재생성 (신중히!)
DELETE FROM users WHERE username = 'ataturk324';
```

### 로그인 실패 시

1. 비밀번호를 정확히 입력했는지 확인: `ss092888!`
2. 데이터베이스에서 계정 확인
3. 백엔드 서버 재시작

---

**생성 완료 후 이 문서는 안전하게 보관하거나 삭제하세요.**
