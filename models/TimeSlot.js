import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format (24-hour)
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    },
    period: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Night'],
      required: true,
    },
    bookingType: {
      type: String,
      enum: ['video_call', 'voice_call', 'clinic_visit'],
      default: null, // Will be set when slot is booked
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'cancelled'],
      default: 'available',
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
// Unique index: one slot per doctor, date, and startTime (bookingType is set when booked)
timeSlotSchema.index({ doctorId: 1, date: 1, startTime: 1 }, { unique: true });
timeSlotSchema.index({ status: 1, date: 1 });
timeSlotSchema.index({ appointmentId: 1 });

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

export default TimeSlot;

