// models/Template.js - Fixed dayOfWeek field

import mongoose from 'mongoose';

const templateSectionSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true },
  description: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  dishIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
  }],
  isVisible: { type: Boolean, default: true },
}, { _id: true });

const templateSchema = new mongoose.Schema(
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

    // ─── Template Info ────────────────────────────────────────────────
    name: { 
      type: String, 
      required: true, 
      trim: true,
      index: true,
    },
    description: { 
      type: String, 
      default: '' 
    },
    templateType: {
      type: String,
      enum: ['daily', 'weekly', 'special', 'seasonal', 'custom'],
      default: 'custom',
      index: true,
    },
    // ✅ FIX: Use sparse: true to allow missing/undefined values
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      sparse: true,
      index: true,
    },
    
    // ─── Template Structure ───────────────────────────────────────────
    sections: [templateSectionSchema],
    
    // ─── Display Settings ─────────────────────────────────────────────
    displayLayout: {
      type: String,
      enum: ['grid', 'list', 'card', 'carousel'],
      default: 'grid',
    },
    itemsPerRow: {
      type: Number,
      default: 3,
      min: 1,
      max: 6,
    },
    
    // ─── Status & Usage ───────────────────────────────────────────────
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    
    // ─── Metadata ─────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [{ type: String }],
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────
templateSchema.index({ restaurantId: 1, branchId: 1 });
templateSchema.index({ name: 'text', description: 'text' });
templateSchema.index({ templateType: 1, dayOfWeek: 1 });
templateSchema.index({ isActive: 1 });
templateSchema.index({ createdAt: -1 });

// ─── Virtuals ──────────────────────────────────────────────────────────
templateSchema.virtual('sectionCount').get(function() {
  return this.sections?.length || 0;
});

templateSchema.virtual('totalDishes').get(function() {
  return this.sections?.reduce((total, section) => {
    return total + (section.dishIds?.length || 0);
  }, 0) || 0;
});

templateSchema.virtual('displayName').get(function() {
  if (this.templateType === 'daily' && this.dayOfWeek) {
    return `${this.name} - ${this.dayOfWeek}`;
  }
  return this.name;
});

// ─── Methods ───────────────────────────────────────────────────────────
templateSchema.methods.addSection = function(sectionData) {
  const section = new mongoose.Types.ObjectId();
  this.sections.push({
    _id: section,
    name: sectionData.name,
    description: sectionData.description || '',
    displayOrder: this.sections.length,
    dishIds: sectionData.dishIds || [],
    isVisible: true,
  });
  return section;
};

templateSchema.methods.removeSection = function(sectionId) {
  this.sections = this.sections.filter(s => !s._id.equals(sectionId));
};

templateSchema.methods.addDishToSection = function(sectionId, dishId) {
  const section = this.sections.find(s => s._id.equals(sectionId));
  if (section && !section.dishIds.some(id => id.equals(dishId))) {
    section.dishIds.push(dishId);
  }
};

templateSchema.methods.removeDishFromSection = function(sectionId, dishId) {
  const section = this.sections.find(s => s._id.equals(sectionId));
  if (section) {
    section.dishIds = section.dishIds.filter(id => !id.equals(dishId));
  }
};

templateSchema.methods.reorderSections = function(sectionOrder) {
  sectionOrder.forEach((sectionId, index) => {
    const section = this.sections.find(s => s._id.equals(sectionId));
    if (section) {
      section.displayOrder = index;
    }
  });
};

templateSchema.set('toJSON', { virtuals: true });
templateSchema.set('toObject', { virtuals: true });

export default mongoose.model('Template', templateSchema);