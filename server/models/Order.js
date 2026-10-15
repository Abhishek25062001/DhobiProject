import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  garment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garment',
    required: true
  },
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
    min: 1
  },
  serviceType: {
    type: String,
    enum: ['WASH_AND_FOLD', 'WASH_AND_IRON', 'IRON_ONLY', 'DRY_CLEAN'],
    required: true
  },
  ironingType: {
    type: String,
    enum: ['NONE', 'STANDARD_STEAM', 'CRISP_STARCH', 'DELICATE_PRESS'],
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
  items: [orderItemSchema],
  preferences: {
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
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    pickupDeliveryFee: { type: Number, required: true, default: 0 },
    expressSurcharge: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 }
  },
  payment: {
    method: {
      type: String,
      enum: ['COD', 'ONLINE'],
      required: true
    },
    onlineSubMethod: {
      type: String,
      enum: ['UPI', 'CARD', 'NET_BANKING', 'RAZORPAY_CHECKOUT', 'NONE', '', null],
      default: null
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true
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
    enum: [
      'ORDER_PLACED',
      'BOOKED',
      'CONFIRMED',
      'PICKUP_SCHEDULED',
      'PICKUP_ASSIGNED',
      'OUT_FOR_PICKUP',
      'PICKED_UP',
      'IN_WASH',
      'IN_WASHING',
      'IN_IRONING',
      'READY',
      'QUALITY_CHECK',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED'
    ],
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
    assignedRider: {
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

// Pre-validate hook to guarantee 4-digit OTPs and clean COD payments
orderSchema.pre('validate', function (next) {
  if (!this.verificationCodes) {
    this.verificationCodes = {};
  }
  if (!this.verificationCodes.pickupOtp) {
    this.verificationCodes.pickupOtp = String(Math.floor(1000 + Math.random() * 9000));
  }
  if (!this.verificationCodes.deliveryOtp) {
    this.verificationCodes.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
  }

  if (this.payment) {
    if (this.payment.method === 'COD') {
      if (!this.payment.onlineSubMethod || (this.payment.status !== 'PAID' && !['UPI', 'CARD'].includes(this.payment.onlineSubMethod))) {
        this.payment.onlineSubMethod = null;
      }
      if (!this.payment.status || this.payment.status === '') {
        this.payment.status = 'PENDING';
      }
    }
  }
  next();
});

// Static helper to backfill missing OTPs on existing database orders
orderSchema.statics.backfillMissingOtps = async function () {
  try {
    const ordersToBackfill = await this.find({
      $or: [
        { 'verificationCodes.pickupOtp': { $exists: false } },
        { 'verificationCodes.pickupOtp': null },
        { 'verificationCodes.pickupOtp': '' },
        { 'verificationCodes.deliveryOtp': { $exists: false } },
        { 'verificationCodes.deliveryOtp': null },
        { 'verificationCodes.deliveryOtp': '' }
      ]
    });

    if (ordersToBackfill.length > 0) {
      for (const ord of ordersToBackfill) {
        if (!ord.verificationCodes) ord.verificationCodes = {};
        if (!ord.verificationCodes.pickupOtp) {
          ord.verificationCodes.pickupOtp = String(Math.floor(1000 + Math.random() * 9000));
        }
        if (!ord.verificationCodes.deliveryOtp) {
          ord.verificationCodes.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
        }
        await ord.save();
      }
      console.log(`[Order Model]: Backfilled OTPs for ${ordersToBackfill.length} legacy orders.`);
    }
  } catch (err) {
    console.error('[Order Model]: Error backfilling legacy OTPs:', err.message);
  }
};

// Production Compound Indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, 'pickupSchedule.date': 1 });
orderSchema.index({ 'logistics.assignedRider': 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
