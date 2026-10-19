import express from 'express';
import { sectionTemplates } from '../services/sectionTemplates.js';
import mongoose from 'mongoose';
import SiteContent from '../models/SiteContent.js';
import MediaAsset from '../models/MediaAsset.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { publicMedia } from '../services/media.js';
import { PAGE_KEYS, validatePageContent, mediaReferences, visibleContentItems } from '../../shared/contentSchema.mjs';

export const publicContentRoutes = express.Router();
export const adminContentRoutes = express.Router();
adminContentRoutes.use(protect, authorize('admin'));
async function resolvedPage(page) {
  const filterVisible = value => Array.isArray(value) ? value.filter(item => item?.isVisible !== false).map(filterVisible) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, filterVisible(child)])) : value;
  const result = filterVisible(JSON.parse(JSON.stringify(page)));
  const refs = mediaReferences([result.seo, result.sections]);
  const assets = await MediaAsset.find({ _id: { $in: refs.map(ref => ref.assetId) }, status: 'ready', scope: 'website' }).lean();
  for (const ref of refs) ref.asset = publicMedia(assets.find(asset => String(asset._id) === ref.assetId));
  result.sections = visibleContentItems(result.sections);
  delete result.mediaAssetIds;
  delete result.__v;
  return result;
}
publicContentRoutes.get('/:pageKey', async (req, res) => {
  try {
    if (!PAGE_KEYS.includes(req.params.pageKey)) return res.status(404).json({ success: false, message: 'Page not found.' });
    const page = await SiteContent.findOne({ pageKey: req.params.pageKey }).lean();
    return res.set('Cache-Control', 'no-store').json({ success: true, page: page ? await resolvedPage(page) : null });
  } catch { return res.status(500).json({ success: false, message: 'Content could not be loaded.' }); }
});
adminContentRoutes.get('/:pageKey/section-templates', async (req, res, next) => {
  try {
    if (!PAGE_KEYS.includes(req.params.pageKey)) return res.status(404).json({ success: false, message: 'Page not found.' });
    res.set('Cache-Control', 'no-store').json({ success: true, sections: await sectionTemplates(req.params.pageKey) });
  } catch (error) { next(error); }
});
adminContentRoutes.get('/:pageKey', async (req, res) => {
  if (!PAGE_KEYS.includes(req.params.pageKey)) return res.status(404).json({ success: false, message: 'Page not found.' });
  const page = await SiteContent.findOne({ pageKey: req.params.pageKey }).lean();
  return res.set('Cache-Control', 'no-store').json({ success: true, page });
});
adminContentRoutes.put('/:pageKey', async (req, res) => {
  try {
    const page = { pageKey: req.params.pageKey, schemaVersion: req.body.schemaVersion, revision: req.body.revision, seo: req.body.seo, sections: req.body.sections };
    validatePageContent(page);
    const references = mediaReferences([page.seo, page.sections]);
    const ids = [...new Set(references.map(ref => String(ref.assetId)))];
    if (await MediaAsset.countDocuments({ _id: { $in: ids }, status: 'ready', scope: 'website' }) !== ids.length) return res.status(400).json({ success: false, message: 'A selected image is unavailable. Choose an active library image.' });
    const config = await PlatformConfig.findOne();
    for (const section of page.sections) {
      if (section.type === 'hero' && config && section.content.turnaroundHours < config.minStandardTurnaroundHours) throw new Error('The advertised turnaround cannot be shorter than the minimum standard booking interval.');
      if (section.type === 'services') for (const item of section.content.items) {
        if (['WASH_AND_IRON', 'IRON_ONLY'].includes(item.service) === (item.ironing === 'NONE')) throw new Error('Service promotions must select an applicable ironing finish.');
      }
    }
    const mediaAssetIds = ids.map(id => new mongoose.Types.ObjectId(id));
    let saved;
    if (page.revision === 0) saved = await SiteContent.create({ ...page, revision: 1, mediaAssetIds });
    else saved = await SiteContent.findOneAndUpdate({ pageKey: page.pageKey, revision: page.revision }, { $set: { ...page, revision: page.revision + 1, mediaAssetIds } }, { new: true });
    if (!saved) return res.status(409).json({ success: false, message: 'This page changed since you opened it. Reload and review the newer revision.' });
    const warnings = [];
    for (const section of page.sections.filter(section => section.type === 'testimonials')) {
      for (const item of section.content.items) if (/[₹%]|\b\d+\s*(?:hours?|days?)\b/i.test(item.comment)) warnings.push(`Review numerical claims in the testimonial by ${item.name} against current pricing and rules.`);
    }
    return res.json({ success: true, page: saved, warnings });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 400).json({ success: false, message: error.code === 11000 ? 'This page already exists. Reload before saving.' : error.message });
  }
});
