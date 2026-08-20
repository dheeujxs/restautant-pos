import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    symbol: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

unitSchema.index({ name: 'text' });

export default mongoose.model('Unit', unitSchema);