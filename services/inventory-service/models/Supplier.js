import mongoose from 'mongoose';

const supplierIngredientSchema = new mongoose.Schema({
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  lastPurchasePrice: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: '' },
  isPreferred: { type: Boolean, default: false }
}, { _id: true });

const supplierSchema = new mongoose.Schema(
  {
    supplierName: { 
      type: String, 
      required: [true, 'Supplier name is required'],
      trim: true,
      unique: true
    },
    contactPerson: { 
      type: String, 
      default: '',
      trim: true
    },
    phoneNumber: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: { 
      type: String, 
      default: '',
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    address: { 
      type: String, 
      default: '',
      trim: true
    },
    notes: { 
      type: String, 
      default: '',
      trim: true
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive'], 
      default: 'active' 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    // ✅ Add this field
    supplierIngredients: [supplierIngredientSchema]
  },
  { timestamps: true }
);

// Index for search
supplierSchema.index({ supplierName: 'text', contactPerson: 'text', phoneNumber: 'text' });

export default mongoose.model('Supplier', supplierSchema);