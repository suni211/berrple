# Backend Dockerfile
FROM node:18-alpine

# FFmpeg 설치 (썸네일 생성용)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 포트 설정
EXPOSE 5000

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 실행
CMD ["node", "src/server.js"]
