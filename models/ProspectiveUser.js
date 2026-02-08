import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const prospectiveUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    phone: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'doctor', 'admin'],
      default: 'user',
    },
    otp: {
      type: String,
      required: true,
    },
    emailAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    otpExpiresAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      },
    },
  },
  { timestamps: true }
);

// Index for efficient queries (email index created automatically via unique: true)
prospectiveUserSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired OTPs

const ProspectiveUser = mongoose.model('ProspectiveUser', prospectiveUserSchema);

export default ProspectiveUser;

