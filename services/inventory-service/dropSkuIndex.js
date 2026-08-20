// models/Product.js
import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  size:  { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
});

const productSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    description:     { type: String, default: '' },
    category:        { type: String, required: true },
    image:           { type: String, default: '' },
    productType:     { type: String, required: true },
    unit:            { type: String, required: true },
    sellingPrice:    { type: Number, default: 0, min: 0 },
    costPrice:       { type: Number, default: 0, min: 0 },
    dietaryType:     { type: String, required: true, default: 'Veg' },
    allergens:       [{ type: String }],
    prepTimeMinutes: { type: Number, default: 15, min: 0 },
    kotStation:      { type: String, required: true },
    portionSize:     { type: String, default: '1 plate' },
    glassType:       { type: String, default: '' },
    baseIngredient:  { type: String, default: '' },
    isActive:        { type: Boolean, default: true },

    hasVariants: { type: Boolean, default: false },
    variants:    [variantSchema],

    ingredients: [{
      ingredientId:   { type: String, required: true },
      ingredientName: { type: String, required: true },
      quantity:       { type: Number, required: true, min: 0.001 },
      unit:           { type: String, required: true },
    }],
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

// ─── Drop any stale indexes the moment the connection is ready ────────────────
// Runs once per server start. Safe to leave permanently — if the index
// is already gone it catches the error silently and moves on.
const STALE_INDEXES = ['sku_1'];   // add any future stale index names here

async function cleanStaleIndexes() {
  const col = mongoose.connection.db.collection('products');
  for (const idx of STALE_INDEXES) {
    try {
      await col.dropIndex(idx);
      console.log(`[Product] dropped stale index: ${idx}`);
    } catch {
      // index doesn't exist — nothing to do
    }
  }
}

// If already connected (model loaded after connect), run immediately.
// If not yet connected, wait for the 'open' event.
if (mongoose.connection.readyState === 1) {
  cleanStaleIndexes();
} else {
  mongoose.connection.once('open', cleanStaleIndexes);
}

export default Product;