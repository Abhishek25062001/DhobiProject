import express from 'express';
import {
  getAvailableSlots,
  createOrder,
  verifyPayment,
  payOnlineOrder,
  retryPayment,
  switchToCod,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / customer slot lookup
router.get('/slots', getAvailableSlots);

// Specific named routes FIRST
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/all', protect, authorize('admin', 'rider'), getAllOrders);
router.post('/verify-payment', protect, verifyPayment);

// Parameterized routes SECOND
router.post('/:id/pay-online', protect, payOnlineOrder);
router.post('/:id/retry-payment', protect, retryPayment);
router.post('/:id/switch-to-cod', protect, switchToCod);
router.get('/:id', protect, getOrderById);
router.patch('/:id/status', protect, authorize('admin', 'rider'), updateOrderStatus);

export default router;
