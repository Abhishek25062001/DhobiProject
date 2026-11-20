import express from 'express';
import { collectEvents, getAnalyticsReport, getAnalyticsLive } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { analyticsLimiter } from '../middleware/securityMiddleware.js';

export const publicAnalyticsRoutes = express.Router();
publicAnalyticsRoutes.post('/collect', analyticsLimiter, collectEvents);

export const adminAnalyticsRoutes = express.Router();
adminAnalyticsRoutes.use(protect, authorize('admin'));
adminAnalyticsRoutes.get('/report', getAnalyticsReport);
adminAnalyticsRoutes.get('/live', getAnalyticsLive);
