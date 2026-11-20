import mongoose from 'mongoose';

// Raw, append-only event log. Raw events expire after ANALYTICS_RETENTION_DAYS (default 400);
// session and visitor rollups are kept for long-term retention reporting.
const retentionDays = Math.max(30, Number(process.env.ANALYTICS_RETENTION_DAYS) || 400);

const analyticsEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  visitorId: { type: String, default: null },
  sessionId: { type: String, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  path: { type: String, default: '' },
  props: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: { type: String, enum: ['client', 'server'], default: 'client' },
  ts: { type: Date, required: true },
}, { versionKey: false, minimize: true });

analyticsEventSchema.index({ ts: 1 }, { expireAfterSeconds: retentionDays * 86400 });
analyticsEventSchema.index({ name: 1, ts: -1 });
analyticsEventSchema.index({ sessionId: 1, ts: 1 });
analyticsEventSchema.index({ visitorId: 1, ts: -1 });
analyticsEventSchema.index({ 'props.orderId': 1 }, { partialFilterExpression: { 'props.orderId': { $exists: true } } });

export default mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', analyticsEventSchema);
