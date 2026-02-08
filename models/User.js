import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
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
      required: function() {
        return !this.googleId; // Only required if not using Google OAuth
      },
    },
    name: {
      type: String,
    },
    phone: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
    },
    role: {
      type: String,
      enum: ['user', 'doctor', 'admin'],
      default: 'user',
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to generate reset token (simple hash of email + timestamp)
userSchema.methods.generateResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};

const User = mongoose.model('User', userSchema);

export default User;

