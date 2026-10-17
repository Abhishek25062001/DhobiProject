import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Time slot label is required (e.g. 08:00 AM - 10:00 AM)'],
      unique: true,
      trim: true
    },
    startHour: {
      type: Number,
      required: [true, 'Start hour in 24h format (0-23) is required'],
      min: 0,
      max: 23,
      validate: Number.isInteger
    },
    endHour: {
      type: Number,
      required: [true, 'End hour in 24h format (0-23) is required'],
      min: 0,
      max: 23,
      validate: Number.isInteger
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Maximum orders per slot is required'],
      default: 15,
      min: 1,
      validate: Number.isInteger
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

timeSlotSchema.pre('validate', function () {
  if (this.endHour <= this.startHour) this.invalidate('endHour', 'End hour must follow start hour.');
});

timeSlotSchema.index({ isActive: 1, sortOrder: 1, startHour: 1 });

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);
export default TimeSlot;
