const db = require('../config/database');
const axios = require('axios');

// Get client IP from request (considering proxies)
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return req.connection.remoteAddress || req.socket.remoteAddress;
}

// Check if IP is in blocked list
async function isIpBlocked(ip) {
  try {
    const [blocked] = await db.query(
      'SELECT id FROM blocked_ips WHERE ip_address = ?',
      [ip]
    );
    return blocked.length > 0;
  } catch (error) {
    console.error('Error checking blocked IP:', error);
    return false;
  }
}

// Check if IP has too many registrations (suspicious activity)
async function checkIpRegistrationLimit(ip) {
  try {
    const [logs] = await db.query(
      'SELECT registration_count, is_flagged FROM ip_registration_log WHERE ip_address = ?',
      [ip]
    );

    if (logs.length === 0) {
      return { allowed: true, count: 0 };
    }

    const count = logs[0].registration_count;
    const isFlagged = logs[0].is_flagged;

    // Allow max 3 accounts per IP
    if (count >= 3 || isFlagged) {
      return { allowed: false, count, reason: 'Too many accounts from this IP' };
    }

    return { allowed: true, count };
  } catch (error) {
    console.error('Error checking IP registration limit:', error);
    return { allowed: true, count: 0 }; // Fail open to not block legitimate users on error
  }
}

// Log IP registration
async function logIpRegistration(ip, userId) {
  try {
    const [existing] = await db.query(
      'SELECT id, registration_count FROM ip_registration_log WHERE ip_address = ?',
      [ip]
    );

    if (existing.length === 0) {
      // First registration from this IP
      await db.query(
        'INSERT INTO ip_registration_log (ip_address, user_id, registration_count) VALUES (?, ?, 1)',
        [ip, userId]
      );
    } else {
      // Increment count
      const newCount = existing[0].registration_count + 1;
      const shouldFlag = newCount >= 3;

      await db.query(
        'UPDATE ip_registration_log SET registration_count = ?, user_id = ?, last_seen = NOW(), is_flagged = ? WHERE ip_address = ?',
        [newCount, userId, shouldFlag, ip]
      );
    }
  } catch (error) {
    console.error('Error logging IP registration:', error);
  }
}

// Simple VPN detection using common VPN IP ranges
// For production, consider using a service like IPHub, IPQualityScore, or MaxMind
async function checkVpnProxy(ip) {
  // Check against known datacenter/hosting IP ranges
  const datacenterPatterns = [
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Private range often used by VPNs
    /^10\./,                           // Private range
    /^192\.168\./,                     // Private range
  ];

  for (const pattern of datacenterPatterns) {
    if (pattern.test(ip)) {
      // These are private IPs, which shouldn't be seen in production
      // but might be seen in development
      if (process.env.NODE_ENV === 'production') {
        return { isVpn: true, reason: 'Private IP detected in production' };
      }
    }
  }

  // Check our blocked list
  const isBlocked = await isIpBlocked(ip);
  if (isBlocked) {
    return { isVpn: true, reason: 'IP is in blocked list' };
  }

  // For now, allow the IP
  // In production, integrate with a VPN detection API
  return { isVpn: false };
}

// Validate IP for registration
async function validateIpForRegistration(req) {
  const ip = getClientIp(req);

  // Check if IP is blocked
  const blocked = await isIpBlocked(ip);
  if (blocked) {
    return {
      valid: false,
      ip,
      reason: '이 IP 주소는 차단되었습니다.'
    };
  }

  // Check VPN/Proxy
  const vpnCheck = await checkVpnProxy(ip);
  if (vpnCheck.isVpn) {
    // Add to blocked list
    try {
      await db.query(
        'INSERT IGNORE INTO blocked_ips (ip_address, ip_type, reason) VALUES (?, ?, ?)',
        [ip, 'vpn', vpnCheck.reason]
      );
    } catch (error) {
      console.error('Error adding IP to blocked list:', error);
    }

    return {
      valid: false,
      ip,
      reason: 'VPN 또는 프록시를 사용한 가입은 허용되지 않습니다.'
    };
  }

  // Check registration limit
  const limitCheck = await checkIpRegistrationLimit(ip);
  if (!limitCheck.allowed) {
    return {
      valid: false,
      ip,
      reason: '이 IP에서 이미 너무 많은 계정이 생성되었습니다.'
    };
  }

  return {
    valid: true,
    ip
  };
}

// Check if user can still receive referrals
async function canReceiveReferrals(userId) {
  try {
    const [codes] = await db.query(
      'SELECT referral_count FROM referral_codes WHERE user_id = ?',
      [userId]
    );

    if (codes.length === 0) {
      return { allowed: true, count: 0 };
    }

    const count = codes[0].referral_count;

    // Maximum 10 referrals
    if (count >= 10) {
      return { allowed: false, count, reason: '최대 추천 인원(10명)에 도달했습니다.' };
    }

    return { allowed: true, count };
  } catch (error) {
    console.error('Error checking referral limit:', error);
    return { allowed: true, count: 0 };
  }
}

module.exports = {
  getClientIp,
  isIpBlocked,
  checkIpRegistrationLimit,
  logIpRegistration,
  checkVpnProxy,
  validateIpForRegistration,
  canReceiveReferrals
};
