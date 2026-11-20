import mongoose from 'mongoose';

// One document per browser (first-party visitor id stored in localStorage).
const analyticsVisitorSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  sessionCount: { type: Number, default: 0 },
  firstReferrer: { type: String, default: '' },
  firstUtm: { source: String, medium: String, campaign: String, term: String, content: String },
  firstPath: { type: String, default: '' },
  device: { type: { type: String }, os: String, browser: String },
  orders: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
}, { versionKey: false });

analyticsVisitorSchema.index({ firstSeenAt: -1 });
analyticsVisitorSchema.index({ lastSeenAt: -1 });
analyticsVisitorSchema.index({ userId: 1 }, { partialFilterExpression: { userId: { $type: 'objectId' } } });

export default mongoose.models.AnalyticsVisitor || mongoose.model('AnalyticsVisitor', analyticsVisitorSchema);
