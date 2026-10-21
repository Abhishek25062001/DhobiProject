import { ORDER_STATUS_VALUES } from '../../shared/orderStages.mjs';
import mongoose from 'mongoose';
import { randomInt } from 'node:crypto';
import { SERVICE_CODES, IRONING_CODES } from '../../shared/catalogContract.mjs';

const orderItemSchema = new mongoose.Schema({
  garment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garment',
    required: true
  },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  serviceLabel: String,
  ironingLabel: String,
  catalogUpdatedAt: Date,
  garmentName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 999,
    validate: Number.isInteger
  },
  serviceType: {
    type: String,
    enum: [...SERVICE_CODES],
    required: true
  },
  ironingType: {
    type: String,
    enum: [...IRONING_CODES],
    default: 'NONE'
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  lineTotal: {
    type: Number,
    required: true,
    min: 0
  },
  customDescription: {
    type: String,
    default: ''
  },
  isCustomItem: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  holdExpiresAt: Date,
  checkoutKey: String,
  checkoutHash: String,
  items: [orderItemSchema],
  billingSnapshot: { type: mongoose.Schema.Types.Mixed, immutable: true },
  customerSnapshot: { type: mongoose.Schema.Types.Mixed, immutable: true },
  preferences: {
    detergentTypeLabel: String,
    packagingTypeLabel: String,
    detergentType: {
      type: String,
      default: 'Standard',
      trim: true
    },
    packagingType: {
      type: String,
      default: 'Folded',
      trim: true
    },
    specialInstructions: {
      type: String,
      default: '',
      trim: true
    }
  },
  pickupSchedule: {
    date: {
      type: String,
      required: true
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true
    },
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    }
  },
  deliverySchedule: {
    date: {
      type: String,
      required: true
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true
    },
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    }
  },
  pickupAddress: {
    flatAndBuilding: { type: String, required: true },
    streetAndLandmark: { type: String, required: true },
    city: { type: String, required: true, default: 'New Delhi' },
    pincode: { type: String, required: true },
    contactPhone: { type: String, required: true }
  },
  isExpress: {
    type: Boolean,
    default: false
  },
  pricingBreakdown: {
    gstPercentage: Number,
    extraPreferenceFee: { type: Number, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    pickupDeliveryFee: { type: Number, required: true, default: 0 },
    expressSurcharge: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 }
  },
  payment: {
    sessionState: { type: String, enum: ['NONE', 'CREATING', 'READY', 'UNKNOWN'], default: 'NONE' },
    refundRequired: { type: Boolean, default: false },
    refundState: { type: String, enum: ['NONE', 'CREATING', 'PENDING', 'UNKNOWN', 'PROCESSED'], default: 'NONE' },
    refundId: String,
    refundKey: String,
    refundClaimedAt: Date,
    lastCheckedAt: { type: Date, default: null },
    method: {
      type: String,
      enum: ['COD', 'ONLINE'],
      required: true
    },
    onlineSubMethod: {
      type: String,
      enum: ['UPI', 'CARD', 'NET_BANKING', 'RAZORPAY_CHECKOUT', 'COMPANY_QR', 'NONE', '', null],
      default: null
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },

    // Detailed COD & Doorstep Collection Tracking
    codAmount: {
      type: Number,
      default: 0
    },
    codCollectionMethod: {
      type: String,
      enum: ['NONE', 'CASH', 'COMPANY_QR', 'UPI_QR'],
      default: 'NONE'
    },
    amountCollected: {
      type: Number,
      default: 0
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    collectedAt: {
      type: Date,
      default: null
    },
    transactionReferenceId: {
      type: String,
      trim: true,
      default: ''
    },

    // Admin Accounting & Reconciliation
    reconciliationStatus: {
      type: String,
      enum: [
        'NOT_APPLICABLE',
        'UNCOLLECTED',
        'PENDING_CASH_HANDOVER',
        'PENDING_UTR_VERIFICATION',
        'RECONCILED'
      ],
      default: 'NOT_APPLICABLE',
      index: true
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reconciledAt: {
      type: Date,
      default: null
    },
    reconciliationNotes: {
      type: String,
      trim: true,
      default: ''
    },

    transactionId: {
      type: String,
      default: null
    },
    razorpayOrderId: {
      type: String,
      default: null
    },
    razorpayPaymentId: {
      type: String,
      default: null
    },
    razorpaySignature: {
      type: String,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  orderStatus: {
    type: String,
    enum: ORDER_STATUS_VALUES,
    default: 'BOOKED',
    index: true
  },
  verificationCodes: {
    pickupOtp: {
      type: String,
      default: null
    },
    deliveryOtp: {
      type: String,
      default: null
    }
  },
  logistics: {
    // 100% Backward Compatibility: Always synchronized with currently active leg rider
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Decoupled Two-Leg Fleet Assignment
    pickupRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    pickupAssignedAt: {
      type: Date,
      default: null
    },
    pickedUpBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    deliveryRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    deliveryAssignedAt: {
      type: Date,
      default: null
    },
    deliveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    bagTagId: {
      type: String,
      trim: true,
      default: ''
    },
    inspectionNotes: {
      type: String,
      trim: true,
      default: ''
    },
    inspectionPhotos: [
      {
        url: { type: String, required: true },
        imageUrl: { type: String },
        publicId: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    verifiedGarmentCount: {
      type: Number,
      default: 0
    },
    pickedUpAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    }
  },
  statusHistory: [
    {
      status: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      updaterRole: {
        type: String,
        default: 'customer'
      },
      note: {
        type: String,
        default: ''
      }
    }
  ]
}, {
  timestamps: true,
  optimisticConcurrency: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Mirror virtual getters so order.pickupOtp and order.deliveryOtp work seamlessly
orderSchema.virtual('pickupOtp').get(function () {
  return this.verificationCodes?.pickupOtp;
});

orderSchema.virtual('deliveryOtp').get(function () {
  return this.verificationCodes?.deliveryOtp;
});

// Pre-validate hook to guarantee 4-digit OTPs, two-leg synchronization, and COD reconciliation
orderSchema.pre('validate', function (next) {
  if (!this.verificationCodes) {
    this.verificationCodes = {};
  }
  if (!this.verificationCodes.pickupOtp) {
    this.verificationCodes.pickupOtp = String(randomInt(1000, 10000));
  }
  if (!this.verificationCodes.deliveryOtp) {
    this.verificationCodes.deliveryOtp = String(randomInt(1000, 10000));
  }

  // Payment COD & Reconciliation integrity
  if (this.payment) {
    if (this.orderStatus === 'CANCELLED') {
      if (!['PAID', 'REFUNDED'].includes(this.payment.status)) {
        this.payment.status = 'CANCELLED';
      }
      this.payment.reconciliationStatus = 'NOT_APPLICABLE';
    } else if (this.payment.method === 'COD') {
      if (!this.payment.codAmount && this.pricingBreakdown?.grandTotal) {
        this.payment.codAmount = this.pricingBreakdown.grandTotal;
      }
      if (this.payment.status === 'PENDING' && (!this.payment.reconciliationStatus || this.payment.reconciliationStatus === 'NOT_APPLICABLE')) {
        this.payment.reconciliationStatus = 'UNCOLLECTED';
      }
      if (!this.payment.status || this.payment.status === '') {
        this.payment.status = 'PENDING';
      }
    } else if (this.payment.method === 'ONLINE') {
      if (!this.payment.reconciliationStatus || this.payment.reconciliationStatus === 'UNCOLLECTED') {
        this.payment.reconciliationStatus = 'NOT_APPLICABLE';
      }
    }
  }

  // Decoupled Two-Leg Logistics Synchronization (100% Backward Compatible)
  if (this.logistics) {
    const isDeliveryLeg = ['READY', 'QUALITY_CHECK', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(this.orderStatus);
    if (isDeliveryLeg) {
      this.logistics.assignedRider = this.logistics.deliveryRider || this.logistics.pickupRider || this.logistics.assignedRider || null;
    } else {
      this.logistics.assignedRider = this.logistics.pickupRider || this.logistics.deliveryRider || this.logistics.assignedRider || null;
    }

    if (this.pickupSchedule) {
      if (this.logistics.pickupRider) {
        this.pickupSchedule.assignedRider = this.logistics.pickupRider;
        if (!this.pickupSchedule.assignedAt) this.pickupSchedule.assignedAt = this.logistics.pickupAssignedAt || new Date();
      }
    }

    if (this.deliverySchedule) {
      if (this.logistics.deliveryRider) {
        this.deliverySchedule.assignedRider = this.logistics.deliveryRider;
        if (!this.deliverySchedule.assignedAt) this.deliverySchedule.assignedAt = this.logistics.deliveryAssignedAt || new Date();
      }
    }
  }

  next();
});

// Bounded cursor migration; never load all legacy orders into memory.
orderSchema.statics.backfillMissingOtps = async function () {
  const cursor = this.find({ $or: [
    { 'verificationCodes.pickupOtp': null }, { 'verificationCodes.pickupOtp': '' },
    { 'verificationCodes.deliveryOtp': null }, { 'verificationCodes.deliveryOtp': '' }
  ] }).select('_id verificationCodes').lean().cursor({ batchSize: 100 });
  for await (const order of cursor) {
    for (const key of ['pickupOtp', 'deliveryOtp']) {
      if (order.verificationCodes?.[key]) continue;
      await this.updateOne({ _id: order._id, $or: [{ [`verificationCodes.${key}`]: null }, { [`verificationCodes.${key}`]: '' }] },
        { $set: { [`verificationCodes.${key}`]: String(randomInt(1000, 10000)) }, $inc: { __v: 1 } });
    }
  }
};

// Durable retry identity and provider lookup. Existing orders omit checkoutKey.
orderSchema.index({ customer: 1, checkoutKey: 1 }, { unique: true, partialFilterExpression: { checkoutKey: { $type: 'string' } } });
orderSchema.index({ 'payment.razorpayOrderId': 1 }, { unique: true, partialFilterExpression: { 'payment.razorpayOrderId': { $type: 'string' } } });
orderSchema.index({ 'payment.razorpayPaymentId': 1 }, { unique: true, partialFilterExpression: { 'payment.razorpayPaymentId': { $type: 'string' } } });
for (const leg of ['pickupSchedule', 'deliverySchedule']) orderSchema.index({ [`${leg}.date`]: 1, [`${leg}.timeSlot`]: 1, orderStatus: 1 });
orderSchema.index({ 'payment.method': 1, 'payment.status': 1, holdExpiresAt: 1 });
orderSchema.index({ 'payment.lastCheckedAt': 1, _id: 1 });
// Production Compound Indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, 'pickupSchedule.date': 1 });
orderSchema.index({ 'logistics.assignedRider': 1 });
orderSchema.index({ 'logistics.pickupRider': 1 });
orderSchema.index({ 'logistics.deliveryRider': 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
