import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
const schema = new mongoose.Schema({ _id: String, hits: Number, resetAt: Date }, { versionKey: false });
schema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimitCounter = mongoose.models.RateLimitCounter || mongoose.model('RateLimitCounter', schema);
export class MongoRateLimitStore {
  constructor(prefix) { this.prefix = prefix; this.localKeys = false; }
  init(options) { this.windowMs = options.windowMs; }
  key(key) { return `${this.prefix}:${createHash('sha256').update(key).digest('hex')}`; }
  async increment(key) {
    const now = new Date();
    const expired = { $lte: [{ $ifNull: ['$resetAt', new Date(0)] }, now] };
    const result = await RateLimitCounter.collection.findOneAndUpdate({ _id: this.key(key) }, [{ $set: {
      hits: { $cond: [expired, 1, { $add: ['$hits', 1] }] },
      resetAt: { $cond: [expired, new Date(now.getTime() + this.windowMs), '$resetAt'] }
    } }], { upsert: true, returnDocument: 'after' });
    return { totalHits: result.hits, resetTime: result.resetAt };
  }
  async decrement(key) { await RateLimitCounter.collection.updateOne({ _id: this.key(key), hits: { $gt: 0 } }, { $inc: { hits: -1 } }); }
  async resetKey(key) { await RateLimitCounter.collection.deleteOne({ _id: this.key(key) }); }
}
