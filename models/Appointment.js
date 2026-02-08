import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      required: true,
      unique: true, // One appointment per slot
    },
    appointmentType: {
      type: String,
      enum: ['video_call', 'voice_call', 'clinic_visit'],
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed', 'no-show'],
      default: 'confirmed',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    doctorNotes: {
      type: String,
      default: '',
    },
    consultationFee: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    paymentId: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'doctor', 'system'],
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
appointmentSchema.index({ userId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1, createdAt: -1 });
appointmentSchema.index({ createdAt: -1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;

