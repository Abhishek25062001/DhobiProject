import mongoose from 'mongoose';

// One row per reminder sent, kept after the bag is emptied so recovery can be reported over time.
const bagReminderLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentAt: { type: Date, required: true },
  channels: { type: [String], default: [] },
  cartValue: { type: Number, default: 0 },
  cartItems: { type: Number, default: 0 },
  recoveredAt: { type: Date, default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  orderValue: { type: Number, default: 0 },
}, { versionKey: false });

bagReminderLogSchema.index({ sentAt: -1 });
bagReminderLogSchema.index({ user: 1, sentAt: -1 });

export default mongoose.models.BagReminderLog || mongoose.model('BagReminderLog', bagReminderLogSchema);
