import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { seedData } from './utils/seeder.js';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server and trigger auto-seeder
const startServer = async () => {
  try {
    await connectDB();
    await seedData();

    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`🧺 IndoDhobi Backend Server running on port ${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`🔐 Demo Customer: customer@indodhobi.com | password123`);
      console.log(`👑 Demo Admin:    admin@indodhobi.com    | admin123`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Fatal: Failed to start IndoDhobi server:', error);
    process.exit(1);
  }
};

startServer();
