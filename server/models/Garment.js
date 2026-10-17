import mongoose from 'mongoose';
import { GARMENT_PRICE_KEYS } from '../../shared/catalogContract.mjs';

const garmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Garment name is required'],
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Men', 'Women', 'Household', 'Winter & Heavy'],
    index: true
  },
  iconName: {
    type: String,
    default: 'Shirt',
    trim: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
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
