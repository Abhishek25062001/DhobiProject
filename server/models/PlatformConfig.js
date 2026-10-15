import mongoose from 'mongoose';

const detergentOptionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    extraPricePerOrder: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { _id: false }
);

const packagingOptionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    extraPricePerOrder: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { _id: false }
);

const serviceTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { _id: false }
);

const ironingTierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    priceKey: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { _id: false }
);

const platformConfigSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      default: 'IndoDhobi Laundry & Dry Cleaning Pvt. Ltd.',
      trim: true
    },
    gstin: {
      type: String,
      default: '07AABCI1234F1Z5',
      trim: true
    },
    sacCode: {
      type: String,
      default: '999712',
      trim: true
    },
    supportPhone: {
      type: String,
      default: '+91 98765 43210',
      trim: true
    },
    freeDeliveryThreshold: {
      type: Number,
      default: 399,
      min: 0
    },
    deliveryFee: {
      type: Number,
      default: 49,
      min: 0
    },
    expressSurcharge: {
      type: Number,
      default: 99,
      min: 0
    },
    gstPercentage: {
      type: Number,
      default: 5,
      min: 0,
      max: 100
    },
    minStandardTurnaroundHours: {
      type: Number,
      default: 24,
      min: 0
    },
    detergentOptions: {
      type: [detergentOptionSchema],
      default: [
        {
          code: 'Standard',
          name: 'Standard Gentle',
          description: 'Mild German liquid detergent for daily wear.',
          extraPricePerOrder: 0,
          isActive: true
        },
        {
          code: 'Hypoallergenic',
          name: 'Hypoallergenic Baby-Safe',
          description: 'Dermatologist-tested, zero fragrance or allergens.',
          extraPricePerOrder: 0,
          isActive: true
        },
        {
          code: 'Fabric Softener Plus',
          name: 'Fabric Softener Plus',
          description: 'Enriched with natural botanical softening conditioners.',
          extraPricePerOrder: 0,
          isActive: true
        }
      ]
    },
    packagingOptions: {
      type: [packagingOptionSchema],
      default: [
        {
          code: 'Folded',
          name: 'Neatly Folded in Eco-Bags',
          description: 'Protected in breathable, biodegradable paper totes for your wardrobe shelves.',
          extraPricePerOrder: 0,
          isActive: true
        },
        {
          code: 'On Hangers',
          name: 'Crisp on Hangers',
          description: 'Ready-to-hang wooden / wire hangers wrapped in dust covers.',
          extraPricePerOrder: 0,
          isActive: true
        }
      ]
    },
    serviceTypes: {
      type: [serviceTypeSchema],
      default: [
        {
          code: 'WASH_AND_FOLD',
          name: 'Wash & Fold Only (No Press)',
          description: 'Machine washed with premium liquid detergent, tumble dried and folded.',
          isActive: true
        },
        {
          code: 'WASH_AND_IRON',
          name: 'Wash & Iron (+ Steam Press)',
          description: 'Washed, dried, and vacuum steam ironed for a wrinkle-free look.',
          isActive: true
        },
        {
          code: 'IRON_ONLY',
          name: 'Ironing Only (No Wash)',
          description: 'Industrial high-pressure steam pressing.',
          isActive: true
        },
        {
          code: 'DRY_CLEAN',
          name: 'Professional Dry Clean',
          description: 'Eco-friendly solvent dry cleaning for delicate fabrics and formalwear.',
          isActive: true
        }
      ]
    },
    ironingTiers: {
      type: [ironingTierSchema],
      default: [
        {
          code: 'STANDARD_STEAM',
          name: 'Standard Steam Iron',
          priceKey: 'standardSteamIron',
          description: 'Standard temperature controlled steam finish.',
          isActive: true
        },
        {
          code: 'CRISP_STARCH',
          name: 'Crisp Starch Press',
          priceKey: 'crispStarchPress',
          description: 'Stiff, professional starch press for formal cotton shirts & kurtas.',
          isActive: true
        },
        {
          code: 'DELICATE_PRESS',
          name: 'Delicate Low-Heat Press',
          priceKey: 'delicatePress',
          description: 'Ultra low-heat delicate press for silks, georgettes & fine linens.',
          isActive: true
        }
      ]
    },
    // Production Official Company Dynamic UPI QR & Payment Rules
    companyPaymentConfig: {
      merchantUpiId: {
        type: String,
        default: 'indodhobi.official@icici',
        trim: true
      },
      merchantName: {
        type: String,
        default: 'IndoDhobi Laundry Pvt Ltd',
        trim: true
      },
      officialQrImageUrl: {
        type: String,
        default: '',
        trim: true
      },
      allowCashOnDelivery: {
        type: Boolean,
        default: true
      },
      allowCompanyQrOnDelivery: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

platformConfigSchema.statics.getOrCreateActiveConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  } else if (!config.companyPaymentConfig || !config.companyPaymentConfig.merchantUpiId) {
    config.companyPaymentConfig = {
      merchantUpiId: 'indodhobi.official@icici',
      merchantName: 'IndoDhobi Laundry Pvt Ltd',
      officialQrImageUrl: config.companyPaymentConfig?.officialQrImageUrl || '',
      allowCashOnDelivery: config.companyPaymentConfig?.allowCashOnDelivery !== false,
      allowCompanyQrOnDelivery: config.companyPaymentConfig?.allowCompanyQrOnDelivery !== false
    };
    await config.save();
  }
  return config;
};

const PlatformConfig = mongoose.model('PlatformConfig', platformConfigSchema);
export default PlatformConfig;
