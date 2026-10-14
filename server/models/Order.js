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
      enum: ['Standard', 'Hypoallergenic', 'Fabric Softener Plus'],
      default: 'Standard'
    },
    packagingType: {
      type: String,
      enum: ['Folded', 'On Hangers'],
      default: 'Folded'
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
      enum: [
        '08:00 AM - 10:00 AM',
        '10:00 AM - 01:00 PM',
        '02:00 PM - 05:00 PM',
        '06:00 PM - 09:00 PM'
      ],
      required: true
    }
  },
  deliverySchedule: {
    date: {
      type: String,
      required: true
    },
    timeSlot: {
      type: String,
      enum: [
        '08:00 AM - 10:00 AM',
        '10:00 AM - 01:00 PM',
        '02:00 PM - 05:00 PM',
        '06:00 PM - 09:00 PM'
      ],
      required: true
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
      enum: ['UPI', 'CARD', 'NET_BANKING', 'RAZORPAY_CHECKOUT', null],
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
      'BOOKED',
      'PICKUP_ASSIGNED',
      'PICKED_UP',
      'IN_WASHING',
      'IN_IRONING',
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
  timestamps: true
});

// Production Compound Indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, 'pickupSchedule.date': 1 });
orderSchema.index({ 'logistics.assignedRider': 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
