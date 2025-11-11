# 🚀 Berrple 배포 가이드 (Google Compute Engine)

이 문서는 Berrple을 Google Compute Engine에 Docker를 사용하여 배포하는 방법을 안내합니다.

## 📋 목차

1. [사전 준비](#사전-준비)
2. [GCE 인스턴스 생성](#gce-인스턴스-생성)
3. [서버 초기 설정](#서버-초기-설정)
4. [애플리케이션 배포](#애플리케이션-배포)
5. [SSL 인증서 설정](#ssl-인증서-설정)
6. [도메인 연결 (Cloudflare)](#도메인-연결-cloudflare)
7. [유지보수](#유지보수)

---

## 🔧 사전 준비

### 필요한 것들

- [x] Google Cloud Platform 계정
- [x] 도메인 (준비 완료)
- [x] Cloudflare 계정 (준비 완료)
- [x] Cloudflare R2 버킷 및 액세스 키
- [x] YouTube Data API v3 키

### 로컬에서 준비

```bash
# 프로젝트 디렉토리로 이동
cd berrple

# 환경 변수 파일 생성
cp .env.example .env

# .env 파일을 편집하여 실제 값 입력
# nano .env 또는 원하는 에디터 사용
```

---

## 🖥️ GCE 인스턴스 생성

### 1. Google Cloud Console에서 인스턴스 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **Compute Engine** → **VM 인스턴스** 선택
3. **인스턴스 만들기** 클릭

### 2. 인스턴스 설정

```
이름: berrple-production
리전: asia-northeast3 (서울) 또는 asia-northeast1 (도쿄)
영역: 자동 선택

머신 구성:
  시리즈: E2
  머신 유형: e2-medium (2 vCPU, 4GB 메모리)
  또는 e2-standard-2 (2 vCPU, 8GB 메모리) - 트래픽 많을 경우

부팅 디스크:
  운영체제: Ubuntu
  버전: Ubuntu 22.04 LTS
  크기: 30GB (최소), 50GB (권장)
  디스크 유형: SSD 영구 디스크

방화벽:
  ✅ HTTP 트래픽 허용
  ✅ HTTPS 트래픽 허용
```

### 3. 고정 IP 주소 할당

```bash
# GCP Console에서
VPC 네트워크 → 외부 IP 주소 → 고정 주소 예약
- 이름: berrple-static-ip
- 리전: 인스턴스와 동일
- 연결 대상: berrple-production 인스턴스
```

---

## ⚙️ 서버 초기 설정

### 1. SSH 접속

```bash
# GCP Console에서 SSH 버튼 클릭
# 또는 gcloud CLI 사용
gcloud compute ssh berrple-production --zone=asia-northeast3-a
```

### 2. 시스템 업데이트 및 필수 패키지 설치

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    vim \
    htop \
    ufw
```

### 3. Docker 설치

```bash
# Docker GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker 서비스 시작 및 자동 시작 설정
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 명령 사용)
sudo usermod -aG docker $USER

# 변경사항 적용을 위해 로그아웃 후 재로그인
exit
# SSH 재접속
```

### 4. 방화벽 설정

```bash
# UFW 방화벽 설정
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 방화벽 상태 확인
sudo ufw status
```

---

## 📦 애플리케이션 배포

### 1. 코드 배포

서버에 코드를 올리는 방법은 여러 가지가 있습니다:

#### 방법 A: Git 사용 (권장)

```bash
# GitHub/GitLab에 코드 푸시 후
cd ~
git clone https://github.com/yourusername/berrple.git
cd berrple
```

#### 방법 B: 직접 파일 업로드

```bash
# 로컬 컴퓨터에서 실행
# gcloud 사용
gcloud compute scp --recurse berrple berrple-production1:~ --zone=asia-northeast3-a

# 또는 rsync 사용 (더 빠름)
rsync -avz -e "gcloud compute ssh berrple-production --zone=asia-northeast3-a --" \
  berrple/ :~/berrple/
```

### 2. 환경 변수 설정

```bash
cd ~/berrple

# .env 파일 생성
cp .env.example .env

# .env 파일 편집
nano .env
```

**.env 파일 예시:**

```env
# 데이터베이스
DB_ROOT_PASSWORD=SuperSecureRootPass123!@#
DB_NAME=berrple
DB_USER=berrple_user
DB_PASSWORD=SecureDBPass456!@#

# JWT (32자 이상 랜덤 문자열)
JWT_SECRET=생성된-강력한-jwt-시크릿-키-최소-32자-이상

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=berrple-videos
R2_PUBLIC_URL=https://your-bucket.r2.dev

# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key

# 도메인
DOMAIN=your-domain.com
SSL_EMAIL=your-email@example.com
```

**JWT Secret 생성:**

```bash
# 안전한 랜덤 문자열 생성
openssl rand -base64 32
```

### 3. Nginx 설정에서 도메인 변경

```bash
# Nginx 설정 파일 편집
nano nginx/conf.d/berrple.conf

# 'your-domain.com'을 실제 도메인으로 변경
# 예: berrple.com
```

### 4. Docker 이미지 빌드 및 실행

```bash
# Docker Compose로 전체 스택 실행
docker compose build

# 백그라운드에서 실행
docker compose up -d

# 로그 확인
docker compose logs -f

# 특정 서비스만 로그 확인
docker compose logs -f backend
docker compose logs -f frontend
```

### 5. 데이터베이스 초기화 확인

```bash
# 데이터베이스 컨테이너 접속
docker exec -it berrple-db mysql -u root -p

# 비밀번호 입력 후
USE berrple;
SHOW TABLES;

# 관리자 계정 확인
SELECT id, username, email, is_admin FROM users WHERE is_admin = 1;

# 종료
EXIT;
```

---

## 🔒 SSL 인증서 설정

### 1. Let's Encrypt 인증서 발급 (초기 설정)

먼저 HTTP로 도메인이 정상적으로 연결되는지 확인한 후 진행합니다.

```bash
cd ~/berrple

# Certbot을 사용하여 인증서 발급
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com
```

### 2. Nginx HTTPS 설정 활성화

인증서가 발급되면 Nginx를 재시작하여 HTTPS를 활성화합니다:

```bash
# Nginx 컨테이너 재시작
docker compose restart nginx

# 또는 전체 재시작
docker compose restart
```

### 3. 인증서 자동 갱신 확인

인증서는 90일마다 만료되므로 자동 갱신이 설정되어 있습니다. `docker-compose.yml`의 certbot 서비스가 12시간마다 갱신을 시도합니다.

```bash
# 수동으로 갱신 테스트
docker compose run --rm certbot renew --dry-run
```

---

## 🌐 도메인 연결 (Cloudflare)

### 1. Cloudflare DNS 설정

Cloudflare 대시보드에서:

```
DNS 레코드 추가:

A 레코드:
  이름: @ (또는 your-domain.com)
  IPv4 주소: [GCE 인스턴스의 고정 IP]
  프록시 상태: DNS 전용 (회색 구름) ← 중요!

A 레코드 (www):
  이름: www
  IPv4 주소: [GCE 인스턴스의 고정 IP]
  프록시 상태: DNS 전용 (회색 구름) ← 중요!
```

**중요:**
- 처음 SSL 인증서를 발급받을 때는 반드시 **DNS 전용 (회색 구름)** 으로 설정
- 인증서 발급 후에 Cloudflare 프록시 (주황색 구름)로 변경 가능

### 2. Cloudflare SSL/TLS 설정

```
SSL/TLS 탭:
  암호화 모드: Full (strict) 선택

  이유: Let's Encrypt 인증서를 사용하므로 Full strict 모드 필요
```

### 3. DNS 전파 확인

```bash
# 도메인이 올바른 IP를 가리키는지 확인
nslookup your-domain.com
dig your-domain.com

# 또는 온라인 도구 사용
# https://www.whatsmydns.net/
```

DNS 전파는 최대 24-48시간이 걸릴 수 있습니다.

---

## 🔧 유지보수

### 컨테이너 관리

```bash
# 모든 컨테이너 상태 확인
docker compose ps

# 특정 서비스 재시작
docker compose restart backend
docker compose restart frontend
docker compose restart nginx

# 모든 서비스 재시작
docker compose restart

# 서비스 중지
docker compose stop

# 서비스 시작
docker compose start

# 서비스 중지 및 제거 (데이터는 유지)
docker compose down

# 서비스 중지 및 볼륨까지 제거 (⚠️ 데이터 삭제)
docker compose down -v
```

### 로그 확인

```bash
# 전체 로그
docker compose logs -f

# 특정 서비스 로그
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
docker compose logs -f nginx

# 최근 100줄만 보기
docker compose logs --tail=100 backend
```

### 데이터베이스 백업

```bash
# 백업 디렉토리 생성
mkdir -p ~/backups

# 데이터베이스 백업
docker exec berrple-db mysqldump -u root -p${DB_ROOT_PASSWORD} berrple > ~/backups/berrple_$(date +%Y%m%d_%H%M%S).sql

# 백업 복원
docker exec -i berrple-db mysql -u root -p${DB_ROOT_PASSWORD} berrple < ~/backups/berrple_20250101_120000.sql
```

### 코드 업데이트

```bash
cd ~/berrple

# Git으로 최신 코드 가져오기
git pull origin main

# Docker 이미지 다시 빌드
docker compose build

# 무중단 재시작 (rolling restart)
docker compose up -d --build --force-recreate
```

### 시스템 모니터링

```bash
# 디스크 사용량 확인
df -h

# Docker 디스크 사용량
docker system df

# 사용하지 않는 Docker 리소스 정리
docker system prune -a --volumes

# 메모리 사용량
free -h

# CPU 사용량
htop

# Docker 컨테이너 리소스 사용량
docker stats
```

### 자동 백업 스크립트 (선택사항)

```bash
# 백업 스크립트 생성
nano ~/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 데이터베이스 백업
docker exec berrple-db mysqldump -u root -p${DB_ROOT_PASSWORD} berrple > $BACKUP_DIR/berrple_$DATE.sql

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "berrple_*.sql" -mtime +7 -delete

echo "Backup completed: berrple_$DATE.sql"
```

```bash
# 실행 권한 부여
chmod +x ~/backup.sh

# Cron에 등록 (매일 새벽 3시 백업)
crontab -e

# 다음 줄 추가
0 3 * * * /home/your-username/backup.sh >> /home/your-username/backup.log 2>&1
```

---

## 🚨 문제 해결

### 컨테이너가 시작되지 않을 때

```bash
# 로그 확인
docker compose logs backend
docker compose logs db

# 컨테이너 재시작
docker compose restart

# 강제 재생성
docker compose up -d --force-recreate
```

### 데이터베이스 연결 오류

```bash
# DB 컨테이너 상태 확인
docker compose ps db

# DB 로그 확인
docker compose logs db

# DB 컨테이너 재시작
docker compose restart db
```

### 502 Bad Gateway 오류

```bash
# 백엔드 상태 확인
docker compose ps backend

# 백엔드 로그 확인
docker compose logs backend

# Nginx 설정 테스트
docker exec berrple-nginx nginx -t

# Nginx 재시작
docker compose restart nginx
```

### SSL 인증서 문제

```bash
# 인증서 갱신
docker compose run --rm certbot renew

# Nginx 재시작
docker compose restart nginx
```

---

## 📊 성능 최적화 (선택사항)

### 1. 스왑 메모리 설정 (RAM 부족 시)

```bash
# 2GB 스왑 파일 생성
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Docker 로그 크기 제한

```bash
# /etc/docker/daemon.json 생성
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
# Docker 재시작
sudo systemctl restart docker
```

---

## 📝 체크리스트

배포 전 확인 사항:

- [ ] GCE 인스턴스 생성 완료
- [ ] 고정 IP 할당 완료
- [ ] Docker 설치 완료
- [ ] 코드 업로드 완료
- [ ] .env 파일 설정 완료
- [ ] Nginx 설정에서 도메인 변경 완료
- [ ] Cloudflare DNS 설정 완료 (DNS 전용)
- [ ] Let's Encrypt SSL 인증서 발급 완료
- [ ] HTTPS 접속 확인
- [ ] Cloudflare SSL 모드 Full (strict) 설정
- [ ] 관리자 계정 로그인 테스트
- [ ] 동영상 업로드 테스트
- [ ] 구름 생성 테스트

---

## 🆘 지원

문제가 발생하면:

1. **로그 확인**: `docker compose logs -f`
2. **GitHub Issues**: 프로젝트 저장소에 이슈 등록
3. **GCP 콘솔**: 인스턴스 상태 및 방화벽 규칙 확인

---

## 📚 추가 리소스

- [Docker 공식 문서](https://docs.docker.com/)
- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [Let's Encrypt 공식 문서](https://letsencrypt.org/docs/)
- [Cloudflare 문서](https://developers.cloudflare.com/)
- [Google Compute Engine 문서](https://cloud.google.com/compute/docs)

---

**배포 성공을 기원합니다! 🎉**
