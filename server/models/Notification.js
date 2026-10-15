import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    isBroadcast: {
      type: Boolean,
      default: false,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['ORDER_UPDATE', 'RIDER_ASSIGNED', 'PROMO', 'SYSTEM_ALERT', 'GENERAL'],
      default: 'ORDER_UPDATE'
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    orderNumber: {
      type: String,
      default: '',
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isBroadcast: 1, createdAt: -1 });

// Helper method to create in-app notification and avoid errors if recipient is invalid
notificationSchema.statics.createNotification = async function (data) {
  try {
    return await this.create(data);
  } catch (err) {
    console.error('[Notification Error]:', err.message);
    return null;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
