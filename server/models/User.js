import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
};

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    default: 'Home'
  },
  flatAndBuilding: {
    type: String,
    required: true,
    trim: true
  },
  streetAndLandmark: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    default: 'New Delhi',
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: undefined,
    set: (v) => (v && typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : undefined),
    validate: {
      validator: function(v) {
        return !v || /^\S+@\S+\.\S+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  phone: {
    type: String,
    required: [true, 'Please provide your mobile number'],
    trim: true,
    set: normalizePhone
  },

  password: {
    type: String,
    required: function() {
      return this.role !== 'customer' && !this.firebaseUid;
    },
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'rider', 'admin'],
    default: 'customer'
  },
  firebaseUid: {
    type: String,
    sparse: true,
    index: true,
    default: undefined
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  addresses: [addressSchema]
}, {
  timestamps: true
});

// Production Indexes
userSchema.index({ email: 1 }, { unique: true, sparse: true, background: true });
userSchema.index({ phone: 1 }, { unique: true });

userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
