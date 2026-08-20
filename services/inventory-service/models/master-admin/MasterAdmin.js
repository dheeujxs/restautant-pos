
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const masterAdminSchema = new mongoose.Schema(
  {
    // ─── Personal Information ──────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
      match: [/^[a-zA-Z\s\-']+$/, 'First name contains invalid characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
      match: [/^[a-zA-Z\s\-']+$/, 'Last name contains invalid characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
      index: true,
    },
    profileImage: {
      type: String,
      default: '',
    },

    // ─── Authentication ────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // ─── Email Verification ─────────────────────────────────────────────
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // ─── Two-Factor Authentication ──────────────────────────────────────
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },

    // ─── Role & Permissions ────────────────────────────────────────────
    role: {
      type: String,
      enum: ['master_admin', 'platform_owner'],
      default: 'master_admin',
    },
    permissions: {
      type: [String],
      default: [],
    },

    // ─── Super Admin Management Permissions ────────────────────────────
    canCreateSuperAdmin: {
      type: Boolean,
      default: false,
    },
    canDeleteSuperAdmin: {
      type: Boolean,
      default: false,
    },
    canModifySuperAdminPermissions: {
      type: Boolean,
      default: false,
    },
    canViewAllSuperAdmins: {
      type: Boolean,
      default: false,
    },
    canSuspendSuperAdmin: {
      type: Boolean,
      default: false,
    },
    canActivateSuperAdmin: {  // ✅ ADD THIS FIELD
        type: Boolean,
        default: false,
      },

    // ─── Platform Settings ─────────────────────────────────────────────
    platformSettings: {
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
      maintenanceMessage: {
        type: String,
        default: '',
        maxlength: [500, 'Maintenance message cannot exceed 500 characters'],
      },
      maxRestaurants: {
        type: Number,
        default: 1000,
        min: [1, 'Max restaurants must be at least 1'],
      },
      maxBranchesPerRestaurant: {
        type: Number,
        default: 50,
        min: [1, 'Max branches must be at least 1'],
      },
      maxStaffPerRestaurant: {
        type: Number,
        default: 200,
        min: [1, 'Max staff must be at least 1'],
      },
      allowSelfRegistration: {
        type: Boolean,
        default: false,
      },
      requireEmailVerification: {
        type: Boolean,
        default: true,
      },
      requirePhoneVerification: {
        type: Boolean,
        default: false,
      },
    },

    // ─── Platform Statistics ───────────────────────────────────────────
    stats: {
      totalSuperAdmins: { type: Number, default: 0 },
      totalRestaurants: { type: Number, default: 0 },
      totalBranches: { type: Number, default: 0 },
      totalStaff: { type: Number, default: 0 },
      totalCustomers: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      platformRevenue: { type: Number, default: 0 },
    },

    // ─── Security ──────────────────────────────────────────────────────
    lastLogin: {
      type: Date,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockUntil: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    // ─── Audit ──────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterAdmin',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterAdmin',
    },
    lastIP: {
      type: String,
    },
    lastUserAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────
masterAdminSchema.index({ email: 1 });
masterAdminSchema.index({ phone: 1 });
masterAdminSchema.index({ isActive: 1 });
masterAdminSchema.index({ role: 1 });
masterAdminSchema.index({ createdAt: -1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────
masterAdminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// ─── Password Hashing ────────────────────────────────────────────────────
masterAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  next();
});

// ─── Instance Methods ────────────────────────────────────────────────────
masterAdminSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

masterAdminSchema.methods.hasPermission = function(permission) {
  if (this.permissions.includes('*')) return true;
  return this.permissions.includes(permission);
};

masterAdminSchema.methods.isPlatformOwner = function() {
  return this.role === 'platform_owner';
};

// ─── Generate Verification Token ──────────────────────────────────────────
masterAdminSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// ─── Generate Password Reset Token ───────────────────────────────────────
masterAdminSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
  return token;
};

export default mongoose.model('MasterAdmin', masterAdminSchema);