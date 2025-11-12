# 추천인 시스템 가이드

## 개요

Berrple의 추천인 시스템을 통해 친구를 초대하면 멋진 보상을 받을 수 있습니다!

## 기능

### 사용자 기능

1. **내 추천 코드 생성**
   - 로그인 후 헤더의 "친구 초대" 버튼 클릭
   - 자동으로 고유한 추천 코드가 생성됩니다
   - 추천 링크를 복사하여 친구에게 공유

2. **추천 현황 확인**
   - 초대한 친구 수
   - 받은 보상 내역
   - 다음 보상까지 남은 초대 수

3. **보상 단계**
   - 5명 초대: 기프티콘 증정
   - 10명 초대: 더 큰 보상
   - 20명 초대: 특별 보상
   - 50명 이상: VIP 보상

### 관리자 기능

1. **추천 통계 확인**
   - `/api/referrals/stats` 엔드포인트에서 전체 통계 확인
   - 최다 추천자 순위
   - 보상 대기 목록

2. **보상 상태 관리**
   - pending: 아직 마일스톤 미달성
   - notified: 마일스톤 달성, 이메일 알림 발송됨
   - sent: 기프티콘 발송 완료

## 설치 및 설정

### 1. 데이터베이스 스키마 적용

```bash
# MariaDB에 접속
mysql -u root -p berrple

# 스키마 적용
source database/add_referral_system.sql
```

### 2. 이메일 설정 (선택)

`.env` 파일에 이메일 설정을 추가하세요:

```env
# Gmail 사용 시
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
ADMIN_EMAIL=admin@berrple.com

# SMTP 직접 설정 시
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-password
ADMIN_EMAIL=admin@berrple.com
```

**Gmail 앱 비밀번호 생성 방법:**
1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성: https://myaccount.google.com/apppasswords
4. 생성된 16자리 비밀번호를 `EMAIL_PASSWORD`에 입력

### 3. 프론트엔드 빌드

```bash
cd frontend
npm install
npm run build
```

## API 엔드포인트

### 사용자 API

#### 내 추천 코드 가져오기
```
GET /api/referrals/my-code
Authorization: Bearer <token>
```

응답:
```json
{
  "code": "USER_A1B2C3D4",
  "referralCount": 7,
  "referredUsers": [...],
  "rewards": [...],
  "milestones": [
    { "count": 5, "reached": true },
    { "count": 10, "reached": false },
    { "count": 20, "reached": false }
  ]
}
```

#### 추천 코드 검증
```
GET /api/referrals/validate/:code
```

#### 추천 리더보드
```
GET /api/referrals/leaderboard?limit=10
```

### 관리자 API

#### 추천 통계
```
GET /api/referrals/stats
Authorization: Bearer <admin-token>
```

#### 보상 상태 업데이트
```
PUT /api/referrals/rewards/:rewardId/status
Authorization: Bearer <admin-token>

Body:
{
  "status": "sent",
  "adminNotes": "스타벅스 기프티콘 발송 완료"
}
```

## 사용 흐름

### 일반 사용자

1. **추천 코드 획득**
   - 로그인 후 "친구 초대" 버튼 클릭
   - 추천 링크 복사

2. **친구 초대**
   - 추천 링크를 친구에게 공유
   - 친구가 링크를 통해 회원가입

3. **보상 수령**
   - 마일스톤 달성 시 자동으로 이메일 알림 수신
   - 관리자 확인 후 기프티콘 수령

### 관리자

1. **보상 알림 확인**
   - 사용자가 마일스톤 달성 시 자동으로 이메일 수신
   - 관리자 페이지에서 대기 중인 보상 목록 확인

2. **기프티콘 발송**
   - 사용자의 추천 내역 확인
   - 이메일로 기프티콘 발송

3. **상태 업데이트**
   - API를 통해 보상 상태를 'sent'로 변경
   - 관리 노트 작성

## 회원가입 시 추천 코드 입력

### URL 파라미터로 전달
```
https://berrple.com/register?ref=USER_A1B2C3D4
```

### 수동 입력
회원가입 페이지에서 "추천 코드" 필드에 직접 입력

## 데이터베이스 구조

### referral_codes
- 사용자별 추천 코드 저장
- 추천 카운트 관리

### referrals
- 추천 관계 추적
- 추천인-피추천인 매핑

### referral_rewards
- 보상 이력 관리
- 상태: pending → notified → sent

## 보안 고려사항

1. **추천 코드 중복 방지**
   - 코드 생성 시 중복 체크
   - 고유 인덱스 설정

2. **자기 추천 방지**
   - 자신의 코드로는 가입 불가

3. **중복 보상 방지**
   - 마일스톤별 보상 중복 체크
   - 트랜잭션 처리

## 문제 해결

### 이메일이 발송되지 않을 때

1. `.env` 파일의 이메일 설정 확인
2. Gmail 앱 비밀번호 생성 확인
3. 서버 로그 확인: `docker logs berrple-backend`

### 추천 코드가 작동하지 않을 때

1. 데이터베이스 스키마 확인
2. 브라우저 콘솔에서 API 응답 확인
3. 백엔드 로그 확인

## 향후 개선 사항

- [ ] 추천 리더보드 페이지
- [ ] 실시간 추천 알림
- [ ] 다양한 보상 티어
- [ ] 추천 통계 대시보드
- [ ] 소셜 미디어 공유 버튼
