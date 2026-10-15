import express from 'express';
import { getGarments, createGarment, updateGarment, saveGarment, getCategories } from '../controllers/catalogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/garments', getGarments);
router.post('/garments', protect, authorize('admin'), createGarment);
router.put('/garments/:id', protect, authorize('admin'), updateGarment);

export default router;
