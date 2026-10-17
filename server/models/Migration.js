import mongoose from 'mongoose';

export default mongoose.model('Migration', new mongoose.Schema({
  _id: String,
  appliedAt: { type: Date, default: Date.now },
}));
