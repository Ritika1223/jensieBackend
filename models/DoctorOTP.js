import mongoose from 'mongoose';

const doctorOTPSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
});

export default mongoose.model('DoctorOTP', doctorOTPSchema);
