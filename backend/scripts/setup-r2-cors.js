const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: ['*'], // 모든 오리진 허용 (프로덕션에서는 특정 도메인으로 제한)
      AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
      MaxAgeSeconds: 3600,
    },
  ],
};

async function setupCORS() {
  try {
    console.log('🔧 Cloudflare R2 CORS 설정 중...');

    const command = new PutBucketCorsCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      CORSConfiguration: corsConfiguration,
    });

    await s3Client.send(command);

    console.log('✅ CORS 설정 완료!');
    console.log('📝 설정된 CORS 정책:');
    console.log(JSON.stringify(corsConfiguration, null, 2));
  } catch (error) {
    console.error('❌ CORS 설정 실패:', error.message);
    process.exit(1);
  }
}

setupCORS();
