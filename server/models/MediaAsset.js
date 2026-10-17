import mongoose from 'mongoose';

export const mediaReferenceSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset', required: true },
  alt: { type: String, maxlength: 300 },
  decorative: { type: Boolean, default: false },
}, { _id: false });

export default mongoose.model('MediaAsset', new mongoose.Schema({
  name: { type: String, required: true, maxlength: 160 },
  defaultAlt: { type: String, default: '', maxlength: 300 },
  provider: { type: String, enum: ['cloudinary', 'local', 'external'], required: true },
  publicId: String,
  url: { type: String, required: true },
  mimeType: String, bytes: Number, width: Number, height: Number,
  crop: { position: String, size: String, kind: String },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['ready', 'archived'], default: 'ready' },
  scope: { type: String, enum: ['website', 'inspection'], default: 'website' },
  sourceKey: { type: String, sparse: true, unique: true },
  history: [{ url: String, publicId: String, version: Number }],
}, { timestamps: true }));
