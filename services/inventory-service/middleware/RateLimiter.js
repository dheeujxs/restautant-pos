// middleware/rateLimiter.js
import crypto from 'crypto';

// ─── Configuration ──────────────────────────────────────────────────────────
const CONFIG = {
  default: { points: 100, duration: 60 },
  auth: { points: 10, duration: 60 },
  public: { points: 200, duration: 60 },
  admin: { points: 200, duration: 60 },
  staff: { points: 150, duration: 60 },
};

// ─── Store ──────────────────────────────────────────────────────────────────
const store = new Map();

// ─── Cleanup interval ─────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of store.entries()) {
    if (data.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean every minute

// ─── Helper: Get limiter type ─────────────────────────────────────────────
const getLimiterType = (req) => {
  const url = req.url;
  
  if (url.includes('/auth/login') || 
      url.includes('/auth/register') || 
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/verify-otp')) {
    return 'auth';
  }

  if (url.includes('/public') || 
      url.includes('/health') || 
      url === '/') {
    return 'public';
  }

  if (url.includes('/super-admin') || 
      url.includes('/admin')) {
    return 'admin';
  }

  if (url.includes('/staff-portal') || 
      url.includes('/staff-orders') ||
      url.includes('/attendance') ||
      url.includes('/staff')) {
    return 'staff';
  }

  return 'default';
};

// ─── Main Rate Limiter Middleware ────────────────────────────────────────
export const rateLimiter = async (req, res, next) => {
  try {
    // Skip in development if configured
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true') {
      return next();
    }

    const clientId = req.user?._id?.toString() || 
                     req.staff?._id?.toString() || 
                     req.ip || 
                     'anonymous';
    
    const limiterType = getLimiterType(req);
    const config = CONFIG[limiterType] || CONFIG.default;
    const key = `${clientId}:${limiterType}:${req.method}:${req.path}`;
    const now = Date.now();
    
    let data = store.get(key);
    
    if (!data || data.resetAt < now) {
      data = {
        count: 1,
        resetAt: now + config.duration * 1000,
      };
      store.set(key, data);
      
      // Add headers
      res.setHeader('X-RateLimit-Limit', config.points);
      res.setHeader('X-RateLimit-Remaining', config.points - 1);
      res.setHeader('X-RateLimit-Reset', data.resetAt);
      
      return next();
    }
    
    if (data.count >= config.points) {
      const retryAfter = Math.ceil((data.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment.',
        retryAfter,
      });
    }
    
    data.count++;
    store.set(key, data);
    
    // Add headers
    res.setHeader('X-RateLimit-Limit', config.points);
    res.setHeader('X-RateLimit-Remaining', config.points - data.count);
    res.setHeader('X-RateLimit-Reset', data.resetAt);
    
    next();
  } catch (error) {
    // On error, let the request through
    console.error('Rate limiter error:', error.message);
    next();
  }
};

export default rateLimiter;