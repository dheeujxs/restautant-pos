// models/AuditLog.js

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'VIEW_SETTINGS',
      'SETTINGS_UPDATE',
      'SETTINGS_UPDATE_FAILED',
      'SETTINGS_RESET',
      'MAINTENANCE_MODE_CHANGE',
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'ROLE_CHANGED',
      'PERMISSION_CHANGED',
    ],
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'auditlogs',
});

// ✅ FIX: Check if model already exists before defining
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;