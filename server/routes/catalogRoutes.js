import express from 'express';
import { getGarments, saveGarment } from '../controllers/catalogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/garments', getGarments);
router.post('/garments', protect, authorize('admin'), saveGarment);

export default router;
