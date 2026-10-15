import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedData } from './utils/seeder.js';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import configRoutes from './routes/configRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { sanitizeInput, apiLimiter } from './middleware/securityMiddleware.js';
import errorHandler from './middleware/errorMiddleware.js';

import Order from './models/Order.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

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
  res.json({
    status: 'ok',
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

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

// Start server and trigger auto-seeder
export const startServer = async () => {
  try {
    await connectDB();
    await seedData();
    await Order.backfillMissingOtps();

    const startListening = (port) => {
      const serverInstance = app.listen(port, () => {
        console.log(`===================================================`);
        console.log(`🧺 IndoDhobi Backend Server running on port ${port}`);
        console.log(`🔗 API Base: http://localhost:${port}/api`);
        console.log(`🔗 Health:   http://localhost:${port}/api/health`);
        if (port !== Number(process.env.PORT || 5000)) {
          console.warn(`⚠️  NOTE: Server shifted to port ${port} because port ${process.env.PORT || 5000} was occupied.`);
          console.warn(`   Update client/vite.config.js proxy target to http://localhost:${port} to match.`);
        }
        console.log(`🔐 Demo Customer: customer@indodhobi.com | password123`);
        console.log(`👑 Demo Admin:    admin@indodhobi.com    | admin123`);
        console.log(`===================================================`);
      });

      serverInstance.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          const nextPort = Number(port) + 1;
          console.warn(`\n⚠️  Port ${port} is occupied (commonly macOS AirPlay Receiver on port 5000).`);
          console.log(`🔄 Automatically switching to port ${nextPort}...\n`);
          startListening(nextPort);
        } else {
          console.error('Fatal Server Error:', err);
          process.exit(1);
        }
      });

      return serverInstance;
    };

    return startListening(PORT);
  } catch (error) {
    console.error('Fatal: Failed to start IndoDhobi server:', error);
    process.exit(1);
  }
};


export { app };
export default app;

if (process.env.NODE_ENV !== 'test' && (!process.argv[1] || process.argv[1].endsWith('server.js') || process.argv[1].includes('nodemon'))) {
  startServer();
}
