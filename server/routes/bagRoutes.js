import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getSavedBag, saveBag } from '../services/bagRecovery.js';

// Signed-in customer's saved laundry bag.
const router = express.Router();
router.use(protect);

// @route GET /api/bag
router.get('/', async (req, res) => {
  try {
    return res.set('Cache-Control', 'no-store').json({ success: true, bag: (await getSavedBag(req.user._id)) || { items: [], cartValue: 0, cartItems: 0 } });
  } catch (error) {
    console.error('[Saved Bag Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Your saved bag could not be loaded.' });
  }
});

// @route PUT /api/bag  { items: [{ garmentId, quantity, serviceType, ironingType, isCustomItem, customDescription, cartItemId }] }
router.put('/', async (req, res) => {
  try {
    return res.json({ success: true, bag: await saveBag(req.user._id, req.body?.items) });
  } catch (error) {
    if (!error.statusCode) console.error('[Saved Bag Error]:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Your bag could not be saved.' });
  }
});

export default router;
