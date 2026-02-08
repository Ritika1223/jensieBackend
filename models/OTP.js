import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['forgot_password', 'email_verification', 'other'], // Extensible for future types
      default: 'forgot_password',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired OTPs
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5, // Maximum verification attempts
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ email: 1, type: 1, verified: 1 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;

