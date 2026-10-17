import mongoose from 'mongoose';
import { GARMENT_PRICE_KEYS, SERVICE_CODES, IRONING_CODES } from '../../shared/catalogContract.mjs';
import { mediaReferenceSchema } from './MediaAsset.js';

const garmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Garment name is required'],
    trim: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
  shortName: { type: String, default: '', trim: true, maxlength: 80 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  sortOrder: { type: Number, default: 0, validate: Number.isInteger },
  allowedServices: { type: [{ type: String, enum: [...SERVICE_CODES] }], default: () => [...SERVICE_CODES] },
  allowedIroningTiers: { type: [{ type: String, enum: IRONING_CODES.filter(code => code !== 'NONE') }], default: () => IRONING_CODES.filter(code => code !== 'NONE') },
  iconName: {
    type: String,
    default: 'Shirt',
    trim: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  primaryImage: { type: mediaReferenceSchema, default: undefined },
  gallery: { type: [mediaReferenceSchema], default: [] },
  cloudinaryPublicId: {
    type: String,
    default: ''
  },
  pricing: Object.fromEntries(GARMENT_PRICE_KEYS.map(key => [key, {
    type: Number,
    required: true,
    min: 0
  }])),
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isCustom: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Production Compound Index
garmentSchema.index({ category: 1, isActive: 1 });

const Garment = mongoose.model('Garment', garmentSchema);
export default Garment;
