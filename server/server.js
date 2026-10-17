import contentRevision from './middleware/contentRevision.js';
import { publicServiceAreaRoutes, adminServiceAreaRoutes } from './routes/serviceAreaRoutes.js';
import { publicContentRoutes, adminContentRoutes } from './routes/contentRoutes.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import { apiPort } from '../shared/runtime.mjs';
import { startHttpService } from './utils/startHttpService.js';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import configRoutes from './routes/configRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import { sanitizeInput, apiLimiter } from './middleware/securityMiddleware.js';
import errorHandler from './middleware/errorMiddleware.js';

import Order from './models/Order.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Production HTTP security headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com", "https:*"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://apis.google.com", "https://www.gstatic.com"],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://*.firebaseapp.com", "https://www.google.com"],
        connectSrc: ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com", "https://*.googleapis.com", "https://*.firebaseio.com", "https://res.cloudinary.com", "http://localhost:*", "ws://localhost:*"]
      }
    }
  })
);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'https://dhobi-project.vercel.app'
]);

for (const entry of (process.env.CLIENT_URL || '').split(',')) {
  const origin = entry.trim().replace(/\/$/, '');
  if (origin) allowedOrigins.add(origin);
}

// Enable CORS for local dev and the hosted frontend
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true
}));

// Body parser with 25mb limit for Base64 image uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// NoSQL Injection input sanitization (strips '$' and '.' operators)
app.use(sanitizeInput);

// Global API rate limiting
app.use('/api', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Enhanced Health check endpoint — exposes real DB host for audit verification
app.get('/api/health', (req, res) => {
  const conn = mongoose.connection;
  const ready = conn.readyState === 1 && !app.locals.initializing;
  res.set('Cache-Control', 'no-store').status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'unavailable',
    ready,
    service: 'IndoDhobi API',
    uptime: process.uptime(),
    dbState: conn.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    dbHost: conn.host || null,
    dbName: conn.name || null,
    timestamp: new Date().toISOString(),
    razorpayConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID &&
      !process.env.RAZORPAY_KEY_ID.includes('placeholder')
    )
  });
});

// Reject immediately while starting or disconnected instead of buffering DB queries.
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1 || app.locals.initializing) {
    return res.set('Retry-After', '1').status(503).json({
      success: false,
      code: 'API_UNAVAILABLE',
      message: 'The service is temporarily unavailable. Please try again.',
    });
  }
  next();
});

// API Routes
app.use(contentRevision);
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/service-areas', publicServiceAreaRoutes);
app.use('/api/admin/service-areas', adminServiceAreaRoutes);
app.use('/api/content', publicContentRoutes);
app.use('/api/admin/content', adminContentRoutes);

// Production Static Asset Serving
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found.`
  });
});

// General 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found.`
  });
});

// Centralized Global Error Handler
app.use(errorHandler);

// Startup connects only. Catalog/content defaults require an explicit migration.
export const startServer = async () => {
  const port = apiPort(process.env.PORT);
  const server = await startHttpService(app, {
    port,
    initialize: async () => {
      await connectDB();
      await Order.backfillMissingOtps();
    },
    cleanup: disconnectDB,
  });
  console.log(`IndoDhobi API ready at http://localhost:${port}/api`);
  return server;
};


export { app };
export default app;

if (process.env.NODE_ENV !== 'test' && process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch(error => {
    console.error(`Failed to start IndoDhobi API: ${error.message}`);
    process.exitCode = 1;
  });
}
