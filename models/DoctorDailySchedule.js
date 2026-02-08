import mongoose from 'mongoose';

/**
 * Per-date schedule overrides for a doctor.
 * Stores opening/closing times, slot duration, day availability, and which slots are enabled.
 */
const doctorDailyScheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    isDayAvailable: {
      type: Boolean,
      default: true,
    },
    openingTime: {
      type: String,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM 24-hour
    },
    closingTime: {
      type: String,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    },
    slotDuration: {
      type: Number,
      default: 15,
      enum: [15, 30],
    },
    // Map of time label (e.g. "9:00 AM") -> available (true/false)
    slotAvailability: {
      type: Map,
      of: Boolean,
      default: () => new Map(),
    },
  },
  { timestamps: true }
);

doctorDailyScheduleSchema.index({ doctorId: 1, date: 1 }, { unique: true });

const DoctorDailySchedule = mongoose.model('DoctorDailySchedule', doctorDailyScheduleSchema);
export default DoctorDailySchedule;
