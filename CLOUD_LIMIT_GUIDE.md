# 구름 제한 시스템 가이드

## 🌥️ 구름 시스템 개요

Berrple의 구름은 제한된 자원으로, 사용자들이 신중하게 의미 있는 코멘트를 남기도록 설계되었습니다.

## 📊 구름 획득 및 사용

### 1. **초기 지급**
- 회원가입 시: **10개** 지급
- 즉시 사용 가능

### 2. **일일 보상**
- 매일 첫 로그인 시: **30개** 지급
- 24시간마다 1회 지급
- 로그인 시 자동으로 지급됨

### 3. **사용 제한**
- 구름 1개당 1회 사용
- 영상당 사용자당 최대 **5개** 제한
- 구름이 부족하면 작성 불가

## 🎯 데이터베이스 업데이트

구름 시스템을 사용하려면 데이터베이스를 업데이트해야 합니다.

### MariaDB 접속

```bash
mysql -u root -p
```

### SQL 스크립트 실행

```bash
USE berrple;
source C:/Users/hisam/OneDrive/바탕 화면/berrple/database/update_cloud_limits.sql
```

또는 직접 SQL 명령어 실행:

```sql
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
```

### 확인

```sql
DESC users;
```

다음 컬럼이 추가되었는지 확인:
- `cloud_balance` INT DEFAULT 10
- `last_daily_reward` DATETIME NULL

## 💻 백엔드 구현

### 1. **회원가입 시 구름 지급**
```javascript
// auth.js
INSERT INTO users (..., cloud_balance) VALUES (..., 10)
```

### 2. **로그인 시 일일 보상 체크**
```javascript
// auth.js
const lastReward = user.last_daily_reward;
if (!lastReward || (now - lastReward) >= 24시간) {
  cloud_balance += 30
  last_daily_reward = NOW()
}
```

### 3. **구름 작성 시 검증**
```javascript
// clouds.js
// 1. 잔액 확인
if (cloud_balance < 1) {
  return 403: "구름이 부족합니다"
}

// 2. 영상당 제한 확인
SELECT COUNT(*) FROM clouds WHERE video_id = ? AND user_id = ?
if (count >= 5) {
  return 403: "이 영상에는 최대 5개까지만 구름을 달 수 있습니다"
}

// 3. 구름 생성 후 잔액 차감
cloud_balance -= 1
```

## 🎨 프론트엔드 표시

### 1. **Header에 구름 잔액 표시**
```jsx
<div className="cloud-balance">
  🌥️ {user?.cloudBalance || 0}개
</div>
```

### 2. **구름 작성 성공 시**
- 잔액 자동 업데이트
- 토스트 메시지: "구름이 등록되었습니다! (남은 구름: X개)"

### 3. **로그인 시 일일 보상 알림**
- `dailyRewardGiven: true`일 경우
- 토스트 메시지: "🎉 일일 출석 보상! 구름 30개를 받았습니다!"

## 🚫 에러 처리

### 구름 부족
```
HTTP 403
{
  "error": "구름이 부족합니다. 내일 다시 접속하거나 구름을 충전하세요."
}
```

### 영상당 제한 초과
```
HTTP 403
{
  "error": "이 영상에는 최대 5개까지만 구름을 달 수 있습니다."
}
```

## 📱 사용자 경험

### 구름 획득
1. 회원가입 → 10개 즉시 지급
2. 매일 로그인 → 30개 지급 (24시간마다)

### 구름 사용
1. 로그인 상태 확인
2. 작성 모드 활성화
3. 구름 잔액 확인 (Header 표시)
4. 영상당 5개 제한 확인
5. 구름 작성 → 잔액 차감

### 잔액 부족 시
- 구름 작성 불가
- 에러 메시지 표시
- 내일 다시 로그인하면 30개 지급

## 🔄 업데이트 완료 체크리스트

- [ ] 데이터베이스 스키마 업데이트 (`update_cloud_limits.sql`)
- [ ] 백엔드 재시작
- [ ] 프론트엔드 확인
  - [ ] Header에 구름 잔액 표시됨
  - [ ] 구름 작성 시 잔액 차감됨
  - [ ] 구름 부족 시 에러 메시지 표시됨
  - [ ] 영상당 5개 제한 작동함
  - [ ] 로그인 시 일일 보상 받음

---

## 🎉 완료!

구름 제한 시스템이 성공적으로 적용되었습니다!
