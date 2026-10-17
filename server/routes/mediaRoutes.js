import express from 'express';
import MediaAsset from '../models/MediaAsset.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';
import { uploadMedia, mediaUsage } from '../services/media.js';

const router = express.Router();
router.use(protect, authorize('admin'));
const handle = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) { res.status(error.statusCode || 400).json({ success: false, message: error.message }); }
};
router.get('/', handle(async (req, res) => {
  const data = await MediaAsset.find({ scope: 'website', ...(req.query.includeArchived === 'true' ? {} : { status: 'ready' }) }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));
router.post('/:id/restore', handle(async (req, res) => {
  const data = await MediaAsset.findOneAndUpdate({ _id: req.params.id, scope: 'website' }, { $set: { status: 'ready' }, $inc: { version: 1 } }, { new: true });
  if (!data) return res.status(404).json({ success: false, message: 'Image not found.' });
  res.json({ success: true, data });
}));
router.post('/', handle(async (req, res) => {
  const data = await uploadMedia(req.body.imageBase64, { name: req.body.name, defaultAlt: req.body.defaultAlt });
  res.status(201).json({ success: true, data });
}));
router.put('/:id', handle(async (req, res) => {
  const current = await MediaAsset.findOne({ _id: req.params.id, status: 'ready', scope: 'website' });
  if (!current) return res.status(404).json({ success: false, message: 'Image not found.' });
  if (req.body.version !== current.version) return res.status(409).json({ success: false, message: 'This image changed. Reload the library before saving.' });
  const replacement = req.body.imageBase64 ? await uploadImageToCloudinary(req.body.imageBase64, 'indodhobi/website') : null;
  const changes = {};
  for (const field of ['name', 'defaultAlt']) if (req.body[field] !== undefined) changes[field] = req.body[field];
  if (replacement) Object.assign(changes, replacement, { provider: 'cloudinary', crop: null });
  const data = await MediaAsset.findOneAndUpdate({ _id: current._id, version: current.version }, {
    $set: changes, $inc: { version: 1 },
    ...(replacement ? { $push: { history: { url: current.url, publicId: current.publicId, version: current.version } } } : {}),
  }, { new: true, runValidators: true });
  if (!data) {
    if (replacement) await MediaAsset.create({ ...replacement, name: 'Unused replacement', provider: 'cloudinary', status: 'archived' });
    return res.status(409).json({ success: false, message: 'Another save completed first. Reload the image.' });
  }
  res.json({ success: true, data });
}));
router.delete('/:id', handle(async (req, res) => {
  const asset = await MediaAsset.findById(req.params.id);
  if (!asset) return res.status(404).json({ success: false, message: 'Image not found.' });
  if (await mediaUsage(asset)) return res.status(409).json({ success: false, message: 'This image is still in use. Remove its references before archiving.' });
  asset.status = 'archived';
  await asset.save();
  res.json({ success: true, message: 'Image archived. The stored file is retained for recovery.' });
}));
export default router;
