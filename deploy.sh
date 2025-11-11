#!/bin/bash

# Berrple 배포 스크립트
# 사용법: ./deploy.sh

set -e

echo "🚀 Berrple 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수: 에러 메시지 출력
error() {
    echo -e "${RED}❌ 에러: $1${NC}"
    exit 1
}

# 함수: 성공 메시지 출력
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 함수: 경고 메시지 출력
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# .env 파일 존재 확인
if [ ! -f .env ]; then
    error ".env 파일이 없습니다. .env.example을 복사하여 .env 파일을 생성하세요."
fi

success ".env 파일 확인 완료"

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    error "Docker가 설치되어 있지 않습니다. Docker를 먼저 설치하세요."
fi

success "Docker 설치 확인 완료"

# Docker Compose 설치 확인
if ! docker compose version &> /dev/null; then
    error "Docker Compose가 설치되어 있지 않습니다."
fi

success "Docker Compose 설치 확인 완료"

# 기존 컨테이너 중지
echo "📦 기존 컨테이너 중지 중..."
docker compose down || warning "기존 컨테이너가 실행 중이지 않습니다."

# Docker 이미지 빌드
echo "🔨 Docker 이미지 빌드 중..."
docker compose build || error "Docker 이미지 빌드 실패"
success "Docker 이미지 빌드 완료"

# 컨테이너 시작
echo "🚀 컨테이너 시작 중..."
docker compose up -d || error "컨테이너 시작 실패"
success "컨테이너 시작 완료"

# 헬스체크 대기
echo "⏳ 서비스가 준비될 때까지 대기 중..."
sleep 10

# 서비스 상태 확인
echo "📊 서비스 상태 확인 중..."
docker compose ps

# 데이터베이스 헬스체크
echo "🗄️  데이터베이스 연결 확인 중..."
for i in {1..30}; do
    if docker compose exec -T db mysqladmin ping -h localhost --silent &> /dev/null; then
        success "데이터베이스 연결 성공"
        break
    fi
    if [ $i -eq 30 ]; then
        error "데이터베이스 연결 실패"
    fi
    echo "데이터베이스 연결 대기 중... ($i/30)"
    sleep 2
done

# 백엔드 헬스체크
echo "🔧 백엔드 서버 확인 중..."
for i in {1..20}; do
    if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
        success "백엔드 서버 정상 작동"
        break
    fi
    if [ $i -eq 20 ]; then
        warning "백엔드 서버 헬스체크 실패 (로그 확인 필요)"
    fi
    echo "백엔드 서버 대기 중... ($i/20)"
    sleep 3
done

# 로그 출력
echo "📝 최근 로그 (Ctrl+C로 종료):"
echo "전체 로그를 보려면: docker compose logs -f"
echo "특정 서비스 로그: docker compose logs -f [backend|frontend|db|nginx]"
echo ""

docker compose logs --tail=50

echo ""
success "🎉 배포 완료!"
echo ""
echo "📌 다음 단계:"
echo "  1. 로그 확인: docker compose logs -f"
echo "  2. 서비스 상태: docker compose ps"
echo "  3. HTTP: http://your-domain.com"
echo "  4. HTTPS: https://your-domain.com (SSL 설정 후)"
echo ""
echo "🔒 SSL 인증서 발급 (초기 1회):"
echo "  docker compose run --rm certbot certonly --webroot \\"
echo "    --webroot-path=/var/www/certbot \\"
echo "    --email your-email@example.com \\"
echo "    --agree-tos --no-eff-email \\"
echo "    -d your-domain.com -d www.your-domain.com"
echo ""
