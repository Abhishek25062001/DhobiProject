import mongoose from 'mongoose';

const text = { type: String, trim: true, maxlength: 500, default: '' };
const schema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, maxlength: 100 },
  name: { ...text, required: true }, shortName: text, summary: text, footerLabel: text,
  badge: text, homeBadge: text, pincodeRange: text, turnaround: text, hours: text,
  timezone: { type: String, enum: ['Asia/Kolkata'], default: 'Asia/Kolkata' },
  coverage: { type: [{ type: String, trim: true, maxlength: 500 }], default: [] },
  pincodes: { type: [{ type: String, match: /^[1-9]\d{5}$/ }], required: true,
    validate: value => value.length > 0 && value.length <= 10000 && new Set(value).size === value.length },
  sortOrder: { type: Number, default: 0, min: 0, max: 10000, validate: Number.isInteger },
  isActive: { type: Boolean, default: true }, revision: { type: Number, default: 1 },
}, { timestamps: true, strict: 'throw' });
// One active hub owns each exact pincode; the index also prevents concurrent overlaps.
schema.index({ pincodes: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
export default mongoose.model('ServiceArea', schema);
