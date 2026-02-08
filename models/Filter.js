import mongoose from 'mongoose';

const filterSchema = new mongoose.Schema(
  {
    filterType: {
      type: String,
      required: true,
      unique: true,
      enum: ['specialist', 'location', 'experience', 'gender'],
      trim: true,
    },
    values: {
      type: [String],
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

const Filter = mongoose.model('Filter', filterSchema);

export default Filter;

