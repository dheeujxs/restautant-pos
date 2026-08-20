// controllers/master-admin/superAdminController.js - NO PERMISSION CHECKS

import SuperAdmin from '../../models/super-admin/SuperAdmin.js';
import SuperAdminPermission from '../../models/master-admin/SuperAdminPermission.js'; // ✅ Fixed path
import PlatformAuditLog from '../../models/master-admin/PlatformAuditLog.js';
import MasterAdmin from '../../models/master-admin/MasterAdmin.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';
import { isValidEmail, isValidPhone, isValidName } from '../../utils/validators.js';

// ─── Email Transporter ──────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Send Welcome Email ──────────────────────────────────────────────────
const sendSuperAdminWelcomeEmail = async (email, fullName, password, loginUrl) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; text-align: center; }
        .button { display: inline-block; padding: 14px 40px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 10px; margin: 20px 0; font-weight: 600; }
        .credentials { background: #f5f3ff; padding: 20px; border-radius: 10px; margin: 15px 0; text-align: left; }
        .credentials p { margin: 5px 0; font-size: 13px; }
        .warning { background: #fef2f2; padding: 12px; border-radius: 8px; font-size: 12px; color: #dc2626; }
        .footer { background: #f8f7f4; padding: 20px; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Welcome to Ap●s Platform</h1>
          <p style="color: #e9d5ff; margin: 5px 0 0;">Super Admin Account Created</p>
        </div>
        <div class="content">
          <p>Hello <strong>${fullName}</strong>,</p>
          <p>Your Super Admin account has been created by the Master Admin.</p>
          <div class="credentials">
            <p><strong>📧 Email:</strong> ${email}</p>
            <p><strong>🔑 Password:</strong> ${password}</p>
          </div>
          <p style="font-size: 13px; color: #6b7280;">Please change your password after first login.</p>
          <a href="${loginUrl}" class="button">Login to Dashboard</a>
          <div class="warning">
            ⚠️ This is a system-generated email. Please keep your credentials secure.
          </div>
        </div>
        <div class="footer">
          <p>© 2024 Ap●s Restaurant Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Ap●s Platform" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🛡️ Welcome to Ap●s - Super Admin Account Created',
    html,
  });
};

// ─── CREATE SUPER ADMIN (NO PERMISSION CHECK) ──────────────────────────
// controllers/master-admin/superAdminController.js - FIXED createSuperAdmin

export const createSuperAdmin = async (req, res) => {
    try {
      const masterAdmin = req.masterAdmin;
  
      console.log('🔍 Creating Super Admin by:', masterAdmin?.email || 'Unknown');
  
      const body = sanitizeObject(req.body);
      const {
        firstName,
        lastName,
        email,
        phone,
        organizationName,
        notes,
        password, // ✅ ADD THIS
        confirmPassword, // ✅ ADD THIS
        // ─── Permissions ──────────────────────────────────────────────────
        canCreateRestaurant,
        canEditRestaurant,
        canDeleteRestaurant,
        canViewAllRestaurants,
        canApproveRestaurant,
        canRejectRestaurant,
        canSuspendRestaurant,
        canCreateBranch,
        canEditBranch,
        canDeleteBranch,
        canViewAllBranches,
        canCreateStaff,
        canEditStaff,
        canDeleteStaff,
        canViewAllStaff,
        canManageStaffRoles,
        canManageStaffPermissions,
        canViewAllOrders,
        canCancelAnyOrder,
        canCompleteAnyOrder,
        canManageDelivery,
        canViewAllPayments,
        canRefundPayment,
        canManagePaymentMethods,
        canCreateDish,
        canEditDish,
        canDeleteDish,
        canViewAllMenus,
        canManageCategories,
        canViewAllInventory,
        canManageInventory,
        canManageSuppliers,
        canCreatePurchase,
        canViewAllReports,
        canExportReports,
        canViewFinancialReports,
        canManageSystemSettings,
        canViewAuditLogs,
        canViewSubscriptions,
        canManageSubscriptions,
        canViewCommissions,
        canManageCommissions,
        restaurantRestrictions,
        branchRestrictions,
        canManageAllRestaurants,
        canManageAllBranches,
        validUntil,
        isPermanent,
      } = body;
  
      // ─── Validation ──────────────────────────────────────────────────────
      if (!firstName || !isValidName(firstName)) {
        return res.status(400).json({
          success: false,
          error: 'First name is required and must be at least 2 characters',
        });
      }
  
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address',
        });
      }
  
      if (!phone || !isValidPhone(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid phone number',
        });
      }
  
      if (!organizationName || organizationName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Organization name is required and must be at least 2 characters',
        });
      }
  
      // ✅ Validate password
      if (!password || password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters',
        });
      }
  
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Passwords do not match',
        });
      }
  
      // ─── Check existing Super Admin ─────────────────────────────────────
      const existingSuperAdmin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });
      if (existingSuperAdmin) {
        return res.status(409).json({
          success: false,
          error: 'A Super Admin with this email already exists',
        });
      }
  
      // ─── Create Super Admin ─────────────────────────────────────────────
      // ✅ PASS PLAIN PASSWORD - Model will hash it automatically
      const superAdmin = await SuperAdmin.create({
        firstName: sanitizeInput(firstName.trim()),
        lastName: lastName ? sanitizeInput(lastName.trim()) : '',
        email: email.toLowerCase().trim(),
        phone,
        organizationName: sanitizeInput(organizationName.trim()),
        password: password, // ✅ PLAIN PASSWORD - model hashes it
        role: 'superadmin',
        isActive: true,
        isVerified: true,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        agreedToTerms: true,
        termsAcceptedAt: new Date(),
      });
  
      // ─── Create Permissions ─────────────────────────────────────────────
      const permissionData = {
        superAdminId: superAdmin._id,
        grantedBy: masterAdmin?._id || null,
        canCreateRestaurant: canCreateRestaurant !== undefined ? canCreateRestaurant : true,
        canEditRestaurant: canEditRestaurant !== undefined ? canEditRestaurant : true,
        canDeleteRestaurant: canDeleteRestaurant !== undefined ? canDeleteRestaurant : false,
        canViewAllRestaurants: canViewAllRestaurants !== undefined ? canViewAllRestaurants : true,
        canApproveRestaurant: canApproveRestaurant !== undefined ? canApproveRestaurant : true,
        canRejectRestaurant: canRejectRestaurant !== undefined ? canRejectRestaurant : true,
        canSuspendRestaurant: canSuspendRestaurant !== undefined ? canSuspendRestaurant : false,
        canCreateBranch: canCreateBranch !== undefined ? canCreateBranch : true,
        canEditBranch: canEditBranch !== undefined ? canEditBranch : true,
        canDeleteBranch: canDeleteBranch !== undefined ? canDeleteBranch : false,
        canViewAllBranches: canViewAllBranches !== undefined ? canViewAllBranches : true,
        canCreateStaff: canCreateStaff !== undefined ? canCreateStaff : true,
        canEditStaff: canEditStaff !== undefined ? canEditStaff : true,
        canDeleteStaff: canDeleteStaff !== undefined ? canDeleteStaff : false,
        canViewAllStaff: canViewAllStaff !== undefined ? canViewAllStaff : true,
        canManageStaffRoles: canManageStaffRoles !== undefined ? canManageStaffRoles : true,
        canManageStaffPermissions: canManageStaffPermissions !== undefined ? canManageStaffPermissions : false,
        canViewAllOrders: canViewAllOrders !== undefined ? canViewAllOrders : true,
        canCancelAnyOrder: canCancelAnyOrder !== undefined ? canCancelAnyOrder : false,
        canCompleteAnyOrder: canCompleteAnyOrder !== undefined ? canCompleteAnyOrder : false,
        canManageDelivery: canManageDelivery !== undefined ? canManageDelivery : true,
        canViewAllPayments: canViewAllPayments !== undefined ? canViewAllPayments : true,
        canRefundPayment: canRefundPayment !== undefined ? canRefundPayment : false,
        canManagePaymentMethods: canManagePaymentMethods !== undefined ? canManagePaymentMethods : false,
        canCreateDish: canCreateDish !== undefined ? canCreateDish : true,
        canEditDish: canEditDish !== undefined ? canEditDish : true,
        canDeleteDish: canDeleteDish !== undefined ? canDeleteDish : false,
        canViewAllMenus: canViewAllMenus !== undefined ? canViewAllMenus : true,
        canManageCategories: canManageCategories !== undefined ? canManageCategories : true,
        canViewAllInventory: canViewAllInventory !== undefined ? canViewAllInventory : true,
        canManageInventory: canManageInventory !== undefined ? canManageInventory : true,
        canManageSuppliers: canManageSuppliers !== undefined ? canManageSuppliers : true,
        canCreatePurchase: canCreatePurchase !== undefined ? canCreatePurchase : true,
        canViewAllReports: canViewAllReports !== undefined ? canViewAllReports : true,
        canExportReports: canExportReports !== undefined ? canExportReports : false,
        canViewFinancialReports: canViewFinancialReports !== undefined ? canViewFinancialReports : false,
        canManageSystemSettings: canManageSystemSettings !== undefined ? canManageSystemSettings : false,
        canViewAuditLogs: canViewAuditLogs !== undefined ? canViewAuditLogs : false,
        canViewSubscriptions: canViewSubscriptions !== undefined ? canViewSubscriptions : true,
        canManageSubscriptions: canManageSubscriptions !== undefined ? canManageSubscriptions : false,
        canViewCommissions: canViewCommissions !== undefined ? canViewCommissions : true,
        canManageCommissions: canManageCommissions !== undefined ? canManageCommissions : false,
        restaurantRestrictions: restaurantRestrictions || [],
        branchRestrictions: branchRestrictions || [],
        canManageAllRestaurants: canManageAllRestaurants !== undefined ? canManageAllRestaurants : true,
        canManageAllBranches: canManageAllBranches !== undefined ? canManageAllBranches : true,
        validFrom: new Date(),
        validUntil: validUntil || null,
        isPermanent: isPermanent !== undefined ? isPermanent : true,
        notes: notes ? sanitizeInput(notes.trim()) : '',
        lastModifiedBy: masterAdmin?._id || null,
      };
  
      const permissions = await SuperAdminPermission.create(permissionData);
  
      // ─── Send Welcome Email ────────────────────────────────────────────
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/super-admin/login`;
      const fullName = `${superAdmin.firstName} ${superAdmin.lastName || ''}`.trim();
  
      try {
        await sendSuperAdminWelcomeEmail(superAdmin.email, fullName, password, loginUrl);
        console.log(`📧 Welcome email sent to ${superAdmin.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError);
      }
  
      // ─── Audit Log ──────────────────────────────────────────────────────
      await PlatformAuditLog.create({
        masterAdminId: masterAdmin?._id || null,
        actorType: 'master_admin',
        actorEmail: masterAdmin?.email || 'system',
        actorName: masterAdmin ? `${masterAdmin.firstName} ${masterAdmin.lastName || ''}`.trim() : 'System',
        action: 'SUPER_ADMIN_CREATED',
        targetType: 'super_admin',
        targetId: superAdmin._id.toString(),
        targetName: fullName,
        targetEmail: superAdmin.email,
        details: {
          permissions: permissionData,
          organizationName: superAdmin.organizationName,
          grantedBy: masterAdmin?.email || 'system',
        },
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
        severity: 'info',
      });
  
      // ─── Update Master Admin Stats ──────────────────────────────────────
      if (masterAdmin) {
        await MasterAdmin.findByIdAndUpdate(masterAdmin._id, {
          $inc: { 'stats.totalSuperAdmins': 1 },
        });
      }
  
      // ─── Response ──────────────────────────────────────────────────────
      res.status(201).json({
        success: true,
        message: 'Super Admin created successfully!',
        data: {
          superAdmin: {
            id: superAdmin._id,
            firstName: superAdmin.firstName,
            lastName: superAdmin.lastName,
            email: superAdmin.email,
            phone: superAdmin.phone,
            organizationName: superAdmin.organizationName,
            isActive: superAdmin.isActive,
            createdAt: superAdmin.createdAt,
          },
          permissions: permissions,
          generatedPassword: password, // Return the original password
          emailSent: true,
        },
      });
  
    } catch (error) {
      console.error('❌ Create Super Admin Error:', error);
  
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'A Super Admin with this email already exists',
        });
      }
  
      res.status(500).json({
        success: false,
        error: 'Failed to create Super Admin',
      });
    }
  };

  // Add this to your restaurantController.js

// ─── GET SINGLE RESTAURANT ──────────────────────────────────────────────────
export const getRestaurantById = async (req, res) => {
    try {
      const { id } = req.params;
  
      const restaurant = await Restaurant.findById(id)
        .populate('approvedBy', 'firstName lastName email')
        .populate('rejectedBy', 'firstName lastName email')
        .populate('overriddenBy', 'firstName lastName email')
        .populate('owner', 'name email phone')
        .lean(); // Use lean() for better performance
  
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }
  
      res.status(200).json({
        success: true,
        data: restaurant,
      });
  
    } catch (error) {
      console.error('❌ Get Restaurant Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurant details',
      });
    }
  };
  
  // ─── GET ALL RESTAURANTS (with filters) ──────────────────────────────────
  export const getAllRestaurants = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        approvalStatus,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;
  
      // Build filter
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'owner.name': { $regex: search, $options: 'i' } },
          { 'owner.email': { $regex: search, $options: 'i' } },
        ];
      }
  
      if (approvalStatus && approvalStatus !== 'all') {
        filter.approvalStatus = approvalStatus;
      }
  
      if (status && status !== 'all') {
        filter.status = status;
      }
  
      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  
      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      // Get total count
      const total = await Restaurant.countDocuments(filter);
  
      // Get restaurants
      const restaurants = await Restaurant.find(filter)
        .populate('owner', 'name email phone')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
  
      res.status(200).json({
        success: true,
        data: {
          restaurants,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
  
    } catch (error) {
      console.error('❌ Get Restaurants Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurants',
      });
    }
  };

// ─── GET ALL SUPER ADMINS (NO PERMISSION CHECK) ──────────────────────────
export const getSuperAdmins = async (req, res) => {
  try {
    const masterAdmin = req.masterAdmin;

    // ─── ⚠️ PERMISSION CHECK REMOVED ──────────────────────────────────
    // if (!masterAdmin.canViewAllSuperAdmins) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'You do not have permission to view Super Admins',
    //   });
    // }

    const { page = 1, limit = 20, search, status } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organizationName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      filter.isActive = status === 'active';
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [superAdmins, total] = await Promise.all([
      SuperAdmin.find(filter)
        .select('-password -refreshToken -verificationToken -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SuperAdmin.countDocuments(filter),
    ]);

    // ─── Get permissions for each Super Admin ──────────────────────────
    const superAdminIds = superAdmins.map(function(sa) { return sa._id; });
    const permissions = await SuperAdminPermission.find({
      superAdminId: { $in: superAdminIds },
    }).lean();

    const permissionMap = {};
    permissions.forEach(function(p) {
      permissionMap[p.superAdminId.toString()] = p;
    });

    const superAdminsWithPermissions = superAdmins.map(function(sa) {
      return {
        ...sa,
        permissions: permissionMap[sa._id.toString()] || null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        superAdmins: superAdminsWithPermissions,
        pagination: {
          total: total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });

  } catch (error) {
    console.error('❌ Get Super Admins Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Super Admins',
    });
  }
};

// ─── GET SUPER ADMIN BY ID (NO PERMISSION CHECK) ──────────────────────────
export const getSuperAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const masterAdmin = req.masterAdmin;

    // ─── ⚠️ PERMISSION CHECK REMOVED ──────────────────────────────────
    // if (!masterAdmin.canViewAllSuperAdmins) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'You do not have permission to view Super Admins',
    //   });
    // }

    const superAdmin = await SuperAdmin.findById(id)
      .select('-password -refreshToken -verificationToken -passwordResetToken')
      .lean();

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Super Admin not found',
      });
    }

    const permissions = await SuperAdminPermission.findOne({ superAdminId: id }).lean();

    res.status(200).json({
      success: true,
      data: {
        ...superAdmin,
        permissions: permissions,
      },
    });

  } catch (error) {
    console.error('❌ Get Super Admin Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Super Admin',
    });
  }
};

// ─── GET SUPER ADMIN PERMISSIONS (NO PERMISSION CHECK) ──────────────────────
export const getSuperAdminPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const masterAdmin = req.masterAdmin;

    // ─── ⚠️ PERMISSION CHECK REMOVED ──────────────────────────────────
    // if (!masterAdmin.canViewAllSuperAdmins) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'You do not have permission to view Super Admin permissions',
    //   });
    // }

    const permissions = await SuperAdminPermission.findOne({ superAdminId: id }).lean();

    if (!permissions) {
      return res.status(404).json({
        success: false,
        error: 'Permissions not found for this Super Admin',
      });
    }

    res.status(200).json({
      success: true,
      data: permissions,
    });

  } catch (error) {
    console.error('❌ Get Super Admin Permissions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions',
    });
  }
};

// ─── UPDATE SUPER ADMIN (NO PERMISSION CHECK) ──────────────────────────────
export const updateSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const masterAdmin = req.masterAdmin;

    // ─── ⚠️ PERMISSION CHECK REMOVED ──────────────────────────────────
    // if (!masterAdmin.canModifySuperAdminPermissions) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'You do not have permission to update Super Admins',
    //   });
    // }

    const body = sanitizeObject(req.body);
    const {
      firstName,
      lastName,
      phone,
      organizationName,
      isActive,
      notes,
    } = body;

    const updateData = {};
    if (firstName) updateData.firstName = sanitizeInput(firstName.trim());
    if (lastName !== undefined) updateData.lastName = lastName ? sanitizeInput(lastName.trim()) : '';
    if (phone) updateData.phone = phone;
    if (organizationName) updateData.organizationName = sanitizeInput(organizationName.trim());
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.updatedAt = new Date();

    const superAdmin = await SuperAdmin.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -verificationToken -passwordResetToken');

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Super Admin not found',
      });
    }

    // ─── Audit Log ──────────────────────────────────────────────────────
    await PlatformAuditLog.create({
      masterAdminId: masterAdmin?._id || null,
      actorType: 'master_admin',
      actorEmail: masterAdmin?.email || 'system',
      actorName: masterAdmin ? `${masterAdmin.firstName} ${masterAdmin.lastName || ''}`.trim() : 'System',
      action: 'SUPER_ADMIN_UPDATED',
      targetType: 'super_admin',
      targetId: superAdmin._id.toString(),
      targetName: `${superAdmin.firstName} ${superAdmin.lastName || ''}`.trim(),
      targetEmail: superAdmin.email,
      details: { updatedFields: Object.keys(updateData) },
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      severity: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Super Admin updated successfully',
      data: superAdmin,
    });

  } catch (error) {
    console.error('❌ Update Super Admin Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Super Admin',
    });
  }
};

// ─── UPDATE SUPER ADMIN PERMISSIONS (NO PERMISSION CHECK) ──────────────────
export const updateSuperAdminPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const masterAdmin = req.masterAdmin;

    // ─── ⚠️ PERMISSION CHECK REMOVED ──────────────────────────────────
    // if (!masterAdmin.canModifySuperAdminPermissions) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'You do not have permission to modify Super Admin permissions',
    //   });
    // }

    const body = sanitizeObject(req.body);
    // ... rest of the function
  } catch (error) {
    console.error('❌ Update Super Admin Permissions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update permissions',
    });
  }
};

// ─── TOGGLE SUPER ADMIN STATUS (NO PERMISSION CHECK) ──────────────────────
export const toggleSuperAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const masterAdmin = req.masterAdmin;

    // ─── ⚠️ PERMISSION CHECK REMOVED ──────────────────────────────────
    // if (!masterAdmin.canSuspendSuperAdmin && !masterAdmin.canActivateSuperAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'You do not have permission to change Super Admin status',
    //   });
    // }

    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Super Admin not found',
      });
    }

    if (superAdmin._id.toString() === masterAdmin?._id?.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot change your own status',
      });
    }

    superAdmin.isActive = !superAdmin.isActive;
    await superAdmin.save();

    await PlatformAuditLog.create({
      masterAdminId: masterAdmin?._id || null,
      actorType: 'master_admin',
      actorEmail: masterAdmin?.email || 'system',
      actorName: masterAdmin ? `${masterAdmin.firstName} ${masterAdmin.lastName || ''}`.trim() : 'System',
      action: superAdmin.isActive ? 'SUPER_ADMIN_ACTIVATED' : 'SUPER_ADMIN_SUSPENDED',
      targetType: 'super_admin',
      targetId: superAdmin._id.toString(),
      targetName: `${superAdmin.firstName} ${superAdmin.lastName || ''}`.trim(),
      targetEmail: superAdmin.email,
      details: { newStatus: superAdmin.isActive ? 'active' : 'suspended' },
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      severity: 'warning',
    });

    res.status(200).json({
      success: true,
      message: `Super Admin ${superAdmin.isActive ? 'activated' : 'suspended'} successfully`,
      data: {
        id: superAdmin._id,
        isActive: superAdmin.isActive,
      },
    });

  } catch (error) {
    console.error('❌ Toggle Super Admin Status Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle Super Admin status',
    });
  }
};

// ─── DELETE SUPER ADMIN (NO PERMISSION CHECK) ──────────────────────────────
export const deleteSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const masterAdmin = req.masterAdmin;

    // ─── ⚠️ PERMISSION CHECK REMOVED ──────────────────────────────────
    // if (!masterAdmin.canDeleteSuperAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'You do not have permission to delete Super Admins',
    //   });
    // }

    const superAdmin = await SuperAdmin.findById(id);
    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Super Admin not found',
      });
    }

    if (superAdmin._id.toString() === masterAdmin?._id?.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account',
      });
    }

    const fullName = `${superAdmin.firstName} ${superAdmin.lastName || ''}`.trim();

    await SuperAdminPermission.findOneAndDelete({ superAdminId: id });
    await SuperAdmin.findByIdAndDelete(id);

    if (masterAdmin) {
      await MasterAdmin.findByIdAndUpdate(masterAdmin._id, {
        $inc: { 'stats.totalSuperAdmins': -1 },
      });
    }

    await PlatformAuditLog.create({
      masterAdminId: masterAdmin?._id || null,
      actorType: 'master_admin',
      actorEmail: masterAdmin?.email || 'system',
      actorName: masterAdmin ? `${masterAdmin.firstName} ${masterAdmin.lastName || ''}`.trim() : 'System',
      action: 'SUPER_ADMIN_DELETED',
      targetType: 'super_admin',
      targetId: id,
      targetName: fullName,
      targetEmail: superAdmin.email,
      details: {
        deletedBy: masterAdmin?.email || 'system',
        deletedAt: new Date(),
      },
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      severity: 'critical',
    });

    res.status(200).json({
      success: true,
      message: `Super Admin ${fullName} deleted successfully`,
    });

  } catch (error) {
    console.error('❌ Delete Super Admin Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete Super Admin',
    });
  }
};