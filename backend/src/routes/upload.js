const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, bucketName, publicUrl } = require('../config/cloudflare');
const { authMiddleware } = require('../middleware/auth');
const db = require('../config/database');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

// FFmpeg 경로 설정
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// 비디오에서 썸네일 생성 함수
async function generateThumbnailFromVideo(videoBuffer) {
  return new Promise((resolve, reject) => {
    const tempVideoPath = path.join(os.tmpdir(), `${uuidv4()}.mp4`);
    const tempThumbnailPath = path.join(os.tmpdir(), `${uuidv4()}.jpg`);

    // 비디오 버퍼를 임시 파일로 저장
    fs.writeFileSync(tempVideoPath, videoBuffer);

    // FFmpeg로 썸네일 추출 (5초 지점에서 캡처, 1080p)
    ffmpeg(tempVideoPath)
      .screenshots({
        timestamps: ['5'],
        filename: path.basename(tempThumbnailPath),
        folder: path.dirname(tempThumbnailPath),
        size: '1920x1080'
      })
      .on('end', () => {
        try {
          const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

          // 임시 파일 삭제
          fs.unlinkSync(tempVideoPath);
          fs.unlinkSync(tempThumbnailPath);

          resolve(thumbnailBuffer);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (err) => {
        // 임시 파일 정리
        try {
          if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
          if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
        reject(err);
      });
  });
}

// Configure multer for video upload
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1.5 * 1024 * 1024 * 1024, // 1.5 GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Configure multer for thumbnail upload
const uploadThumbnail = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

// Upload video to Cloudflare R2
router.post('/video', authMiddleware, uploadVideo.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const {
      channelHandle,
      title,
      description,
      thumbnailUrl,
      tags
    } = req.body;

    if (!channelHandle || !title) {
      return res.status(400).json({ error: 'Channel handle and title are required' });
    }

    // Verify channel ownership
    const [channels] = await db.query(
      'SELECT id, user_id FROM channels WHERE channel_handle = ?',
      [channelHandle]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channels[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `videos/${req.user.id}/${fileName}`;

    // Upload to Cloudflare R2
    const uploadParams = {
      Bucket: bucketName,
      Key: filePath,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const videoUrl = `${publicUrl}/${filePath}`;

    // 썸네일이 제공되지 않은 경우 비디오에서 자동 생성
    let finalThumbnailUrl = thumbnailUrl;
    if (!thumbnailUrl) {
      try {
        console.log('📸 썸네일 자동 생성 중...');
        const thumbnailBuffer = await generateThumbnailFromVideo(req.file.buffer);

        // 썸네일을 R2에 업로드
        const thumbnailFileName = `${uuidv4()}.jpg`;
        const thumbnailFilePath = `thumbnails/${req.user.id}/${thumbnailFileName}`;

        const thumbnailUploadParams = {
          Bucket: bucketName,
          Key: thumbnailFilePath,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
        };

        await s3Client.send(new PutObjectCommand(thumbnailUploadParams));
        finalThumbnailUrl = `${publicUrl}/${thumbnailFilePath}`;
        console.log('✅ 썸네일 자동 생성 완료');
      } catch (error) {
        console.error('⚠️  썸네일 생성 실패 (계속 진행):', error.message);
        // 썸네일 생성 실패해도 비디오 업로드는 계속 진행
      }
    }

    // Create video entry in database
    const [result] = await db.query(
      `INSERT INTO videos (channel_id, video_type, title, description, thumbnail_url, video_url, video_file_size)
       VALUES (?, 'upload', ?, ?, ?, ?, ?)`,
      [channels[0].id, title, description, finalThumbnailUrl, videoUrl, req.file.size]
    );

    const videoId = result.insertId;

    // Add tags if provided
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : JSON.parse(tags);
      for (const tagName of tagArray) {
        const [tagResult] = await db.query(
          'INSERT INTO tags (tag_name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
          [tagName]
        );
        const tagId = tagResult.insertId;

        await db.query(
          'INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)',
          [videoId, tagId]
        );

        await db.query(
          'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
          [tagId]
        );
      }
    }

    // Update channel video count
    await db.query(
      'UPDATE channels SET video_count = video_count + 1 WHERE id = ?',
      [channels[0].id]
    );

    res.status(201).json({
      message: 'Video uploaded successfully',
      videoId,
      videoUrl
    });
  } catch (error) {
    next(error);
  }
});

// Upload thumbnail
router.post('/thumbnail', authMiddleware, uploadThumbnail.single('thumbnail'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No thumbnail file provided' });
    }

    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `thumbnails/${req.user.id}/${fileName}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: filePath,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const thumbnailUrl = `${publicUrl}/${filePath}`;

    res.json({
      message: 'Thumbnail uploaded successfully',
      thumbnailUrl
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
