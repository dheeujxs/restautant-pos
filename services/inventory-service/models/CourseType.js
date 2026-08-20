import mongoose from 'mongoose';

const courseTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    displayOrder: { type: Number, default: 0 },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

courseTypeSchema.index({ name: 'text' });

export default mongoose.model('CourseType', courseTypeSchema);