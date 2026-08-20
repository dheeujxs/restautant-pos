import mongoose from 'mongoose';

const stockTransactionSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
    ingredientName: { type: String, required: true },
    type: { type: String, enum: ['IN', 'OUT', 'WASTE', 'ADJUSTMENT'], required: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceType: { type: String, enum: ['PURCHASE', 'ORDER', 'MANUAL', 'WASTAGE'], required: true },
    referenceId: { type: String, default: '' }, // Order ID, Purchase ID, etc.
    reason: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

stockTransactionSchema.index({ ingredientId: 1, createdAt: -1 });
stockTransactionSchema.index({ referenceType: 1, referenceId: 1 });

export default mongoose.model('StockTransaction', stockTransactionSchema);