// models/StaffSettings.js
import mongoose from 'mongoose';

const staffSettingsSchema = new mongoose.Schema(
  {
    // ─── Staff Reference ──────────────────────────────────────────────────
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Staff ID is required'],
      unique: true,
      index: true,
    },

    // ─── Appearance ──────────────────────────────────────────────────────
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
    compactView: {
      type: Boolean,
      default: false,
    },

    // ─── Notifications ──────────────────────────────────────────────────
    notifications: {
      type: Boolean,
      default: true,
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },

    // ─── Language & Time ────────────────────────────────────────────────
    language: {
      type: String,
      enum: ['en', 'hi', 'ta', 'te', 'bn'],
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'DD MMM YYYY'],
      default: 'DD/MM/YYYY',
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h',
    },

    // ─── Auto Refresh ──────────────────────────────────────────────────
    autoRefresh: {
      type: Boolean,
      default: true,
    },
    refreshInterval: {
      type: Number,
      enum: [5, 10, 15, 30, 60],
      default: 15,
    },

    // ─── Audit ──────────────────────────────────────────────────────────
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────
staffSettingsSchema.index({ staffId: 1 });
staffSettingsSchema.index({ createdAt: -1 });

// ─── Pre-save Middleware ─────────────────────────────────────────────────
staffSettingsSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────
staffSettingsSchema.methods.toSanitizedObject = function() {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.ipAddress;
  delete obj.userAgent;
  return obj;
};

export default mongoose.model('StaffSettings', staffSettingsSchema);