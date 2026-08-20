import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    currentStock: { type: Number, default: 0, min: 0 },
    reorderPoint: { type: Number, default: 0, min: 0 },
    supplier: { type: String, default: '' },
    storageLocation: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ingredientSchema.index({ name: 'text', sku: 'text' });

export default mongoose.model('Ingredient', ingredientSchema);