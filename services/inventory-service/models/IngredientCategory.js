import mongoose from 'mongoose';

const ingredientCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ingredientCategorySchema.index({ name: 'text' });

export default mongoose.model('IngredientCategory', ingredientCategorySchema);