// models/super-admin/SuperAdminPermission.js

import mongoose from 'mongoose';

const superAdminPermissionSchema = new mongoose.Schema(
  {
    // ─── Super Admin Reference ─────────────────────────────────────────
    superAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      required: true,
      unique: true,
      index: true,
    },

    // ─── Who Granted These Permissions ────────────────────────────────
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterAdmin',
      required: true,
    },

    // ─── Restaurant Management ─────────────────────────────────────────
    canCreateRestaurant: { type: Boolean, default: true },
    canEditRestaurant: { type: Boolean, default: true },
    canDeleteRestaurant: { type: Boolean, default: false },
    canViewAllRestaurants: { type: Boolean, default: true },
    canApproveRestaurant: { type: Boolean, default: true },
    canRejectRestaurant: { type: Boolean, default: true },
    canSuspendRestaurant: { type: Boolean, default: false },

    // ─── Branch Management ─────────────────────────────────────────────
    canCreateBranch: { type: Boolean, default: true },
    canEditBranch: { type: Boolean, default: true },
    canDeleteBranch: { type: Boolean, default: false },
    canViewAllBranches: { type: Boolean, default: true },

    // ─── Staff Management ──────────────────────────────────────────────
    canCreateStaff: { type: Boolean, default: true },
    canEditStaff: { type: Boolean, default: true },
    canDeleteStaff: { type: Boolean, default: false },
    canViewAllStaff: { type: Boolean, default: true },
    canManageStaffRoles: { type: Boolean, default: true },
    canManageStaffPermissions: { type: Boolean, default: false },

    // ─── Order Management ──────────────────────────────────────────────
    canViewAllOrders: { type: Boolean, default: true },
    canCancelAnyOrder: { type: Boolean, default: false },
    canCompleteAnyOrder: { type: Boolean, default: false },
    canManageDelivery: { type: Boolean, default: true },

    // ─── Payment Management ────────────────────────────────────────────
    canViewAllPayments: { type: Boolean, default: true },
    canRefundPayment: { type: Boolean, default: false },
    canManagePaymentMethods: { type: Boolean, default: false },

    // ─── Menu Management ──────────────────────────────────────────────
    canCreateDish: { type: Boolean, default: true },
    canEditDish: { type: Boolean, default: true },
    canDeleteDish: { type: Boolean, default: false },
    canViewAllMenus: { type: Boolean, default: true },
    canManageCategories: { type: Boolean, default: true },

    // ─── Inventory Management ──────────────────────────────────────────
    canViewAllInventory: { type: Boolean, default: true },
    canManageInventory: { type: Boolean, default: true },
    canManageSuppliers: { type: Boolean, default: true },
    canCreatePurchase: { type: Boolean, default: true },

    // ─── Report Management ──────────────────────────────────────────────
    canViewAllReports: { type: Boolean, default: true },
    canExportReports: { type: Boolean, default: false },
    canViewFinancialReports: { type: Boolean, default: false },

    // ─── System Management ──────────────────────────────────────────────
    canManageSystemSettings: { type: Boolean, default: false },
    canViewAuditLogs: { type: Boolean, default: false },

    // ─── Subscription & Commission ─────────────────────────────────────
    canViewSubscriptions: { type: Boolean, default: true },
    canManageSubscriptions: { type: Boolean, default: false },
    canViewCommissions: { type: Boolean, default: true },
    canManageCommissions: { type: Boolean, default: false },

    // ─── Restrictions ───────────────────────────────────────────────────
    restaurantRestrictions: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Restaurant',
      default: [],
    },
    branchRestrictions: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Branch',
      default: [],
    },
    canManageAllRestaurants: { type: Boolean, default: true },
    canManageAllBranches: { type: Boolean, default: true },

    // ─── Permission Validity ──────────────────────────────────────────
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date },
    isPermanent: { type: Boolean, default: true },

    // ─── Audit ──────────────────────────────────────────────────────────
    notes: { type: String, trim: true, maxlength: 500 },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterAdmin' },
    lastModifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────
superAdminPermissionSchema.index({ superAdminId: 1 });
superAdminPermissionSchema.index({ grantedBy: 1 });
superAdminPermissionSchema.index({ validUntil: 1 });

export default mongoose.model('SuperAdminPermission', superAdminPermissionSchema);