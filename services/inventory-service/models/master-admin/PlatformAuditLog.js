// models/super-admin/PlatformAuditLog.js
import mongoose from 'mongoose';

const platformAuditLogSchema = new mongoose.Schema(
  {
    // ─── Who performed the action ──────────────────────────────────────
    masterAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterAdmin',
      index: true,
    },
    superAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      index: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // ─── Actor Information ─────────────────────────────────────────────
    actorType: {
      type: String,
      enum: [
        'master_admin',
        'platform_owner',
        'super_admin',
        'admin',
        'staff',
        'user',
        'system',
        'cron_job',
        'api_key',
      ],
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    actorRole: {
      type: String,
      trim: true,
    },
    actorIP: {
      type: String,
      trim: true,
    },
    actorUserAgent: {
      type: String,
      trim: true,
    },

    // ─── Action Details ──────────────────────────────────────────────────
    action: {
      type: String,
      required: true,
      enum: [
        // ─── Master Admin Actions ──────────────────────────────────────
        'MASTER_ADMIN_REGISTERED',
        'MASTER_ADMIN_EMAIL_VERIFIED',
        'MASTER_ADMIN_VERIFICATION_RESENT',
        'MASTER_ADMIN_LOGGED_IN',
        'MASTER_ADMIN_LOGGED_OUT',
        'MASTER_ADMIN_PROFILE_UPDATED',
        'MASTER_ADMIN_PASSWORD_CHANGED',
        'MASTER_ADMIN_PASSWORD_RESET_REQUESTED',
        'MASTER_ADMIN_PASSWORD_RESET_COMPLETED',
        'MASTER_ADMIN_DEACTIVATED',
        'MASTER_ADMIN_ACTIVATED',
        'MASTER_ADMIN_LOCKED',
        'MASTER_ADMIN_UNLOCKED',
        'MASTER_ADMIN_PERMISSIONS_UPDATED',
        'MASTER_ADMIN_ROLE_CHANGED',

        // ─── Super Admin Management ────────────────────────────────────
        'SUPER_ADMIN_CREATED',
        'SUPER_ADMIN_UPDATED',
        'SUPER_ADMIN_DELETED',
        'SUPER_ADMIN_EMAIL_VERIFIED',
        'SUPER_ADMIN_LOGGED_IN',
        'SUPER_ADMIN_LOGGED_OUT',
        'SUPER_ADMIN_PROFILE_UPDATED',
        'SUPER_ADMIN_PASSWORD_CHANGED',
        'SUPER_ADMIN_PERMISSIONS_GRANTED',
        'SUPER_ADMIN_PERMISSIONS_REVOKED',
        'SUPER_ADMIN_PERMISSIONS_UPDATED',
        'SUPER_ADMIN_SUSPENDED',
        'SUPER_ADMIN_ACTIVATED',
        'SUPER_ADMIN_DEACTIVATED',
        'SUPER_ADMIN_LOCKED',
        'SUPER_ADMIN_UNLOCKED',

        // ─── Restaurant Management ──────────────────────────────────────
        'RESTAURANT_CREATED',
        'RESTAURANT_UPDATED',
        'RESTAURANT_DELETED',
        'RESTAURANT_APPROVED',
        'RESTAURANT_REJECTED',
        'RESTAURANT_SUSPENDED',
        'RESTAURANT_ACTIVATED',
        'RESTAURANT_VERIFICATION_UPDATED',
        'RESTAURANT_SETTINGS_UPDATED',
        'RESTAURANT_SUBSCRIPTION_UPDATED',
        'RESTAURANT_COMMISSION_UPDATED',

        // ─── Branch Management ──────────────────────────────────────────
        'BRANCH_CREATED',
        'BRANCH_UPDATED',
        'BRANCH_DELETED',
        'BRANCH_ACTIVATED',
        'BRANCH_SUSPENDED',
        'BRANCH_SETTINGS_UPDATED',
        'BRANCH_TRANSFER_REQUESTED',
        'BRANCH_TRANSFER_COMPLETED',

        // ─── Staff Management ────────────────────────────────────────────
        'STAFF_CREATED',
        'STAFF_UPDATED',
        'STAFF_DELETED',
        'STAFF_ACTIVATED',
        'STAFF_SUSPENDED',
        'STAFF_PERMISSIONS_CHANGED',
        'STAFF_ROLE_CHANGED',
        'STAFF_BRANCH_TRANSFERRED',
        'STAFF_PAYROLL_UPDATED',
        'STAFF_ATTENDANCE_OVERRIDE',

        // ─── User/Customer Management ──────────────────────────────────
        'USER_REGISTERED',
        'USER_VERIFIED',
        'USER_UPDATED',
        'USER_DELETED',
        'USER_SUSPENDED',
        'USER_ACTIVATED',
        'USER_PASSWORD_CHANGED',
        'USER_ROLE_CHANGED',

        // ─── Order Management ────────────────────────────────────────────
        'ORDER_CREATED',
        'ORDER_UPDATED',
        'ORDER_CANCELLED',
        'ORDER_COMPLETED',
        'ORDER_STATUS_CHANGED',
        'ORDER_REFUNDED',
        'ORDER_KOT_GENERATED',
        'ORDER_DELIVERY_ASSIGNED',
        'ORDER_DELIVERY_COMPLETED',

        // ─── Payment Management ──────────────────────────────────────────
        'PAYMENT_PROCESSED',
        'PAYMENT_REFUNDED',
        'PAYMENT_FAILED',
        'PAYMENT_VOIDED',
        'PAYMENT_GATEWAY_CHANGED',
        'PAYMENT_SETTINGS_UPDATED',

        // ─── KOT Management ──────────────────────────────────────────────
        'KOT_CREATED',
        'KOT_UPDATED',
        'KOT_CANCELLED',
        'KOT_COMPLETED',
        'KOT_STATUS_CHANGED',
        'KOT_BULK_UPDATED',

        // ─── Menu Management ─────────────────────────────────────────────
        'DISH_CREATED',
        'DISH_UPDATED',
        'DISH_DELETED',
        'DISH_PRICING_UPDATED',
        'DISH_AVAILABILITY_CHANGED',
        'CATEGORY_CREATED',
        'CATEGORY_UPDATED',
        'CATEGORY_DELETED',

        // ─── Inventory Management ────────────────────────────────────────
        'INGREDIENT_CREATED',
        'INGREDIENT_UPDATED',
        'INGREDIENT_DELETED',
        'INGREDIENT_STOCK_UPDATED',
        'INGREDIENT_STOCK_ALERT',
        'SUPPLIER_CREATED',
        'SUPPLIER_UPDATED',
        'SUPPLIER_DELETED',
        'PURCHASE_ORDER_CREATED',
        'PURCHASE_ORDER_UPDATED',
        'PURCHASE_ORDER_RECEIVED',
        'PURCHASE_ORDER_CANCELLED',

        // ─── Platform Settings ───────────────────────────────────────────
        'PLATFORM_SETTINGS_UPDATED',
        'MAINTENANCE_MODE_ENABLED',
        'MAINTENANCE_MODE_DISABLED',
        'PLATFORM_BACKUP_CREATED',
        'PLATFORM_BACKUP_RESTORED',
        'PLATFORM_CACHE_CLEARED',
        'PLATFORM_LOGS_CLEARED',

        // ─── Subscription & Commission ──────────────────────────────────
        'SUBSCRIPTION_CREATED',
        'SUBSCRIPTION_UPDATED',
        'SUBSCRIPTION_CANCELLED',
        'SUBSCRIPTION_RENEWED',
        'COMMISSION_CALCULATED',
        'COMMISSION_PAID',
        'COMMISSION_RATE_UPDATED',

        // ─── Security & Authentication ──────────────────────────────────
        'LOGIN_ATTEMPT',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'TOKEN_REFRESHED',
        'PASSWORD_CHANGED',
        'PASSWORD_RESET_REQUESTED',
        'PASSWORD_RESET_COMPLETED',
        'TWO_FACTOR_ENABLED',
        'TWO_FACTOR_DISABLED',
        'TWO_FACTOR_VERIFIED',
        'API_KEY_CREATED',
        'API_KEY_REVOKED',
        'ACCOUNT_LOCKED',
        'ACCOUNT_UNLOCKED',
        'ACCOUNT_DEACTIVATED',
        'ACCOUNT_ACTIVATED',

        // ─── Security Threats ─────────────────────────────────────────────
        'SQL_INJECTION_ATTEMPT',
        'XSS_ATTEMPT',
        'CSRF_ATTEMPT',
        'RATE_LIMIT_EXCEEDED',
        'SUSPICIOUS_ACTIVITY_DETECTED',
        'BRUTE_FORCE_ATTEMPT',
        'UNAUTHORIZED_ACCESS_ATTEMPT',

        // ─── Export & Reporting ──────────────────────────────────────────
        'REPORT_GENERATED',
        'REPORT_EXPORTED',
        'DATA_EXPORTED',
        'DATA_IMPORTED',
        'ANALYTICS_GENERATED',

        // ─── System Events ───────────────────────────────────────────────
        'SYSTEM_STARTED',
        'SYSTEM_SHUTDOWN',
        'SYSTEM_ERROR',
        'SYSTEM_UPDATE',
        'DATABASE_MIGRATION',
        'CRON_JOB_EXECUTED',
        'EMAIL_SENT',
        'SMS_SENT',
        'NOTIFICATION_SENT',
      ],
      index: true,
    },

    // ─── Target/Resource Affected ──────────────────────────────────────
    targetType: {
      type: String,
      enum: [
        'master_admin',
        'super_admin',
        'admin',
        'staff',
        'user',
        'customer',
        'restaurant',
        'branch',
        'order',
        'payment',
        'kot',
        'dish',
        'category',
        'ingredient',
        'supplier',
        'purchase',
        'setting',
        'system',
        'report',
        'subscription',
        'commission',
        'api_key',
        'audit_log',
      ],
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    targetName: {
      type: String,
      trim: true,
    },
    targetEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // ─── Change Tracking ──────────────────────────────────────────────────
    changes: {
      before: {
        type: mongoose.Schema.Types.Mixed,
      },
      after: {
        type: mongoose.Schema.Types.Mixed,
      },
      diff: {
        type: mongoose.Schema.Types.Mixed,
      },
    },

    // ─── Additional Details ──────────────────────────────────────────────
    details: {
      type: mongoose.Schema.Types.Mixed,
    },

    // ─── Metadata ──────────────────────────────────────────────────────────
    metadata: {
      ip: {
        type: String,
        trim: true,
      },
      userAgent: {
        type: String,
        trim: true,
      },
      device: {
        type: String,
        trim: true,
      },
      browser: {
        type: String,
        trim: true,
      },
      os: {
        type: String,
        trim: true,
      },
      location: {
        type: String,
        trim: true,
      },
      referer: {
        type: String,
        trim: true,
      },
      origin: {
        type: String,
        trim: true,
      },
    },

    // ─── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['success', 'failure', 'pending', 'partial'],
      default: 'success',
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    errorStack: {
      type: String,
      trim: true,
    },
    responseTime: {
      type: Number, // in milliseconds
    },

    // ─── Context ────────────────────────────────────────────────────────────
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    requestId: {
      type: String,
      index: true,
    },

    // ─── Importance/Level ─────────────────────────────────────────────────
    severity: {
      type: String,
      enum: ['debug', 'info', 'warning', 'error', 'critical', 'security'],
      default: 'info',
      index: true,
    },

    // ─── Retention ─────────────────────────────────────────────────────────
    retentionDays: {
      type: Number,
      default: 90, // 90 days retention
    },
    expiresAt: {
      type: Date,
      default: function() {
        const now = new Date();
        return new Date(now.setDate(now.getDate() + 90));
      },
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Compound Indexes for Performance ──────────────────────────────────────
platformAuditLogSchema.index({ createdAt: -1, action: 1 });
platformAuditLogSchema.index({ actorEmail: 1, createdAt: -1 });
platformAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
platformAuditLogSchema.index({ severity: 1, createdAt: -1 });
platformAuditLogSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });
platformAuditLogSchema.index({ sessionId: 1, createdAt: -1 });
platformAuditLogSchema.index({ status: 1, createdAt: -1 });

// ─── Virtuals ──────────────────────────────────────────────────────────────
platformAuditLogSchema.virtual('targetDisplay').get(function() {
  if (this.targetName) {
    return this.targetName;
  }
  if (this.targetEmail) {
    return this.targetEmail;
  }
  return this.targetId || 'Unknown';
});

platformAuditLogSchema.virtual('actorDisplay').get(function() {
  return `${this.actorName} (${this.actorEmail})`;
});

platformAuditLogSchema.virtual('actionLabel').get(function() {
  return this.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
});

// ─── Instance Methods ──────────────────────────────────────────────────────
platformAuditLogSchema.methods.toSanitizedObject = function() {
  const obj = this.toObject();
  delete obj.errorStack;
  delete obj.metadata?.userAgent;
  delete obj.metadata?.ip;
  return obj;
};

// ─── Static Methods ────────────────────────────────────────────────────────
platformAuditLogSchema.statics.getRecentForUser = function(
  actorEmail,
  limit = 50,
  skip = 0
) {
  return this.find({ actorEmail })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

platformAuditLogSchema.statics.getByAction = function(
  action,
  startDate,
  endDate,
  limit = 100
) {
  const query = { action };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

platformAuditLogSchema.statics.getByTarget = function(
  targetType,
  targetId,
  limit = 100
) {
  return this.find({ targetType, targetId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

platformAuditLogSchema.statics.countBySeverity = function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

platformAuditLogSchema.statics.countByAction = function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
};

// ─── Pre-save Middleware ──────────────────────────────────────────────────
platformAuditLogSchema.pre('save', function(next) {
  // Set expiration date if not already set
  if (!this.expiresAt) {
    const now = new Date();
    this.expiresAt = new Date(now.setDate(now.getDate() + (this.retentionDays || 90)));
  }
  
  // Set severity based on action if not explicitly set
  if (!this.severity) {
    const severityMap = {
      'LOGIN_ATTEMPT': 'info',
      'LOGIN_SUCCESS': 'info',
      'LOGIN_FAILED': 'warning',
      'LOGOUT': 'info',
      'PASSWORD_CHANGED': 'info',
      'PASSWORD_RESET_REQUESTED': 'info',
      'PASSWORD_RESET_COMPLETED': 'info',
      'TWO_FACTOR_ENABLED': 'info',
      'TWO_FACTOR_DISABLED': 'info',
      'ACCOUNT_LOCKED': 'warning',
      'ACCOUNT_UNLOCKED': 'info',
      'ACCOUNT_DEACTIVATED': 'warning',
      'ACCOUNT_ACTIVATED': 'info',
      'SQL_INJECTION_ATTEMPT': 'security',
      'XSS_ATTEMPT': 'security',
      'CSRF_ATTEMPT': 'security',
      'BRUTE_FORCE_ATTEMPT': 'security',
      'UNAUTHORIZED_ACCESS_ATTEMPT': 'security',
      'SUSPICIOUS_ACTIVITY_DETECTED': 'security',
      'RATE_LIMIT_EXCEEDED': 'warning',
      'SYSTEM_ERROR': 'critical',
      'MAINTENANCE_MODE_ENABLED': 'warning',
      'MAINTENANCE_MODE_DISABLED': 'info',
      'PLATFORM_BACKUP_CREATED': 'info',
      'PLATFORM_BACKUP_RESTORED': 'critical',
    };
    this.severity = severityMap[this.action] || 'info';
  }
  
  next();
});

// ─── TTL Index for Automatic Deletion ─────────────────────────────────────
platformAuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PlatformAuditLog', platformAuditLogSchema);