import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    specialty: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'others'],
      required: true,
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    patientStories: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    location: {
      type: String,
      required: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    image: {
      type: String,
      required: true,
    },
    badge: {
      type: String,
      enum: ['Recommended', 'Top Rated', null],
      default: null,
    },
    fee: {
      type: Number,
      required: true,
      default: 0,
    },
    biography: {
      type: String,
      default: '',
    },
    specialization: {
      type: [String], // Array of strings
      default: [],
    },
    qualifications: {
      type: String,
      default: '',
    },
    totalConsultations: {
      type: Number,
      default: 0,
      min: 0,
    },
    officeAddress: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    officePhoneNumber: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Create geospatial index for location-based queries
doctorSchema.index({ coordinates: '2dsphere' });

const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor;

