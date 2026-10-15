import express from 'express';
import {
  register,
  login,
  getMe,
  getProfile,
  updateProfile,
  uploadAvatar,
  addAlternatePhone,
  deleteAlternatePhone,
  addAddress,
  updateAddress,
  deleteAddress,
  customerFirebaseLogin,
  completeOnboarding,
  staffLogin
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();

router.post('/customer/firebase-login', authLimiter, customerFirebaseLogin);
router.post('/complete-onboarding', protect, completeOnboarding);
router.post('/staff/login', authLimiter, staffLogin);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

router.get('/me', protect, getMe);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile/avatar', protect, uploadAvatar);
router.post('/profile/phones', protect, addAlternatePhone);
router.delete('/profile/phones/:phoneId', protect, deleteAlternatePhone);

router.post('/addresses', protect, addAddress);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

export default router;
