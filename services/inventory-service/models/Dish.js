// models/Dish.js - UPDATED WITH COMBO SUPPORT

import mongoose from 'mongoose';

// ─── Variant Schema ──────────────────────────────────────────────────────
const variantSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  ingredients: [{
    ingredientId:   { type: String, default: '' },
    ingredientName: { type: String, required: true },
    quantity:       { type: Number, required: true, min: 0.001 },
    unit:           { type: String, required: true },
  }],
});

// ─── Combo Variant Schema ──────────────────────────────────────────────
const comboVariantSchema = new mongoose.Schema({
  variantIndex: { type: Number, required: true, min: 0 },
  variantName:  { type: String, required: true },
  variantPrice: { type: Number, required: true, min: 0 },
});

// ─── Main Dish Schema ──────────────────────────────────────────────────
const dishSchema = new mongoose.Schema(
  {
    // ─── Restaurant & Branch ──────────────────────────────────────────
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    restaurantName: {
      type: String,
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
      default: null,
    },
    branchName: {
      type: String,
      default: 'All Branches',
    },

    // ─── Basic Info ────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    categoryId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Category', 
      required: true 
    },
    categoryName: { type: String, required: true },
    image: { type: String, default: '' },
    
    // ─── Pricing ──────────────────────────────────────────────────────
    price: { type: Number, default: 0, min: 0 },
    basePrice: { type: Number, default: 0, min: 0 },
    
    // ─── Dietary & Kitchen ────────────────────────────────────────────
    dietaryType: { 
      type: String, 
      enum: ['Veg', 'Non-veg', 'Vegan', 'Jain', 'Eggetarian'], 
      default: 'Veg' 
    },
    kotStation: { 
      type: String, 
      enum: ['Main Kitchen', 'Tandoor', 'Bar', 'Cold Kitchen', 'Bakery', 'Grill'], 
      required: true 
    },
    
    // ─── Beverage specific ────────────────────────────────────────────
    glassType: { type: String, default: '' },
    baseIngredient: { type: String, default: '' },
    
    // ─── Status ──────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    
    // ─── Variants ────────────────────────────────────────────────────
    hasVariants: { type: Boolean, default: false },
    variants: [variantSchema],
    
    // 🔥 ─── COMBO FIELDS (ADD THESE) ─────────────────────────────────
    isCombo: { type: Boolean, default: false },
    comboPrice: { type: Number, default: 0, min: 0 },
    comboVariants: [comboVariantSchema],
    
    // ─── Stock management ────────────────────────────────────────────
    stockType: { type: String, enum: ['product', 'recipe'], default: 'recipe' },
    currentStock: { type: Number, default: 0, min: 0 },
    preparationTime: { type: Number, default: 15, min: 0, max: 240 },
    
    // ─── Metadata ────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByType: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// ─── Virtuals ──────────────────────────────────────────────────────────
dishSchema.virtual('displayPrice').get(function() {
  // If combo, show combo price
  if (this.isCombo && this.comboPrice > 0) {
    return `₹${this.comboPrice.toFixed(2)}`;
  }
  
  // If base price exists, show it
  if (this.basePrice > 0) {
    return `₹${this.basePrice.toFixed(2)}`;
  }
  
  // Otherwise show variant prices
  if (this.variants && this.variants.length > 0) {
    const prices = this.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) return `₹${minPrice.toFixed(2)}`;
    return `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
  }
  return `₹${this.price.toFixed(2)}`;
});

dishSchema.virtual('variantCount').get(function() {
  if (this.isCombo) {
    return this.comboVariants?.length || 0;
  }
  return this.variants?.length || 0;
});

// ─── Indexes ────────────────────────────────────────────────────────────
dishSchema.index({ name: 'text', description: 'text' });
dishSchema.index({ restaurantId: 1, branchId: 1 });
dishSchema.index({ categoryId: 1 });
dishSchema.index({ isActive: 1, isDeleted: 1 });
dishSchema.index({ createdAt: -1 });
dishSchema.index({ createdByType: 1 });
dishSchema.index({ isCombo: 1 }); // 🔥 Add index for combo queries

dishSchema.set('toJSON', { virtuals: true });
dishSchema.set('toObject', { virtuals: true });

// ✅ Complete export
export default mongoose.model('Dish', dishSchema);