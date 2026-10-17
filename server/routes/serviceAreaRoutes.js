import { publicArea } from '../services/publicProjection.js';
import express from 'express';
import mongoose from 'mongoose';
import ServiceArea from '../models/ServiceArea.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

export const publicServiceAreaRoutes = express.Router();
export const adminServiceAreaRoutes = express.Router();
adminServiceAreaRoutes.use(protect, authorize('admin'));
const fields = ['slug', 'name', 'shortName', 'summary', 'footerLabel', 'badge', 'homeBadge', 'pincodeRange', 'turnaround', 'hours', 'timezone', 'coverage', 'pincodes', 'sortOrder', 'isActive'];
const fail = (res, error) => res.status(error.code === 11000 ? 409 : 400).json({ success: false, message: error.code === 11000 ? 'A hub already uses this slug or an active hub already covers one of these pincodes.' : error.message });
async function list(req, res, next) {
  try {
    const areas = await ServiceArea.find(req.baseUrl.includes('/admin/') ? {} : { isActive: true }).sort({ sortOrder: 1, _id: 1 }).lean();
    res.set('Cache-Control', 'no-store').json({ success: true, areas: req.baseUrl.includes('/admin/') ? areas : areas.map(publicArea) });
  } catch (error) { next(error); }
}
publicServiceAreaRoutes.get('/', list);
adminServiceAreaRoutes.get('/', list);
publicServiceAreaRoutes.get('/check', async (req, res, next) => {
  try {
    if (typeof req.query.pincode !== 'string' || !/^[1-9]\d{5}$/.test(req.query.pincode)) return res.status(400).json({ success: false, message: 'Enter a valid six-digit pincode.' });
    const area = await ServiceArea.findOne({ pincodes: req.query.pincode, isActive: true }).lean();
    res.set('Cache-Control', 'no-store').json({ success: true, serviceable: Boolean(area), area: publicArea(area) });
  } catch (error) { next(error); }
});
adminServiceAreaRoutes.post('/', async (req, res) => {
  try {
    await ServiceArea.init();
    const area = await ServiceArea.create(Object.fromEntries(fields.filter(key => Object.hasOwn(req.body, key)).map(key => [key, req.body[key]])));
    res.status(201).json({ success: true, area });
  } catch (error) { fail(res, error); }
});
adminServiceAreaRoutes.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id) || !Number.isInteger(req.body.revision)) throw new Error('A valid hub and revision are required.');
    const current = await ServiceArea.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Hub not found.' });
    const changes = Object.fromEntries(fields.filter(key => key !== 'slug' && Object.hasOwn(req.body, key)).map(key => [key, req.body[key]]));
    if (Object.hasOwn(changes, 'isActive') && typeof changes.isActive !== 'boolean') throw new Error('Active must be true or false.');
    Object.assign(current, changes);
    await current.validate();
    const area = await ServiceArea.findOneAndUpdate({ _id: current._id, revision: req.body.revision }, { $set: changes, $inc: { revision: 1 } }, { new: true, runValidators: true });
    if (!area) return res.status(409).json({ success: false, message: 'This hub changed. Reload and review the latest revision.' });
    res.json({ success: true, area });
  } catch (error) { fail(res, error); }
});
