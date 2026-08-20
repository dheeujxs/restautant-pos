// controllers/super-admin/staffController.js - ONLY BRANCH FILTER

import Staff from '../../models/Staff.js';
import Restaurant from '../../models/super-admin/Restaurant.js';
import Branch from '../../models/super-admin/Branch.js';
import Role from '../../models/Role.js';
import mongoose from 'mongoose';
import { sanitizeInput } from '../../utils/sanitize.js';

const DEFAULT_PASSWORD_LENGTH = 8;

// ─── Helper: Generate Employee ID ──────────────────────────────────────
const generateEmployeeId = async (restaurantName) => {
  let prefix = 'EMP';
  if (restaurantName) {
    const words = restaurantName.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
    if (words.length > 0 && words[0].length >= 2) {
      prefix = words[0].substring(0, 2).toUpperCase();
    } else if (words.length > 0 && words[0].length === 1) {
      prefix = words[0].charAt(0).toUpperCase() + 'X';
    }
  }
  while (prefix.length < 2) prefix += 'X';
  
  const year = new Date().getFullYear();
  
  const allStaff = await Staff.find({
    employeeId: { $regex: new RegExp(`^${prefix}-EMP-${year}`) }
  }).lean();
  
  let maxSeq = 0;
  for (const staff of allStaff) {
    if (staff.employeeId) {
      const match = staff.employeeId.match(/-(\d{4})$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }
  
  const seq = maxSeq + 1;
  const seqStr = String(seq).padStart(4, '0');
  const employeeId = `${prefix}-EMP-${year}-${seqStr}`;
  
  const existing = await Staff.findOne({ employeeId });
  if (existing) {
    let counter = 1;
    while (true) {
      const testSeq = seq + counter;
      const testSeqStr = String(testSeq).padStart(4, '0');
      const testId = `${prefix}-EMP-${year}-${testSeqStr}`;
      const testExisting = await Staff.findOne({ employeeId: testId });
      if (!testExisting) {
        return testId;
      }
      counter++;
    }
  }
  
  return employeeId;
};

// ─── Helper: Generate Random Password ──────────────────────────────────
const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < DEFAULT_PASSWORD_LENGTH; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ─── GET ALL STAFF WITH BRANCH FILTER ONLY ─────────────────────────────
export const getAllStaffForSuperAdmin = async (req, res) => {
  try {
    const { branchId, status, role, search, page = 1, limit = 50 } = req.query;

    console.log('📋 Super Admin GET STAFF with filters:', { branchId, status, role, search });

    let filter = {};
    
    // ─── ✅ BRANCH FILTER ONLY - Include "All Branches" staff ──────────
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      // Validate branch ID
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      
      // ✅ Show staff that belong to this branch OR have branchId: null (All Branches)
      filter.$or = [
        { branchId: branchId },                         // Staff in this specific branch
        { branchId: null },                            // Staff available in ALL branches
        { branchId: { $exists: false } }               // Legacy staff without branch
      ];
      
      console.log(`📍 Branch filter: Showing staff for branch ${branchId} OR All Branches (null)`);
    }
    
    // ─── Status Filter ──────────────────────────────────────────────────
    if (status && status !== 'all') {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status filter. Allowed: active, inactive, suspended' 
        });
      }
      filter.status = status;
    }
    
    // ─── Role Filter ────────────────────────────────────────────────────
    if (role && role !== 'all') {
      const roleDoc = await Role.findOne({ name: role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid role "${role}"` 
        });
      }
      filter.role = roleDoc._id;
    }
    
    // ─── Search Filter ──────────────────────────────────────────────────
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { phoneNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { employeeId: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    console.log('🔍 Staff filter:', JSON.stringify(filter, null, 2));
    
    const [staff, total] = await Promise.all([
      Staff.find(filter)
        .populate('role')
        .populate('roles')
        .populate('restaurantId', 'name')
        .populate('branchId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Staff.countDocuments(filter),
    ]);
    
    console.log(`📊 Found ${staff.length} staff members (total: ${total})`);
    
    const formattedStaff = staff.map(s => {
      const restaurant = s.restaurantId || {};
      const branch = s.branchId || {};
      
      // ✅ If branchId is null, show "All Branches"
      let branchName = branch.name || s.branchName || null;
      if (!s.branchId) {
        branchName = 'All Branches';
      }
      
      return {
        _id: s._id,
        id: s._id,
        name: s.name,
        phoneNumber: s.phoneNumber,
        email: s.email || '',
        employeeId: s.employeeId,
        role: s.role?.name || s.roleName || 'Unknown',
        roles: s.roles?.map(r => r.name) || [],
        roleId: s.role?._id || s.role || null,
        permissions: s.permissions || [],
        canLoginKitchenPortal: s.canLoginKitchenPortal !== false,
        status: s.status || 'active',
        restaurantId: restaurant._id || s.restaurantId,
        restaurantName: restaurant.name || s.restaurantName || 'Unknown',
        branchId: s.branchId || null,
        branchName: branchName,
        createdBy: s.createdBy,
        createdByName: s.createdByName,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        staff: formattedStaff,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        count: formattedStaff.length,
      },
    });
  } catch (error) {
    console.error('[GET /super-admin/staff] ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch staff' 
    });
  }
};

// ─── GET STAFF BY BRANCH ──────────────────────────────────────────────
export const getStaffByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!branchId || branchId === 'all') {
      return getAllStaffForSuperAdmin(req, res);
    }
    
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }
    
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Branch not found' 
      });
    }
    
    const staff = await Staff.find({
      $or: [
        { branchId: branchId },
        { branchId: null },
        { branchId: { $exists: false } }
      ]
    })
      .populate('role')
      .populate('roles')
      .populate('restaurantId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    
    const formattedStaff = staff.map(s => ({
      _id: s._id,
      name: s.name,
      phoneNumber: s.phoneNumber,
      email: s.email || '',
      employeeId: s.employeeId,
      role: s.role?.name || s.roleName || 'Unknown',
      roles: s.roles?.map(r => r.name) || [],
      status: s.status || 'active',
      branchName: s.branchId?.name || s.branchName || 'All Branches',
      restaurantName: s.restaurantId?.name || s.restaurantName || 'Unknown',
      createdAt: s.createdAt,
    }));
    
    res.status(200).json({
      success: true,
      data: {
        branch: { _id: branch._id, name: branch.name },
        staff: formattedStaff,
        count: formattedStaff.length,
      },
    });
  } catch (error) {
    console.error('[GET /super-admin/staff/branch/:id] ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch staff for branch' 
    });
  }
};

// ─── CREATE STAFF ──────────────────────────────────────────────────────
export const createStaff = async (req, res) => {
  try {
    console.log('📝 Creating staff...');
    
    const { 
      name, 
      phoneNumber, 
      email, 
      password, 
      role, 
      status, 
      canLoginKitchenPortal,
      restaurantId,
      branchId,
    } = req.body;

    // ─── VALIDATE ──────────────────────────────────────────────────────────
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name is required and must be at least 2 characters',
      });
    }
    
    if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid 10-digit phone number',
      });
    }
    
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required',
      });
    }

    // ─── CHECK DUPLICATE ──────────────────────────────────────────────────
    const existingPhone = await Staff.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        error: `A staff member with phone number "${phoneNumber}" already exists`,
      });
    }
    
    if (email) {
      const existingEmail = await Staff.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: `A staff member with email "${email}" already exists`,
        });
      }
    }

    // ─── VERIFY RESTAURANT ──────────────────────────────────────────────
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    console.log(`🏢 Restaurant: ${restaurant.name}`);

    // ─── VERIFY BRANCH ──────────────────────────────────────────────────
    let branchName = 'All Branches';
    let finalBranchId = null;
    
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (!branch) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found',
        });
      }
      if (branch.restaurantId.toString() !== restaurantId) {
        return res.status(400).json({
          success: false,
          error: 'Branch does not belong to this restaurant',
        });
      }
      finalBranchId = branch._id;
      branchName = branch.name;
      console.log(`📍 Branch: ${branchName}`);
    } else {
      console.log('📍 No branch assigned - Staff will work in All Branches');
    }

    // ─── GENERATE EMPLOYEE ID ────────────────────────────────────────────
    const employeeId = await generateEmployeeId(restaurant.name);
    
    // ─── GENERATE PASSWORD ──────────────────────────────────────────────
    let finalPassword = password;
    let autoGeneratedPassword = null;
    
    if (!finalPassword) {
      autoGeneratedPassword = generateRandomPassword();
      finalPassword = autoGeneratedPassword;
    } else if (finalPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // ─── GET ROLE ────────────────────────────────────────────────────────
    let roleDoc = null;
    if (role) {
      roleDoc = await Role.findOne({ name: role });
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          error: `Role "${role}" not found`,
        });
      }
    }

    // ─── CREATE STAFF ────────────────────────────────────────────────────
    const staffData = {
      name: sanitizeInput(name.trim()),
      phoneNumber,
      email: email ? email.toLowerCase().trim() : '',
      password: finalPassword,
      employeeId,
      role: roleDoc?._id || null,
      roleName: roleDoc?.name || role || 'staff',
      status: status || 'active',
      canLoginKitchenPortal: canLoginKitchenPortal !== false,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      branchId: finalBranchId,
      branchName: branchName,
      createdBy: req.admin?._id || req.user?._id,
      createdByName: req.admin?.name || req.admin?.firstName || 'Super Admin',
    };

    console.log('📋 Staff data:', {
      name: staffData.name,
      employeeId: staffData.employeeId,
      restaurantName: staffData.restaurantName,
      branchName: staffData.branchName,
    });

    const staff = await Staff.create(staffData);

    console.log(`✅ Staff created: ${staff.employeeId} - ${staff.name}`);

    res.status(201).json({
      success: true,
      data: {
        staff: {
          _id: staff._id,
          name: staff.name,
          phoneNumber: staff.phoneNumber,
          email: staff.email,
          employeeId: staff.employeeId,
          role: staff.roleName,
          status: staff.status,
          restaurantId: staff.restaurantId,
          restaurantName: staff.restaurantName,
          branchId: staff.branchId,
          branchName: staff.branchName,
          canLoginKitchenPortal: staff.canLoginKitchenPortal,
        },
      },
      autoGeneratedPassword,
      message: autoGeneratedPassword 
        ? `Staff created! Employee ID: ${staff.employeeId}, Password: ${autoGeneratedPassword}` 
        : `Staff ${staff.employeeId} created successfully!`,
    });
  } catch (error) {
    console.error('[POST /super-admin/staff] ERROR:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      const fieldName = field === 'employeeId' ? 'Employee ID' : field === 'phoneNumber' ? 'Phone number' : field;
      return res.status(409).json({
        success: false,
        error: `A staff member with ${fieldName} "${value}" already exists.`,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create staff',
    });
  }
};



// controllers/super-admin/staffController.js - Add this function

// ─── GET STAFF BY RESTAURANT (Deprecated - kept for backward compatibility) ──
export const getStaffByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    if (!restaurantId || restaurantId === 'all') {
      return getAllStaffForSuperAdmin(req, res);
    }
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false, 
        error: 'Restaurant not found' 
      });
    }
    
    // Get staff for this restaurant with branch info
    const staff = await Staff.find({ restaurantId })
      .populate('role')
      .populate('roles')
      .populate('restaurantId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    
    const formattedStaff = staff.map(s => ({
      _id: s._id,
      name: s.name,
      phoneNumber: s.phoneNumber,
      email: s.email || '',
      employeeId: s.employeeId,
      role: s.role?.name || s.roleName || 'Unknown',
      roles: s.roles?.map(r => r.name) || [],
      status: s.status || 'active',
      branchName: s.branchId?.name || s.branchName || 'All Branches',
      restaurantName: s.restaurantId?.name || s.restaurantName || 'Unknown',
      createdAt: s.createdAt,
    }));
    
    res.status(200).json({
      success: true,
      data: {
        restaurant: { _id: restaurant._id, name: restaurant.name },
        staff: formattedStaff,
        count: formattedStaff.length,
      },
    });
  } catch (error) {
    console.error('[GET /super-admin/staff/restaurant/:id] ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch staff for restaurant' 
    });
  }
};

// ─── UPDATE STAFF ──────────────────────────────────────────────────────
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    const updateData = {};
    
    if (body.name) updateData.name = sanitizeInput(body.name.trim());
    if (body.phoneNumber) updateData.phoneNumber = body.phoneNumber;
    if (body.email) updateData.email = body.email.toLowerCase().trim();
    if (body.status) updateData.status = body.status;
    if (body.canLoginKitchenPortal !== undefined) updateData.canLoginKitchenPortal = body.canLoginKitchenPortal;
    
    if (body.branchId) {
      const branch = await Branch.findById(body.branchId);
      if (branch) {
        updateData.branchId = branch._id;
        updateData.branchName = branch.name;
      }
    }
    
    if (body.role) {
      const roleDoc = await Role.findOne({ name: body.role });
      if (roleDoc) {
        updateData.role = roleDoc._id;
        updateData.roleName = roleDoc.name;
      }
    }
    
    const updated = await Staff.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: {
        staff: {
          _id: updated._id,
          name: updated.name,
          phoneNumber: updated.phoneNumber,
          email: updated.email,
          employeeId: updated.employeeId,
          role: updated.roleName,
          status: updated.status,
          branchId: updated.branchId,
          branchName: updated.branchName || 'All Branches',
        },
      },
      message: 'Staff updated successfully',
    });
  } catch (error) {
    console.error('[PUT /super-admin/staff] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff',
    });
  }
};

// ─── DELETE STAFF ──────────────────────────────────────────────────────
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    
    const staff = await Staff.findByIdAndDelete(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Staff member "${staff.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('[DELETE /super-admin/staff] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete staff',
    });
  }
};

// ─── TOGGLE STAFF STATUS ──────────────────────────────────────────────
export const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
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
    
    res.status(200).json({
      success: true,
      data: {
        _id: staff._id,
        name: staff.name,
        status: staff.status,
      },
      message: `Staff status updated to ${staff.status}`,
    });
  } catch (error) {
    console.error('[PATCH /super-admin/staff/toggle-status] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle staff status',
    });
  }
};

// ─── TRANSFER STAFF TO NEW BRANCH ──────────────────────────────────────
export const transferStaffBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { newBranchId, reason, notes } = req.body;
    const adminId = req.admin?._id || req.user?._id;
    const adminName = req.admin?.name || req.admin?.firstName || 'Super Admin';

    console.log(`🔄 [SUPER ADMIN] Transferring staff ${id} to branch ${newBranchId}`);

    // ─── Validate Staff ──────────────────────────────────────────────────
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    // ─── Get current branch info ──────────────────────────────────────
    const currentBranchId = staff.branchId ? staff.branchId.toString() : null;
    const currentBranchName = staff.branchName || 'All Branches';

    // ─── Validate New Branch ──────────────────────────────────────────────
    let branchName = 'All Branches';
    let finalBranchId = null;

    if (newBranchId && newBranchId !== '' && newBranchId !== 'null' && newBranchId !== 'undefined') {
      const branch = await Branch.findById(newBranchId);
      if (!branch) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found',
        });
      }
      // Verify branch belongs to same restaurant
      if (branch.restaurantId.toString() !== staff.restaurantId.toString()) {
        return res.status(400).json({
          success: false,
          error: 'Branch does not belong to this staff\'s restaurant',
        });
      }
      finalBranchId = branch._id;
      branchName = branch.name;
    } else {
      // If no branchId provided, staff becomes "All Branches"
      finalBranchId = null;
      branchName = 'All Branches';
    }

    // ─── Don't transfer if already in this branch ──────────────────────
    const newBranchIdStr = finalBranchId ? finalBranchId.toString() : null;
    
    if (currentBranchId === newBranchIdStr) {
      return res.status(400).json({
        success: false,
        error: `Staff is already assigned to ${branchName}`,
      });
    }

    // ─── Record transfer history ──────────────────────────────────────
    const transferHistory = staff.branchHistory || [];
    transferHistory.push({
      branchId: finalBranchId,
      branchName: branchName,
      transferredFrom: staff.branchId || null,
      transferredFromName: staff.branchName || 'All Branches',
      transferredTo: finalBranchId,
      transferredToName: branchName,
      transferredBy: adminId,
      transferredByName: adminName,
      reason: reason || 'other',
      notes: notes || '',
      transferDate: new Date(),
    });

    // ─── Update staff ──────────────────────────────────────────────────
    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      {
        $set: {
          branchId: finalBranchId,
          branchName: branchName,
          updatedBy: adminId,
          updatedByName: adminName,
          branchHistory: transferHistory,
          lastBranchTransferAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    ).populate('role', 'name').populate('restaurantId', 'name').populate('branchId', 'name');

    if (!updatedStaff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found after update',
      });
    }

    console.log(`✅ [SUPER ADMIN] Staff ${updatedStaff.employeeId} transferred from "${currentBranchName}" to "${branchName}"`);

    // ─── Format response ──────────────────────────────────────────────
    const restaurant = updatedStaff.restaurantId || {};
    const branch = updatedStaff.branchId || {};
    
    res.status(200).json({
      success: true,
      data: {
        staff: {
          _id: updatedStaff._id,
          name: updatedStaff.name,
          employeeId: updatedStaff.employeeId,
          branchId: updatedStaff.branchId,
          branchName: updatedStaff.branchName || 'All Branches',
          branchHistory: updatedStaff.branchHistory,
          lastBranchTransferAt: updatedStaff.lastBranchTransferAt,
        },
      },
      message: `Staff transferred from "${currentBranchName}" to "${branchName}" successfully`,
    });
  } catch (error) {
    console.error('[POST /super-admin/staff/:id/transfer-branch] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer staff: ' + error.message,
    });
  }
};

// ─── GET BRANCH TRANSFER HISTORY ──────────────────────────────────────
export const getBranchTransferHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id)
      .select('branchHistory name employeeId branchName')
      .lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    // Format history for display
    const history = (staff.branchHistory || []).map((entry) => ({
      _id: entry._id,
      branchId: entry.branchId || entry.transferredTo,
      branchName: entry.branchName || entry.transferredToName || 'All Branches',
      transferredFrom: entry.transferredFrom,
      transferredFromName: entry.transferredFromName || 'All Branches',
      transferredTo: entry.transferredTo,
      transferredToName: entry.transferredToName || 'All Branches',
      transferredByName: entry.transferredByName || 'System',
      reason: entry.reason || 'other',
      notes: entry.notes || '',
      transferDate: entry.transferDate,
    }));

    res.status(200).json({
      success: true,
      data: {
        staff: {
          _id: staff._id,
          name: staff.name,
          employeeId: staff.employeeId,
          currentBranch: staff.branchName || 'All Branches',
        },
        history: history,
        total: history.length,
      },
    });
  } catch (error) {
    console.error('[GET /super-admin/staff/:id/branch-history] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch transfer history',
    });
  }
};