// models/StaffSettings.js

import mongoose from 'mongoose';

const staffSettingsSchema = new mongoose.Schema(
  {
    // ─── Relationships ─────────────────────────────────────────────────
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      unique: true,
      index: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },

    // ─── Appearance Settings ───────────────────────────────────────────
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
    compactView: {
      type: Boolean,
      default: false,
    },

    // ─── Notification Settings ─────────────────────────────────────────
    notifications: {
      type: Boolean,
      default: true,
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },

    // ─── Language & Time Settings ──────────────────────────────────────
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

    // ─── Auto Refresh Settings ────────────────────────────────────────
    autoRefresh: {
      type: Boolean,
      default: true,
    },
    refreshInterval: {
      type: Number,
      enum: [5, 10, 15, 30, 60],
      default: 15,
    },

    // ─── Metadata ───────────────────────────────────────────────────────
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────
staffSettingsSchema.index({ staffId: 1, restaurantId: 1 });
staffSettingsSchema.index({ branchId: 1 });

// ─── Methods ───────────────────────────────────────────────────────────
staffSettingsSchema.methods.resetToDefaults = function () {
  this.theme = 'light';
  this.notifications = true;
  this.soundEnabled = true;
  this.language = 'en';
  this.timezone = 'Asia/Kolkata';
  this.dateFormat = 'DD/MM/YYYY';
  this.timeFormat = '12h';
  this.compactView = false;
  this.autoRefresh = true;
  this.refreshInterval = 15;
  this.updatedAt = new Date();
  return this.save();
};

export default mongoose.model('StaffSettings', staffSettingsSchema);