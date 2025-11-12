const nodemailer = require('nodemailer');

// Create transporter (Gmail 사용 예시)
const createTransporter = () => {
  // Gmail을 사용하는 경우
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Gmail 앱 비밀번호 사용
      }
    });
  }

  // SMTP를 직접 설정하는 경우
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// 추천인 보상 알림 이메일 전송
async function sendReferralRewardEmail(userEmail, username, milestone) {
  try {
    if (!process.env.EMAIL_USER) {
      console.warn('Email service not configured. Skipping email notification.');
      return false;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Berrple" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `🎉 축하합니다! ${milestone}명 추천 달성 보상`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .milestone { font-size: 48px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 추천인 보상 달성!</h1>
            </div>
            <div class="content">
              <p>안녕하세요, <strong>${username}</strong>님!</p>

              <div class="milestone">${milestone}명</div>

              <p>축하합니다! 총 <strong>${milestone}명</strong>의 친구를 Berrple에 초대하셨습니다! 🎊</p>

              <p>약속드린 기프티콘을 준비 중이며, 곧 관리자가 확인 후 발송해드릴 예정입니다.</p>

              <div style="background: #fff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                <h3>📧 다음 단계:</h3>
                <ul>
                  <li>관리자가 회원님의 추천 내역을 확인합니다</li>
                  <li>확인 완료 후 이 이메일로 기프티콘을 발송합니다</li>
                  <li>보통 1-3일 정도 소요됩니다</li>
                </ul>
              </div>

              <p>더 많은 친구를 초대하시면 추가 보상도 받으실 수 있습니다!</p>
              <ul>
                <li>5명 추천: 🎁 기프티콘 제공</li>
                <li>10명 추천: 🎁 더 큰 보상</li>
                <li>20명 추천: 🎁 특별 보상</li>
                <li>50명 추천: 🎁 VIP 보상</li>
              </ul>

              <p>계속해서 Berrple을 이용해주셔서 감사합니다!</p>

              <p>문의사항이 있으시면 언제든 연락주세요.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Berrple. All rights reserved.</p>
              <p>이 메일은 발신 전용입니다.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Referral reward email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending referral reward email:', error);
    return false;
  }
}

// 관리자에게 보상 알림 이메일 전송
async function sendAdminNotificationEmail(userEmail, username, milestone) {
  try {
    if (!process.env.EMAIL_USER || !process.env.ADMIN_EMAIL) {
      console.warn('Email service not configured. Skipping admin notification.');
      return false;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Berrple System" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `[Berrple] 추천인 보상 알림: ${username}님이 ${milestone}명 달성`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body>
          <h2>추천인 보상 알림</h2>
          <p><strong>${username}</strong>님이 <strong>${milestone}명</strong> 추천을 달성했습니다.</p>

          <h3>회원 정보:</h3>
          <ul>
            <li>사용자명: ${username}</li>
            <li>이메일: ${userEmail}</li>
            <li>달성 마일스톤: ${milestone}명</li>
            <li>달성 시간: ${new Date().toLocaleString('ko-KR')}</li>
          </ul>

          <p>관리자 페이지에서 추천 내역을 확인하고 기프티콘을 발송해주세요.</p>

          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/referrals"
               style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              관리자 페이지로 이동
            </a>
          </p>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return false;
  }
}

module.exports = {
  sendReferralRewardEmail,
  sendAdminNotificationEmail
};
