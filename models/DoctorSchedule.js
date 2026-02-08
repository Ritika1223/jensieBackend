import mongoose from 'mongoose';

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0, // Sunday
      max: 6, // Saturday
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    periods: [
      {
        type: String,
        enum: ['Morning', 'Afternoon', 'Evening', 'Night'],
      },
    ],
    startTime: {
      type: String,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
    endTime: {
      type: String,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    },
    breakStartTime: {
      type: String,
      default: null,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    },
    breakEndTime: {
      type: String,
      default: null,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
doctorScheduleSchema.index({ doctorId: 1, dayOfWeek: 1 });

const DoctorSchedule = mongoose.model('DoctorSchedule', doctorScheduleSchema);

export default DoctorSchedule;

