import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    courseTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseType', default: null }, // ✅ ADD THIS FIELD
    courseTypeName: { type: String, default: '' }, // ✅ ADD THIS FIELD for denormalization
  },
  { timestamps: true }
);

categorySchema.index({ name: 'text' });

export default mongoose.model('Category', categorySchema);