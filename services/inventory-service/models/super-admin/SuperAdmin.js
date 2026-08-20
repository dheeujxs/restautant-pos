// models/super-admin/SuperAdmin.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const superAdminSchema = new mongoose.Schema(
  {
    // ─── Personal Information ──────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
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
    profileImage: {
      type: String,
      default: '',
    },

    // ─── Account Security ──────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    // ─── Organization Details ──────────────────────────────────────
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },

    // ─── Role ──────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ['superadmin', 'admin'],
      default: 'superadmin',
    },

    // ─── Verification & Status ─────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationExpires: {
      type: Date,
      select: false,
    },

    // ─── Security ──────────────────────────────────────────────────
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    securityHash: {
      type: String,
      select: false,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    agreedToTerms: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────
superAdminSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// ─── Indexes ──────────────────────────────────────────────────────────────
superAdminSchema.index({ email: 1 });
superAdminSchema.index({ organizationName: 1 });
superAdminSchema.index({ isActive: 1 });
superAdminSchema.index({ createdAt: -1 });

// ─── Pre-save Middleware ─────────────────────────────────────────────────
superAdminSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);

      // Generate security hash
      const hash = crypto.createHash('sha256');
      hash.update(`${this.email}:${this.password}:${process.env.SECURITY_SALT || 'default_salt'}`);
      this.securityHash = hash.digest('hex');
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────
superAdminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

superAdminSchema.methods.isLocked = function () {
  if (!this.lockUntil) return false;
  return this.lockUntil > Date.now();
};

superAdminSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 15 * 60 * 1000;
    }
  }
  await this.save();
};

superAdminSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

superAdminSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

superAdminSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return token;
};

superAdminSchema.methods.createSecurityHash = function () {
  const hash = crypto.createHash('sha256');
  hash.update(`${this.email}:${this.password}:${process.env.SECURITY_SALT || 'default_salt'}`);
  return hash.digest('hex');
};

export default mongoose.model('SuperAdmin', superAdminSchema);