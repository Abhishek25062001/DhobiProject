import mongoose from 'mongoose';
import { PAGE_KEYS } from '../../shared/contentSchema.mjs';
const schema = new mongoose.Schema({
  pageKey: { type: String, enum: PAGE_KEYS, required: true, unique: true },
  schemaVersion: { type: Number, default: 1, required: true },
  revision: { type: Number, default: 1, required: true },
  seo: { type: mongoose.Schema.Types.Mixed, required: true },
  sections: { type: [mongoose.Schema.Types.Mixed], default: [] },
  mediaAssetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset', index: true }],
}, { timestamps: true });
export default mongoose.model('SiteContent', schema);
