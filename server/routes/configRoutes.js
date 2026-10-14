import express from 'express';
import {
  getPublicConfig,
  updateConfigSettings,
  getAllSlots,
  createSlot,
  updateSlot,
  uploadImage
} from '../controllers/configController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public bootstrap config & active slots
router.get('/public', getPublicConfig);

// Platform Settings (Admin only)
router.put('/settings', protect, authorize('admin'), updateConfigSettings);

// Dynamic Time Slots (Admin only)
router.get('/slots/all', protect, authorize('admin'), getAllSlots);
router.post('/slots', protect, authorize('admin'), createSlot);
router.put('/slots/:id', protect, authorize('admin'), updateSlot);

// Media / Image Upload (Admin & Rider)
router.post('/upload-image', protect, authorize('admin', 'rider'), uploadImage);

export default router;
