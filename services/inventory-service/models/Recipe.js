import mongoose from 'mongoose';

const recipeIngredientSchema = new mongoose.Schema({
  ingredientId: { type: String, required: true },
  ingredientName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  costPrice: { type: Number, required: true, min: 0 },
});

const recipeSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true },
    productName: { type: String, required: true },
    yieldQuantity: { type: Number, default: 1, min: 1 },
    yieldUnit: { type: String, default: 'plate' },
    ingredients: [recipeIngredientSchema],
    totalCost: { type: Number, default: 0, min: 0 },
    wastagePercentage: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recipeSchema.index({ productName: 'text' });

export default mongoose.model('Recipe', recipeSchema);