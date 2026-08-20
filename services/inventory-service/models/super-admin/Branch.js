// models/Branch.js

import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    // ─── Restaurant Reference ──────────────────────────────────────────
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required'],
      index: true,
    },

    // ─── Basic Information ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      maxlength: [100, 'Branch name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Branch code cannot exceed 20 characters'],
    },
    email: {
      type: String,
      required: [true, 'Branch email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Branch phone number is required'],
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
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },

    // ─── Branch Details ──────────────────────────────────────────────────
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    openingDate: {
      type: Date,
      default: Date.now,
    },
    isMainBranch: {
      type: Boolean,
      default: false,
    },

    // ─── Working Hours ────────────────────────────────────────────────────
    workingHours: {
      monday: { open: { type: String, default: '09:00' }, close: { type: String, default: '22:00' }, isClosed: { type: Boolean, default: false } },
      tuesday: { open: { type: String, default: '09:00' }, close: { type: String, default: '22:00' }, isClosed: { type: Boolean, default: false } },
      wednesday: { open: { type: String, default: '09:00' }, close: { type: String, default: '22:00' }, isClosed: { type: Boolean, default: false } },
      thursday: { open: { type: String, default: '09:00' }, close: { type: String, default: '22:00' }, isClosed: { type: Boolean, default: false } },
      friday: { open: { type: String, default: '09:00' }, close: { type: String, default: '22:00' }, isClosed: { type: Boolean, default: false } },
      saturday: { open: { type: String, default: '09:00' }, close: { type: String, default: '22:00' }, isClosed: { type: Boolean, default: false } },
      sunday: { open: { type: String, default: '09:00' }, close: { type: String, default: '22:00' }, isClosed: { type: Boolean, default: false } },
    },

    // ─── Features ─────────────────────────────────────────────────────────
    features: {
      dineIn: {
        type: Boolean,
        default: true,
      },
      takeaway: {
        type: Boolean,
        default: true,
      },
      delivery: {
        type: Boolean,
        default: true,
      },
      driveThru: {
        type: Boolean,
        default: false,
      },
    },

    // ─── Statistics ──────────────────────────────────────────────────────
    stats: {
      totalTables: {
        type: Number,
        default: 0,
        min: [0, 'Total tables cannot be negative'],
      },
      totalEmployees: {
        type: Number,
        default: 0,
        min: [0, 'Total employees cannot be negative'],
      },
      totalOrders: {
        type: Number,
        default: 0,
        min: [0, 'Total orders cannot be negative'],
      },
    },

    // ─── Status ──────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },

    // ─── Audit ──────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────
branchSchema.index({ restaurantId: 1, name: 1 });
branchSchema.index({ restaurantId: 1, code: 1 });
branchSchema.index({ status: 1, isActive: 1 });
branchSchema.index({ createdAt: -1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────
branchSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} - ${this.address.pincode}, ${this.address.country}`;
});

// ─── Pre-save Middleware ─────────────────────────────────────────────────
branchSchema.pre('save', function(next) {
  // Ensure code is uppercase
  if (this.code) {
    this.code = this.code.toUpperCase().trim();
  }
  // Update status based on isActive
  if (!this.isActive && this.status === 'active') {
    this.status = 'inactive';
  }
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────
branchSchema.methods.isOpenNow = function() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const hours = this.workingHours[today];
  if (hours.isClosed) return false;
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return currentTime >= hours.open && currentTime <= hours.close;
};

export default mongoose.model('Branch', branchSchema);