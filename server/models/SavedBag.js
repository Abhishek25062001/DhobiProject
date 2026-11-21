import mongoose from 'mongoose';

// A signed-in customer's laundry bag, kept on the server so it survives closed tabs and
// follows the customer across devices. Also the source for abandoned-bag reminders.
const bagItemSchema = new mongoose.Schema({
  cartItemId: { type: String, default: '' },
  garmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Garment', required: true },
  quantity: { type: Number, required: true, min: 1, max: 999 },
  serviceType: { type: String, required: true },
  ironingType: { type: String, default: 'NONE' },
  isCustomItem: { type: Boolean, default: false },
  customDescription: { type: String, default: '', maxlength: 200 },
}, { _id: false });

const savedBagSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: { type: [bagItemSchema], default: [] },
  cartValue: { type: Number, default: 0 },
  cartItems: { type: Number, default: 0 },
  // Last time the customer changed the bag; the reminder clock starts here.
  lastActivityAt: { type: Date, default: Date.now },
  // One reminder per bag: reset only when the bag is emptied (order placed or cleared).
  reminder: {
    sentAt: { type: Date, default: null },
    logId: { type: mongoose.Schema.Types.ObjectId, ref: 'BagReminderLog', default: null },
  },
}, { timestamps: true, versionKey: false });

savedBagSchema.index({ 'reminder.sentAt': 1, lastActivityAt: 1 });

export default mongoose.models.SavedBag || mongoose.model('SavedBag', savedBagSchema);
