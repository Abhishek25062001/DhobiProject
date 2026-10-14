import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { seedData } from './utils/seeder.js';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { sanitizeInput, apiLimiter } from './middleware/securityMiddleware.js';
import errorHandler from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Production HTTP security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Enable CORS for client
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.CLIENT_URL || 'http://localhost:5173'
  ],
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'IndoDhobi Backend API',
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

// 404 handler
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

    const serverInstance = app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`🧺 IndoDhobi Backend Server running on port ${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`🔐 Demo Customer: customer@indodhobi.com | password123`);
      console.log(`👑 Demo Admin:    admin@indodhobi.com    | admin123`);
      console.log(`===================================================`);
    });
    return serverInstance;
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
