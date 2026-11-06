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
function connectionAddress(req) {
  const visitorIp = req.get('CF-Connecting-IP');
  return isIP(visitorIp) ? visitorIp : req.socket.remoteAddress;
}

// The website reaches this API through a Vercel /api rewrite, so CF-Connecting-IP is a shared
// Vercel egress address. Vercel overwrites X-Forwarded-For with the real visitor IP (leftmost).
// A direct caller can fake these headers, so proxyConnectionLimiter still caps each connection.
function proxiedVisitorAddress(req) {
  if (!req.get('x-vercel-id')) return null;
  const leftmost = (req.get('X-Forwarded-For') || '').split(',')[0].trim();
  return isIP(leftmost) ? leftmost : null;
}

function renderVisitorKey(req) {
  return ipKeyGenerator(proxiedVisitorAddress(req) ?? connectionAddress(req) ?? 'unknown');
}

const isRenderWebService = process.env.RENDER === 'true' && process.env.RENDER_SERVICE_TYPE === 'web';
const visitorKeyGenerator = isRenderWebService ? renderVisitorKey : undefined;

// Upper bound on authentication attempts per connecting address for proxied requests.
export const proxyConnectionLimiter = rateLimit({
  store: new MongoRateLimitStore('proxyConnectionLimiter'),
  keyGenerator: req => ipKeyGenerator(connectionAddress(req) ?? 'unknown'),
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: false,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  skip: (req) => process.env.NODE_ENV === 'test' || !isRenderWebService || !proxiedVisitorAddress(req)
});

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
