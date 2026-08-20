// models/super-admin/Restaurant.js - WITH generateRestaurantId STATIC METHOD

import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    // ─── Basic Information ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Restaurant name cannot exceed 100 characters'],
      match: [/^[a-zA-Z0-9\s\-_.,&()'"]+$/, 'Restaurant name contains invalid characters'],
    },
    logo: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          if (!v) return true;
          return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image');
        },
        message: 'Invalid image URL format',
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
    },

    // ─── Address ──────────────────────────────────────────────────────────
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        default: 'India',
      },
      pincode: {
        type: String,
        required: [true, 'Pincode is required'],
        match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode'],
      },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },

    // ─── Owner Details ──────────────────────────────────────────────────
    owner: {
      name: {
        type: String,
        required: [true, 'Owner name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Owner email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
      },
      phone: {
        type: String,
        required: [true, 'Owner phone number is required'],
        match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
      },
      address: {
        type: String,
        trim: true,
      },
      pan: {
        type: String,
        trim: true,
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number'],
      },
      aadhaar: {
        type: String,
        trim: true,
        match: [/^[0-9]{12}$/, 'Please enter a valid 12-digit Aadhaar number'],
      },
    },

    // ─── Business Details ──────────────────────────────────────────────
    businessType: {
      type: String,
      required: [true, 'Business type is required'],
      enum: ['Restaurant', 'Cafe', 'Bakery', 'Food Truck', 'Cloud Kitchen', 'Fine Dining', 'Fast Food', 'Other'],
    },
    cuisineTypes: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 20;
        },
        message: 'Maximum 20 cuisine types allowed',
      },
    },
    operatingHours: {
      open: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)'],
      },
      close: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)'],
      },
    },
    daysOfOperation: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },

    // ─── Tax & License ──────────────────────────────────────────────────
    gstNumber: {
      type: String,
      trim: true,
      match: [/^[0-9A-Z]{15}$/, 'Please enter a valid GST number (15 characters)'],
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number'],
    },
    fssaiLicense: {
      type: String,
      trim: true,
    },

    // ─── KYC Documents ──────────────────────────────────────────────────
    kycDocuments: {
      license: { type: String },
      pan: { type: String },
      gst: { type: String },
      fssai: { type: String },
    },

    // ─── Subscription ───────────────────────────────────────────────────
    subscription: {
      plan: {
        type: String,
        enum: ['trial', 'basic', 'pro', 'enterprise'],
        default: 'trial',
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        default: 'monthly',
      },
      amount: {
        type: Number,
        default: 0,
        min: [0, 'Amount cannot be negative'],
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
      },
      status: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'trial'],
        default: 'trial',
      },
      couponCode: {
        type: String,
        trim: true,
      },
      couponDiscount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%'],
      },
    },

    // ─── Commission ─────────────────────────────────────────────────────
    commission: {
      rate: {
        type: Number,
        default: 10,
        min: [0, 'Commission rate cannot be negative'],
        max: [100, 'Commission rate cannot exceed 100%'],
      },
      customRate: {
        type: Number,
        min: [0, 'Custom rate cannot be negative'],
        max: [100, 'Custom rate cannot exceed 100%'],
      },
    },

    // ─── Status ─────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'suspended'],
      default: 'pending',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Verification notes cannot exceed 500 characters'],
    },

    // ─── Settings ───────────────────────────────────────────────────────
    settings: {
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      currency: {
        type: String,
        default: 'INR',
      },
      dateFormat: {
        type: String,
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
        default: 'DD/MM/YYYY',
      },
    },

    // ─── Statistics ─────────────────────────────────────────────────────
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalStaff: { type: Number, default: 0 },
      totalBranches: { type: Number, default: 0 },
      rating: { type: Number, default: 0, min: 0, max: 5 },
      reviews: { type: Number, default: 0 },
    },

    // ─── Branches ────────────────────────────────────────────────────────
    branches: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, default: '' },
        country: { type: String, default: 'India' },
        pincode: { type: String, default: '' },
        location: {
          lat: { type: Number },
          lng: { type: Number },
        },
      },
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        default: '',
        lowercase: true,
        trim: true,
      },
      manager: {
        name: { type: String },
        phone: { type: String },
        email: { type: String },
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active',
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      stats: {
        orders: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        staff: { type: Number, default: 0 },
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    }],

    // ─── Metadata ──────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },


    revenue: {
      total: { type: Number, default: 0 },
      today: { type: Number, default: 0 },
      thisWeek: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      thisYear: { type: Number, default: 0 },
      lastMonth: { type: Number, default: 0 },
      lastYear: { type: Number, default: 0 },
    },

    // ─── Commission Tracking ──────────────────────────────────────────
    commission: {
      rate: {
        type: Number,
        default: 10,
        min: [0, 'Commission rate cannot be negative'],
        max: [100, 'Commission rate cannot exceed 100%'],
      },
      customRate: {
        type: Number,
        min: [0, 'Custom rate cannot be negative'],
        max: [100, 'Custom rate cannot exceed 100%'],
      },
      earned: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
    },

    // ─── Monthly Revenue History ──────────────────────────────────────
    revenueHistory: [{
      month: { type: String },
      revenue: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      commission: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    }],

    // ─── Daily Revenue History ────────────────────────────────────────
    dailyRevenue: [{
      date: { type: String },
      revenue: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    }],
  },

  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────
restaurantSchema.index({ name: 'text', email: 'text', 'owner.name': 'text' });
restaurantSchema.index({ status: 1, verificationStatus: 1 });
restaurantSchema.index({ 'subscription.status': 1 });
restaurantSchema.index({ isActive: 1 });
restaurantSchema.index({ createdAt: -1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────
restaurantSchema.virtual('branchCount').get(function() {
  return this.branches?.length || 0;
});

// ─── Pre-save Middleware ─────────────────────────────────────────────────
restaurantSchema.pre('save', function(next) {
  if (this.branches) {
    this.stats.totalBranches = this.branches.length;
  }
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────
restaurantSchema.methods.addBranch = async function(branchData) {
  this.branches.push(branchData);
  this.stats.totalBranches = this.branches.length;
  await this.save();
  return this;
};

restaurantSchema.methods.removeBranch = async function(branchId) {
  this.branches = this.branches.filter(b => b._id.toString() !== branchId);
  this.stats.totalBranches = this.branches.length;
  await this.save();
  return this;
};

restaurantSchema.methods.updateBranch = async function(branchId, updateData) {
  const branch = this.branches.id(branchId);
  if (!branch) throw new Error('Branch not found');
  
  Object.keys(updateData).forEach(key => {
    if (key !== '_id' && key !== 'createdAt') {
      branch[key] = updateData[key];
    }
  });
  branch.updatedAt = new Date();
  await this.save();
  return this;
};

// ─── ✅ STATIC METHOD: Generate Restaurant ID ──────────────────────────────
restaurantSchema.statics.generateRestaurantId = async function(name) {
  try {
    // Get count of existing restaurants
    const count = await this.countDocuments();
    
    // Generate prefix from name (first 3 characters uppercase)
    const prefix = name.substring(0, 3).toUpperCase();
    
    // Generate sequence number with padding (4 digits)
    const seq = String(count + 1).padStart(4, '0');
    
    return `${prefix}-${seq}`;
  } catch (error) {
    // Fallback: use timestamp-based ID
    const prefix = name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  }
};

export default mongoose.model('Restaurant', restaurantSchema);