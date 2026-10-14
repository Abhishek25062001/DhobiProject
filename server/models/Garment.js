import mongoose from 'mongoose';

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
  pricing: {
    washOnly: {
      type: Number,
      required: true,
      min: 0
    },
    standardSteamIron: {
      type: Number,
      required: true,
      min: 0
    },
    crispStarchPress: {
      type: Number,
      required: true,
      min: 0
    },
    delicatePress: {
      type: Number,
      required: true,
      min: 0
    },
    dryClean: {
      type: Number,
      required: true,
      min: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Production Compound Index
garmentSchema.index({ category: 1, isActive: 1 });

const Garment = mongoose.model('Garment', garmentSchema);
export default Garment;
