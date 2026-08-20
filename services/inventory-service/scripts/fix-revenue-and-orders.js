// scripts/create-super-admin-permissions.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SuperAdmin from '../models/super-admin/SuperAdmin.js';
import SuperAdminPermission from '../models/master-admin/SuperAdminPermission.js';
import MasterAdmin from '../models/master-admin/MasterAdmin.js';

dotenv.config();

const createPermissionsForSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the Master Admin who will grant permissions
    const masterAdmin = await MasterAdmin.findOne({ role: 'platform_owner' });
    if (!masterAdmin) {
      console.log('❌ Master Admin not found');
      process.exit(1);
    }
    console.log('📧 Master Admin:', masterAdmin.email);

    // Find all Super Admins without permissions
    const superAdmins = await SuperAdmin.find({});
    console.log(`📋 Found ${superAdmins.length} Super Admins`);

    let created = 0;
    let skipped = 0;

    for (const superAdmin of superAdmins) {
      // Check if permissions already exist
      const existing = await SuperAdminPermission.findOne({ 
        superAdminId: superAdmin._id 
      });

      if (existing) {
        console.log(`⏭️ Permissions already exist for: ${superAdmin.email}`);
        skipped++;
        continue;
      }

      // Create default permissions
      await SuperAdminPermission.create({
        superAdminId: superAdmin._id,
        grantedBy: masterAdmin._id,
        canCreateRestaurant: true,
        canEditRestaurant: true,
        canDeleteRestaurant: false,
        canViewAllRestaurants: true,
        canApproveRestaurant: true,
        canRejectRestaurant: true,
        canSuspendRestaurant: false,
        canCreateBranch: true,
        canEditBranch: true,
        canDeleteBranch: false,
        canViewAllBranches: true,
        canCreateStaff: true,
        canEditStaff: true,
        canDeleteStaff: false,
        canViewAllStaff: true,
        canManageStaffRoles: true,
        canManageStaffPermissions: false,
        canViewAllOrders: true,
        canCancelAnyOrder: false,
        canCompleteAnyOrder: false,
        canManageDelivery: true,
        canViewAllPayments: true,
        canRefundPayment: false,
        canManagePaymentMethods: false,
        canCreateDish: true,
        canEditDish: true,
        canDeleteDish: false,
        canViewAllMenus: true,
        canManageCategories: true,
        canViewAllInventory: true,
        canManageInventory: true,
        canManageSuppliers: true,
        canCreatePurchase: true,
        canViewAllReports: true,
        canExportReports: false,
        canViewFinancialReports: false,
        canManageSystemSettings: false,
        canViewAuditLogs: false,
        canViewSubscriptions: true,
        canManageSubscriptions: false,
        canViewCommissions: true,
        canManageCommissions: false,
        canManageAllRestaurants: true,
        canManageAllBranches: true,
        isPermanent: true,
        notes: 'Default permissions created by script',
      });

      console.log(`✅ Permissions created for: ${superAdmin.email}`);
      created++;
    }

    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createPermissionsForSuperAdmin();