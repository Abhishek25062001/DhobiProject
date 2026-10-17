import express from 'express';
import {
  getAvailableSlots,
  createOrder, previewOrder,
  verifyPayment,
  payOnlineOrder,
  retryPayment,
  switchToCod,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getRiders,
  assignRider,
  getRiderTasks,
  verifyPickup,
  verifyDelivery,
  acceptRiderTask,
  reconcileCodPayment,
  getActiveCoupons,
  validateCoupon,
  createCoupon,
  getAllCoupons,
  toggleCoupon,
  getOrderAnalytics,
  cancelOrder,
  getMyActiveOrders,
  recordPaymentFailure,
  handleRazorpayWebhook
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public slot lookup & coupons
router.get('/slots', getAvailableSlots);
router.get('/coupons', getActiveCoupons);

// Specific named routes FIRST
router.get('/coupons/all', protect, authorize('admin'), getAllCoupons);
router.patch('/coupons/:id/toggle', protect, authorize('admin'), toggleCoupon);
router.post('/validate-coupon', protect, validateCoupon);
router.post('/coupons', protect, authorize('admin'), createCoupon);
router.get('/analytics', protect, authorize('admin'), getOrderAnalytics);
router.post('/quote', protect, previewOrder);
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/my-active', protect, getMyActiveOrders);
router.post('/webhook/razorpay', handleRazorpayWebhook);
router.get('/all', protect, authorize('admin', 'rider'), getAllOrders);
router.get('/riders', protect, authorize('admin'), getRiders);
router.get('/rider-tasks', protect, authorize('rider', 'admin'), getRiderTasks);
router.post('/verify-payment', protect, verifyPayment);

// Parameterized routes SECOND
router.post('/:id/cancel', protect, cancelOrder);
router.post('/:id/pay-online', protect, payOnlineOrder);
router.post('/:id/retry-payment', protect, retryPayment);
router.post('/:id/payment-failed', protect, recordPaymentFailure);
router.post('/:id/switch-to-cod', protect, switchToCod);
router.patch('/:id/assign-rider', protect, authorize('admin'), assignRider);
router.post('/:id/accept-task', protect, authorize('rider', 'admin'), acceptRiderTask);
router.post('/:id/verify-pickup', protect, authorize('rider', 'admin'), verifyPickup);
router.post('/:id/verify-delivery', protect, authorize('rider', 'admin'), verifyDelivery);
router.patch('/:id/reconcile-cod', protect, authorize('admin'), reconcileCodPayment);
router.get('/:id', protect, getOrderById);
router.patch('/:id/status', protect, authorize('admin', 'rider'), updateOrderStatus);

export default router;

