import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const doctorAuthSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },

  phone: {
    type: String,
    required: true,
    unique: true,
  },

  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  },

  password: {
    type: String,
    minlength: 6,
    select: false, // 🔒 never return password in queries
  },
  googleId: {
  type: String,
  default: undefined, // ❗ NOT null
  sparse: true,
},

  role: { type: String, default: 'doctor' },
  createdAt: { type: Date, default: Date.now },
});

/* Virtual: doctorId as alias for _id */
doctorAuthSchema.virtual('doctorId').get(function () {
  return this._id;
});

doctorAuthSchema.set('toJSON', { virtuals: true });
doctorAuthSchema.set('toObject', { virtuals: true });

/* ✅ Unique email only if present */
doctorAuthSchema.index(
  { email: 1 },
  { unique: true, sparse: true }
);

/* 🔐 Hash password before save */
doctorAuthSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model('DoctorAuth', doctorAuthSchema);
