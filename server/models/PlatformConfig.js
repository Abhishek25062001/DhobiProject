import { SERVICE_CODES, IRONING_CODES } from '../../shared/catalogContract.mjs';
import { IRONING_PRICE_KEYS } from '../../shared/pricing.mjs';
import { LEGACY_HOME_CARE_OPTIONS } from '../../shared/legacyCatalog.mjs';
import mongoose from 'mongoose';

const detergentOptionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    shortName: { type: String, default: '', maxlength: 80 },
    sortOrder: { type: Number, default: 0, validate: Number.isInteger },
    description: { type: String, default: '' },
    extraPricePerOrder: { type: Number, default: 0, min: 0, validate: Number.isFinite },
    isActive: { type: Boolean, default: true }
  },
  { _id: false }
);

const packagingOptionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    shortName: { type: String, default: '', maxlength: 80 },
    sortOrder: { type: Number, default: 0, validate: Number.isInteger },
    description: { type: String, default: '' },
    extraPricePerOrder: { type: Number, default: 0, min: 0, validate: Number.isFinite },
    isActive: { type: Boolean, default: true }
  },
  { _id: false }
);

const serviceTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, enum: [...SERVICE_CODES] },
    name: { type: String, required: true },
    shortName: { type: String, default: '', maxlength: 80 },
    sortOrder: { type: Number, default: 0, validate: Number.isInteger },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { _id: false }
);

const ironingTierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, enum: IRONING_CODES.filter(code => code !== 'NONE') },
    name: { type: String, required: true },
    shortName: { type: String, default: '', maxlength: 80 },
    sortOrder: { type: Number, default: 0, validate: Number.isInteger },
    priceKey: { type: String, required: true, validate: function (value) { return IRONING_PRICE_KEYS[this.code] === value; } },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { _id: false }
);

const homeCareSchema = new mongoose.Schema({
  icon: { type: String, enum: ['wash', 'steam', 'dry', 'starch'], default: 'wash' },
  id: { type: String, required: true }, label: { type: String, required: true },
  shortLabel: { type: String, default: '' }, description: { type: String, default: '' },
  service: { type: String, enum: [...SERVICE_CODES], required: true },
  ironing: { type: String, enum: [...IRONING_CODES], required: true },
  sortOrder: { type: Number, default: 0, validate: Number.isInteger }, isActive: { type: Boolean, default: true },
}, { _id: false });

homeCareSchema.pre('validate', function () {
  const iron = ['WASH_AND_IRON', 'IRON_ONLY'].includes(this.service);
  if (iron === (this.ironing === 'NONE')) this.invalidate('ironing', 'Choose an applicable finish for this service.');
});

const platformConfigSchema = new mongoose.Schema(
  {
    homeCareOptions: { type: [homeCareSchema], default: () => LEGACY_HOME_CARE_OPTIONS.map((option, sortOrder) => ({ ...option, icon: option.id, sortOrder, isActive: true })) },
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
    supportEmail: { type: String, trim: true, default: '', maxlength: 180, validate: value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) },
    privacyEmail: { type: String, trim: true, default: '', maxlength: 180, validate: value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) },
    legalEmail: { type: String, trim: true, default: '', maxlength: 180, validate: value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) },
    supportHours: { type: String, trim: true, default: '', maxlength: 180 },
    businessAddress: { type: String, trim: true, default: '', maxlength: 1000 },
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
    expressTurnaroundHours: { type: Number, default: 24, min: 0, validate: Number.isFinite },
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
  }
  return config;
};

for (const field of ['detergentOptions', 'packagingOptions', 'serviceTypes', 'ironingTiers', 'homeCareOptions']) {
  platformConfigSchema.path(field).validate(options => new Set(options.map(option => option.code || option.id)).size === options.length, 'Option identifiers must be unique.');
}
for (const field of ['freeDeliveryThreshold', 'deliveryFee', 'expressSurcharge', 'gstPercentage', 'minStandardTurnaroundHours']) {
  platformConfigSchema.path(field).validate(Number.isFinite, 'A finite number is required.');
}

const PlatformConfig = mongoose.model('PlatformConfig', platformConfigSchema);
export default PlatformConfig;
