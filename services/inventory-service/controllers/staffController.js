// controllers/staffController.js - Complete Updated with Permissions Support

import Staff from '../models/Staff.js';
import Role from '../models/Role.js';
import Restaurant from '../models/super-admin/Restaurant.js';
import Branch from '../models/super-admin/Branch.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { 
  isValidObjectId, 
  isValidName, 
  isValidEmail, 
  isValidPhone,
  isValidPassword,
  isValidText,
  isValidRole,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  ALLOWED_ROLES
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_PHONE_LENGTH = 15;
const MAX_EMPLOYEE_ID_LENGTH = 50;
const ALLOWED_STATUS = ['active', 'inactive', 'suspended'];
const DEFAULT_STATUS = 'active';

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

const isValidStaffName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_NAME_LENGTH) return false;
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  return nameRegex.test(trimmed);
};

const isValidPhoneNumber = (phone) => {
  if (!phone) return false;
  const trimmed = phone.trim();
  if (trimmed.length < 10) return false;
  if (trimmed.length > MAX_PHONE_LENGTH) return false;
  const phoneRegex = /^[+]?[0-9]{10,15}$/;
  return phoneRegex.test(trimmed);
};

const isValidStatus = (status) => {
  if (!status) return false;
  return ALLOWED_STATUS.includes(status);
};

const isValidPIN = (pin) => {
  if (!pin) return true;
  const trimmed = pin.trim();
  if (trimmed.length < 4) return false;
  if (trimmed.length > 6) return false;
  const pinRegex = /^[0-9]+$/;
  return pinRegex.test(trimmed);
};

const generateSecurePassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

// ✅ Updated sanitizeStaff to include permissions
// controllers/staffController.js - FIXED sanitizeStaff

const sanitizeStaff = (staff, allRoles = [], permissions = []) => {
  if (!staff) return null;
  
  let branchName = staff.branchName || 'All Branches';
  if (staff.branchId && typeof staff.branchId === 'object' && staff.branchId.name) {
    branchName = staff.branchId.name;
  }
  
  // ✅ FIXED: Properly handle permissions - check if defined, not just truthy
  let staffPermissions = [];
  
  // If staff.permissions exists (even if empty array), use it
  if (staff.permissions !== undefined && staff.permissions !== null) {
    staffPermissions = Array.isArray(staff.permissions) ? staff.permissions : [];
    console.log(`📋 [sanitizeStaff] ${staff.name} - Using staff.permissions: ${staffPermissions.length}`);
  } 
  // Otherwise fall back to role permissions
  else if (permissions && Array.isArray(permissions)) {
    staffPermissions = permissions;
    console.log(`📋 [sanitizeStaff] ${staff.name} - Using fallback permissions: ${staffPermissions.length}`);
  }
  
  return {
    _id: staff._id,
    id: staff._id,
    name: sanitizeInput(staff.name || ''),
    phoneNumber: staff.phoneNumber || '',
    email: staff.email || '',
    employeeId: staff.employeeId || '',
    role: allRoles[0] || '',
    roles: allRoles,
    roleId: staff.role?._id || staff.role || null,
    permissions: staffPermissions, // ✅ Use the properly resolved permissions
    canLoginKitchenPortal: staff.canLoginKitchenPortal !== false,
    status: staff.status || 'active',
    restaurantId: staff.restaurantId || null,
    restaurantName: staff.restaurantName || null,
    restaurantCode: staff.restaurantCode || null,
    branchId: staff.branchId?._id || staff.branchId || null,
    branchName: branchName,
    branchHistory: staff.branchTransferHistory || [],
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  };
};

// ============================================================
//  STAFF CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all staff with branch filter support
// @route   GET /api/staff
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getStaff = async (req, res) => {
  try {
    const { role, status, search, restaurantId, branchId } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    console.log('📋 GET STAFF with filters:', { restaurantId, branchId, role, status, search });

    let query = {};
    
    // ─── Restaurant Filter ──────────────────────────────────────────────
    if (req.user && req.user.restaurantId && req.user.role !== 'superadmin') {
      query.restaurantId = req.user.restaurantId;
    }
    
    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      query.restaurantId = restaurantId;
    }

    // ─── Branch Filter ──────────────────────────────────────────────────
    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      
      query.$or = [
        { branchId: branchId },
        { branchId: null },
        { branchId: { $exists: false } }
      ];
    }

    // ─── Role Filter ────────────────────────────────────────────────────
    if (role) {
      const roleDoc = await Role.findOne({ name: role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          error: `Invalid role "${role}". Role does not exist or is inactive.`,
        });
      }
      query.role = roleDoc._id;
    }
    
    // ─── Status Filter ──────────────────────────────────────────────────
    if (status) {
      if (!isValidStatus(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Allowed: ${ALLOWED_STATUS.join(', ')}`,
        });
      }
      query.status = status;
    }
    
    // ─── Search Filter ──────────────────────────────────────────────────
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { phoneNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { employeeId: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
    
    const [staff, total] = await Promise.all([
      Staff.find(query)
        .populate('role')
        .populate('roles')
        .populate('restaurantId', 'name')
        .populate('branchId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Staff.countDocuments(query),
    ]);
    
    const staffData = await Promise.all(staff.map(async (s) => {
      const { roles: allRoles, permissions } = await Staff.prototype.getAllRolesAndPermissions.call(s);
      // Pass staff permissions to sanitize
      return sanitizeStaff(s, allRoles, s.permissions || permissions);
    }));
    
    return res.json({
      success: true,
      data: {
        staff: staffData,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: staff.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/staff] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch staff',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get single staff
// @route   GET /api/staff/:id
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }

    const staff = await Staff.findById(id)
      .populate('role')
      .populate('roles')
      .populate('restaurantId', 'name')
      .populate('branchId', 'name')
      .lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    const { roles: allRoles, permissions } = await Staff.prototype.getAllRolesAndPermissions.call(staff);

    return res.json({
      success: true,
      data: sanitizeStaff(staff, allRoles, staff.permissions || permissions),
    });
  } catch (error) {
    console.error('[GET /api/staff/:id] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch staff',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get available roles (for dropdown)
// @route   GET /api/staff/roles/list
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getAvailableRoles = async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    const sanitizedRoles = roles.map(role => ({
      _id: role._id,
      name: sanitizeInput(role.name),
      description: sanitizeInput(role.description || ''),
      permissions: role.permissions || [],
      color: role.color || '#6B7280',
      icon: role.icon || 'User',
    }));

    return res.json({
      success: true,
      data: sanitizedRoles,
      count: roles.length,
    });
  } catch (error) {
    console.error('[GET /api/staff/roles/list] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch roles',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create new staff with permissions support
// @route   POST /api/staff
// @access  Private (Admin or Super Admin)
// ──────────────────────────────────────────────────────────────────────────

// controllers/staffController.js - FIXED createStaff

export const createStaff = async (req, res) => {
  try {
    console.log('========================================');
    console.log('📝 CREATE STAFF');
    console.log('========================================');
    
    const user = req.user;
    const isSuperAdmin = req.isSuperAdmin || false;
    
    console.log('👤 Current user:', {
      id: user?._id,
      email: user?.email,
      role: user?.role,
      restaurantId: user?.restaurantId,
      branchId: user?.branchId,
      isSuperAdmin: isSuperAdmin
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
    }

    const body = sanitizeObject(req.body);
    const {
      name,
      phoneNumber,
      email,
      password,
      pin,
      role,
      roles,
      permissions, // ✅ Add permissions
      canLoginKitchenPortal,
      status,
      restaurantId: providedRestaurantId,
      branchId: providedBranchId,
    } = body;

    let adminRestaurantId = null;
    let adminBranchId = null;
    let restaurantName = null;
    let restaurantCode = null;
    let branchName = null;

    // ─── Restaurant/Branch Context ──────────────────────────────────────
    if (isSuperAdmin) {
      if (!providedRestaurantId) {
        return res.status(400).json({
          success: false,
          error: 'Please provide restaurantId when creating staff as Super Admin.',
        });
      }
      
      const restaurant = await Restaurant.findById(providedRestaurantId);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }
      
      adminRestaurantId = providedRestaurantId;
      
      if (providedBranchId) {
        const branch = await Branch.findOne({ 
          _id: providedBranchId, 
          restaurantId: providedRestaurantId 
        }).lean();
        if (branch) {
          adminBranchId = providedBranchId;
          branchName = branch.name;
        } else {
          adminBranchId = null;
          branchName = 'All Branches';
        }
      } else {
        adminBranchId = null;
        branchName = 'All Branches';
      }
      
      restaurantName = restaurant.name;
      restaurantCode = Staff.generateRestaurantCode(restaurant.name);
    } 
    else if (user.role === 'admin' || user.role === 'Admin') {
      if (!user.restaurantId) {
        return res.status(400).json({
          success: false,
          error: 'Admin restaurant context not found. Please contact support.',
        });
      }

      const restaurant = await Restaurant.findById(user.restaurantId);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found for this admin',
        });
      }

      adminRestaurantId = user.restaurantId;
      
      if (providedBranchId) {
        const branch = await Branch.findOne({ 
          _id: providedBranchId, 
          restaurantId: adminRestaurantId 
        }).lean();
        if (branch) {
          adminBranchId = providedBranchId;
          branchName = branch.name;
        } else {
          adminBranchId = user.branchId || null;
          branchName = user.branchName || 'All Branches';
        }
      } else {
        adminBranchId = user.branchId || null;
        branchName = user.branchName || 'All Branches';
      }
      
      restaurantName = restaurant.name;
      restaurantCode = Staff.generateRestaurantCode(restaurant.name);
    } 
    else {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Admin or Super Admin can create staff.',
      });
    }

    // ─── Validation ──────────────────────────────────────────────────────
    if (!name || !isValidStaffName(name)) {
      return res.status(400).json({
        success: false,
        error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`,
      });
    }

    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Valid phone number is required (10-15 digits, optional + prefix)',
      });
    }

    const existingStaff = await Staff.findOne({ phoneNumber });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        error: 'Phone number already registered',
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // ─── Role Handling ──────────────────────────────────────────────────
    let roleIds = [];
    let roleNames = [];
    let primaryRoleId = null;

    if (roles && Array.isArray(roles) && roles.length > 0) {
      const roleDocs = await Role.find({ name: { $in: roles }, isActive: true });
      if (roleDocs.length !== roles.length) {
        const foundNames = roleDocs.map(r => r.name);
        const missing = roles.filter(r => !foundNames.includes(r));
        return res.status(400).json({
          success: false,
          error: `Invalid roles: ${missing.join(', ')}. Roles do not exist or are inactive.`,
        });
      }
      roleIds = roleDocs.map(r => r._id);
      roleNames = roleDocs.map(r => r.name);
      primaryRoleId = roleIds[0];
    } 
    else if (role) {
      const roleDoc = await Role.findOne({ name: role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          error: `Invalid role "${role}". Role does not exist or is inactive.`,
        });
      }
      roleIds = [roleDoc._id];
      roleNames = [roleDoc.name];
      primaryRoleId = roleDoc._id;
    } else {
      const defaultRole = await Role.findOne({ name: 'staff', isActive: true });
      if (defaultRole) {
        roleIds = [defaultRole._id];
        roleNames = [defaultRole.name];
        primaryRoleId = defaultRole._id;
      } else {
        return res.status(400).json({
          success: false,
          error: 'No role provided and no default role found',
        });
      }
    }

    // ─── ✅ FIXED: Handle Permissions ──────────────────────────────────
    let finalPermissions = [];
    
    // ✅ Check if permissions is defined (even if empty array)
    if (permissions !== undefined && permissions !== null) {
      // Use provided permissions (could be empty array)
      finalPermissions = Array.isArray(permissions) ? permissions : [];
      console.log(`📋 Using provided permissions: ${finalPermissions.length}`);
      console.log(`📋 Permissions:`, finalPermissions);
    } 
    // Otherwise, get permissions from the role(s)
    else if (roleIds.length > 0) {
      const roleDocs = await Role.find({ _id: { $in: roleIds } });
      const allRolePermissions = roleDocs.flatMap(r => r.permissions || []);
      finalPermissions = [...new Set(allRolePermissions)];
      console.log(`📋 Using role permissions: ${finalPermissions.length}`);
    }

    if (pin && !isValidPIN(pin)) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be 4-6 digits',
      });
    }

    if (status && !isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${ALLOWED_STATUS.join(', ')}`,
      });
    }

    // ─── Generate Employee ID ────────────────────────────────────────────
    const employeeId = await Staff.generateEmployeeId(adminRestaurantId, restaurantName);

    // ─── Password Handling ──────────────────────────────────────────────
    let finalPassword = password;
    let autoGeneratedPassword = null;

    if (!finalPassword) {
      autoGeneratedPassword = generateSecurePassword();
      finalPassword = autoGeneratedPassword;
    }

    if (!isValidPassword(finalPassword)) {
      return res.status(400).json({
        success: false,
        error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    // ─── Create Staff ────────────────────────────────────────────────────
    const staffData = {
      name: sanitizeInput(name.trim()),
      phoneNumber,
      email: email ? email.toLowerCase().trim() : undefined,
      employeeId,
      password: finalPassword,
      pin: pin || undefined,
      role: primaryRoleId,
      roles: roleIds,
      roleName: roleNames.join(', '),
      permissions: finalPermissions, // ✅ Include permissions (even if empty)
      canLoginKitchenPortal: canLoginKitchenPortal !== undefined ? canLoginKitchenPortal : true,
      status: status || DEFAULT_STATUS,
      restaurantId: adminRestaurantId,
      restaurantName: restaurantName,
      restaurantCode: restaurantCode,
      branchId: adminBranchId,
      branchName: branchName,
      createdBy: user._id,
      createdByName: user.name || user.firstName + ' ' + (user.lastName || ''),
    };

    const staff = await Staff.create(staffData);

    const populatedStaff = await Staff.findById(staff._id)
      .populate('role')
      .populate('roles')
      .populate('restaurantId', 'name')
      .populate('branchId', 'name')
      .lean();

    const { roles: allRoles } = await Staff.prototype.getAllRolesAndPermissions.call(populatedStaff);

    console.log('✅ Staff created successfully:', staff.name);
    console.log('✅ Employee ID:', staff.employeeId);
    console.log('✅ Permissions assigned:', finalPermissions.length);
    console.log('✅ Permissions:', finalPermissions);
    console.log('========================================');

    return res.status(201).json({
      success: true,
      data: sanitizeStaff(populatedStaff, allRoles, finalPermissions),
      autoGeneratedPassword: autoGeneratedPassword,
      message: autoGeneratedPassword 
        ? `Staff created successfully. Employee ID: ${employeeId}. Auto-generated password: ${autoGeneratedPassword}`
        : `Staff created successfully. Employee ID: ${employeeId}`,
    });
  } catch (error) {
    console.error('[POST /api/staff] ERROR:', error.message);
    
    if (error.code === 11000) {
      if (error.keyPattern?.employeeId && error.keyPattern?.restaurantId) {
        return res.status(409).json({
          success: false,
          error: 'Employee ID already exists for this restaurant. Please try again.',
        });
      }
      if (error.keyPattern?.phoneNumber) {
        return res.status(409).json({
          success: false,
          error: 'Phone number already registered',
        });
      }
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry. Please check employee ID and phone number.',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create staff',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update staff with permissions support
// @route   PUT /api/staff/:id
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    const body = sanitizeObject(req.body);
    const {
      name,
      phoneNumber,
      email,
      pin,
      role,
      roles,
      permissions, // ✅ Add permissions
      canLoginKitchenPortal,
      status,
    } = body;

    // ❌ Prevent restaurant change
    if (body.restaurantId && body.restaurantId !== staff.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: '❌ Restaurant cannot be changed. Please delete and create a new staff member.',
      });
    }

    // ❌ Prevent branch change - use transfer endpoint
    if (body.branchId && body.branchId !== staff.branchId?.toString()) {
      return res.status(403).json({
        success: false,
        error: '❌ Branch cannot be changed directly. Use the branch transfer endpoint.',
      });
    }

    const updateData = {};

    // ─── Validate and update fields ─────────────────────────────────────
    if (name && isValidStaffName(name)) {
      updateData.name = sanitizeInput(name.trim());
    } else if (name) {
      return res.status(400).json({
        success: false,
        error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`,
      });
    }

    if (phoneNumber) {
      if (!isValidPhoneNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Valid phone number is required (10-15 digits, optional + prefix)',
        });
      }
      const existing = await Staff.findOne({ phoneNumber, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Phone number already registered by another staff member',
        });
      }
      updateData.phoneNumber = phoneNumber;
    }

    if (email !== undefined) {
      if (email && !isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }
      updateData.email = email ? email.toLowerCase().trim() : undefined;
    }

    // ─── Update Roles ────────────────────────────────────────────────────
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const roleDocs = await Role.find({ name: { $in: roles }, isActive: true });
      if (roleDocs.length !== roles.length) {
        const foundNames = roleDocs.map(r => r.name);
        const missing = roles.filter(r => !foundNames.includes(r));
        return res.status(400).json({
          success: false,
          error: `Invalid roles: ${missing.join(', ')}. Roles do not exist or are inactive.`,
        });
      }
      updateData.roles = roleDocs.map(r => r._id);
      updateData.role = roleDocs[0]._id;
      updateData.roleName = roleDocs.map(r => r.name).join(', ');
    } else if (role) {
      const roleDoc = await Role.findOne({ name: role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          error: `Invalid role "${role}". Role does not exist or is inactive.`,
        });
      }
      updateData.role = roleDoc._id;
      updateData.roles = [roleDoc._id];
      updateData.roleName = roleDoc.name;
    }

    // ─── ✅ Update Permissions ──────────────────────────────────────────
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'Permissions must be an array',
        });
      }
      updateData.permissions = permissions;
      console.log('📋 Updating permissions:', permissions.length);
    }

    if (pin !== undefined) {
      if (pin && !isValidPIN(pin)) {
        return res.status(400).json({
          success: false,
          error: 'PIN must be 4-6 digits',
        });
      }
      if (pin) {
        const salt = await bcrypt.genSalt(10);
        updateData.pin = await bcrypt.hash(pin.toString(), salt);
      } else {
        updateData.pin = null;
      }
    }

    if (canLoginKitchenPortal !== undefined) {
      updateData.canLoginKitchenPortal = canLoginKitchenPortal;
    }

    if (status && isValidStatus(status)) {
      updateData.status = status;
    } else if (status) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${ALLOWED_STATUS.join(', ')}`,
      });
    }

    // ─── Apply updates ──────────────────────────────────────────────────
    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('role')
      .populate('roles')
      .populate('restaurantId', 'name')
      .populate('branchId', 'name')
      .lean();

    const { roles: allRoles, permissions: rolePermissions } = await Staff.prototype.getAllRolesAndPermissions.call(updatedStaff);
    
    // Use staff permissions if they exist, otherwise use role permissions
    const finalPermissions = updatedStaff.permissions || rolePermissions;

    return res.json({
      success: true,
      data: sanitizeStaff(updatedStaff, allRoles, finalPermissions),
      message: 'Staff updated successfully',
    });
  } catch (error) {
    console.error('[PUT /api/staff/:id] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update staff',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Transfer staff to another branch
// @route   POST /api/staff/:id/transfer-branch
// @access  Private (Admin/Super Admin)
// ──────────────────────────────────────────────────────────────────────────

export const transferStaffBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      newBranchId, 
      reason, 
      notes,
      effectiveDate 
    } = req.body;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }
    
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    const restaurant = await Restaurant.findById(staff.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    const newBranch = await Branch.findOne({ 
      _id: newBranchId, 
      restaurantId: staff.restaurantId 
    }).lean();
    
    if (!newBranch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found in this restaurant',
      });
    }
    
    if (staff.branchId && staff.branchId.toString() === newBranchId) {
      return res.status(400).json({
        success: false,
        error: 'Staff is already in this branch',
      });
    }
    
    const oldBranchId = staff.branchId;
    const oldBranchName = staff.branchName || 'No Branch';
    const newBranchName = newBranch.name;
    
    staff.branchId = newBranch._id;
    staff.branchName = newBranch.name;
    
    staff.branchTransferHistory.push({
      fromBranchId: oldBranchId,
      fromBranchName: oldBranchName,
      toBranchId: newBranch._id,
      toBranchName: newBranch.name,
      transferredBy: req.user?._id || req.admin?._id,
      transferredByName: req.user?.name || req.admin?.name || 'System',
      reason: reason || 'other',
      notes: notes || '',
      transferDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    });
    
    staff.lastBranchTransferAt = new Date();
    await staff.save();
    
    const populatedStaff = await Staff.findById(staff._id)
      .populate('role')
      .populate('roles')
      .populate('restaurantId', 'name')
      .populate('branchId', 'name')
      .lean();
    
    const { roles: allRoles, permissions } = await Staff.prototype.getAllRolesAndPermissions.call(populatedStaff);
    
    return res.json({
      success: true,
      data: sanitizeStaff(populatedStaff, allRoles, staff.permissions || permissions),
      message: `Staff transferred to ${newBranchName} successfully`,
    });
  } catch (error) {
    console.error('[POST /api/staff/:id/transfer-branch] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to transfer staff to new branch',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get staff branch transfer history
// @route   GET /api/staff/:id/branch-history
// @access  Private (Admin/Super Admin)
// ──────────────────────────────────────────────────────────────────────────

export const getStaffBranchHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }
    
    const staff = await Staff.findById(id)
      .select('name employeeId branchTransferHistory')
      .lean();
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    const history = (staff.branchTransferHistory || []).sort((a, b) => 
      new Date(b.transferDate) - new Date(a.transferDate)
    );
    
    return res.json({
      success: true,
      data: {
        name: staff.name,
        employeeId: staff.employeeId,
        history: history,
      },
    });
  } catch (error) {
    console.error('[GET /api/staff/:id/branch-history] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch branch history',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update staff password
// @route   PUT /api/staff/:id/password
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const updateStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }

    const { password } = req.body;
    if (!password || !isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await Staff.findByIdAndUpdate(id, { password: hashedPassword });

    return res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('[PUT /api/staff/:id/password] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update password',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete staff
// @route   DELETE /api/staff/:id
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }

    if (req.staff && req.staff._id.toString() === id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    await Staff.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Staff member '${sanitizeInput(staff.name)}' deleted successfully`,
    });
  } catch (error) {
    console.error('[DELETE /api/staff/:id] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete staff',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete staff
// @route   DELETE /api/staff/bulk
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteStaff = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of staff IDs',
      });
    }
    
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 staff members can be deleted at once',
      });
    }
    
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ID format: ${invalidIds.join(', ')}`,
      });
    }
    
    if (req.staff && ids.includes(req.staff._id.toString())) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }
    
    const result = await Staff.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No staff found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} staff members deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error('[DELETE /api/staff/bulk] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete staff',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Toggle staff status
// @route   PATCH /api/staff/:id/toggle-status
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }

    if (req.staff && req.staff._id.toString() === id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot toggle your own status',
      });
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    const statusMap = {
      'active': 'inactive',
      'inactive': 'active',
      'suspended': 'active',
    };
    staff.status = statusMap[staff.status] || 'active';
    await staff.save();

    return res.json({
      success: true,
      data: {
        _id: staff._id,
        name: sanitizeInput(staff.name),
        status: staff.status,
      },
      message: `Staff status updated to ${staff.status}`,
    });
  } catch (error) {
    console.error('[PATCH /api/staff/:id/toggle-status] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle staff status',
    });
  }
};