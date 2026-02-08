import mongoose from 'mongoose';

const doctorUnavailabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['holiday', 'sick_leave', 'personal_leave', 'emergency', 'other'],
      default: 'other',
    },
    isRecurring: {
      type: Boolean,
      default: false, // If true, this unavailability repeats yearly
    },
  },
  { timestamps: true }
);

// Compound index for efficient date range queries
doctorUnavailabilitySchema.index({ doctorId: 1, startDate: 1, endDate: 1 });
doctorUnavailabilitySchema.index({ startDate: 1, endDate: 1 });

const DoctorUnavailability = mongoose.model('DoctorUnavailability', doctorUnavailabilitySchema);

export default DoctorUnavailability;

