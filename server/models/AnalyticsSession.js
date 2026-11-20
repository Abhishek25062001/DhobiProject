import mongoose from 'mongoose';

const utmSchema = { source: String, medium: String, campaign: String, term: String, content: String };

// One document per browsing session (30 minutes of inactivity starts a new one).
// Funnel flags make conversion and abandonment reports cheap to aggregate.
const analyticsSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  visitorId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  startedAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  isNewVisitor: { type: Boolean, default: false },
  pageViews: { type: Number, default: 0 },
  events: { type: Number, default: 0 },
  entryPath: { type: String, default: '' },
  exitPath: { type: String, default: '' },
  pages: { type: [String], default: [] }, // first 50 screens, in order, for journey analysis
  referrer: { type: String, default: '' }, // referring host only, never the full URL
  utm: utmSchema,
  device: { type: { type: String }, os: String, browser: String, screen: String, language: String, timezone: String },
  cartValue: { type: Number, default: 0 },
  cartItems: { type: Number, default: 0 },
  orderValue: { type: Number, default: 0 },
  flags: {
    productViewed: { type: Boolean, default: false },
    searched: { type: Boolean, default: false },
    addedToCart: { type: Boolean, default: false },
    beganCheckout: { type: Boolean, default: false },
    placedOrder: { type: Boolean, default: false },
    paid: { type: Boolean, default: false },
  },
}, { versionKey: false });

analyticsSessionSchema.index({ startedAt: -1 });
analyticsSessionSchema.index({ visitorId: 1, startedAt: -1 });
analyticsSessionSchema.index({ lastSeenAt: -1 });

export default mongoose.models.AnalyticsSession || mongoose.model('AnalyticsSession', analyticsSessionSchema);
