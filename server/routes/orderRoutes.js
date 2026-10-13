import express from 'express';
import {
  getAvailableSlots,
  createOrder,
  payOnlineOrder,
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

// Parameterized routes SECOND
router.post('/:id/pay-online', protect, payOnlineOrder);
router.get('/:id', protect, getOrderById);
router.patch('/:id/status', protect, authorize('admin', 'rider'), updateOrderStatus);

export default router;
