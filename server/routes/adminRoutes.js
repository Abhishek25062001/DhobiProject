import express from 'express';
import {
  getAdminRiders,
  createRider,
  updateRider,
  toggleRiderStatus,
  deleteRider,
  getAdminUsers,
  updateAdminUser,
  toggleUserStatus,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminPayments,
  updateAdminPaymentStatus,
  reconcileRiderCash,
  getAdminNotifications,
  sendAdminNotification
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict RBAC: All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

// 1. Rider Fleet Management
router.get('/riders', getAdminRiders);
router.post('/riders', createRider);
router.put('/riders/:id', updateRider);
router.patch('/riders/:id/status', toggleRiderStatus);
router.delete('/riders/:id', deleteRider);

// 2. Users & Addresses Directory
router.get('/users', getAdminUsers);
router.put('/users/:id', updateAdminUser);
router.patch('/users/:id/status', toggleUserStatus);

// 3. Dynamic Categories
router.get('/categories', getAdminCategories);
router.post('/categories', createAdminCategory);
router.put('/categories/:id', updateAdminCategory);
router.delete('/categories/:id', deleteAdminCategory);

// 4. Payments Ledger
router.get('/payments', getAdminPayments);
router.post('/payments/reconcile-rider-cash', reconcileRiderCash);
router.patch('/payments/:orderId', updateAdminPaymentStatus);

// 5. System Notifications & Broadcast Announcements
router.get('/notifications', getAdminNotifications);
router.post('/notifications', sendAdminNotification);

export default router;
