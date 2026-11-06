import { MongoRateLimitStore } from '../services/mongoRateLimitStore.js';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { isIP } from 'node:net';

// NoSQL Injection Sanitization Middleware
// Strips keys starting with '$' or containing '.' from body, query, and params
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Render's public edge overwrites CF-Connecting-IP. X-Forwarded-For can include client input.
function renderVisitorKey(req) {
  const visitorIp = req.get('CF-Connecting-IP');
  const address = isIP(visitorIp) ? visitorIp : req.socket.remoteAddress;
  return ipKeyGenerator(address ?? 'unknown');
}

const isRenderWebService = process.env.RENDER === 'true' && process.env.RENDER_SERVICE_TYPE === 'web';
const visitorKeyGenerator = isRenderWebService ? renderVisitorKey : undefined;

// Rate limiter for authentication routes: 100 requests per 15 minutes
export const authLimiter = rateLimit({
  store: new MongoRateLimitStore('authLimiter'),
  keyGenerator: visitorKeyGenerator,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

// General API rate limiter: 1000 requests per 15 minutes
export const apiLimiter = rateLimit({
  store: new MongoRateLimitStore('apiLimiter'),
  keyGenerator: visitorKeyGenerator,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests created from this IP. Please slow down and try again later.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

// Bound doorstep guesses by authenticated account and order, even behind a proxy.
export const doorstepLimiter = rateLimit({
  store: new MongoRateLimitStore('doorstepLimiter'),
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => `${req.user._id}:${req.params.id}`,
  message: { success: false, message: 'Too many verification attempts. Wait 15 minutes or contact support.' },
  skip: () => process.env.NODE_ENV === 'test'
});
