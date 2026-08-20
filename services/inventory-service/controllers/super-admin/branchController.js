// controllers/super-admin/branchController.js - FIXED VERSION

import Branch from '../../models/super-admin/Branch.js';
import Restaurant from '../../models/super-admin/Restaurant.js';
import mongoose from 'mongoose';
import { 
  isValidObjectId, 
  isValidEmail, 
  isValidPhone, 
  isValidName,
  isValidText,
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_BRANCHES_PER_RESTAURANT = 50;

// ─── Security Utilities ──────────────────────────────────────────────────
const checkForSQLInjection = (str) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|MERGE)\b)/gi,
    /(\b(UNION|INTERSECT|EXCEPT|MINUS)\b)/gi,
    /(\b(OR|AND)\s+[=!<>])/gi,
    /['"]\s*(OR|AND)\s*['"]/gi,
    /(--)/g, /(\/\*)/g, /(\*\/)/g, /(;+\s*$)/g,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

const checkForXSSPatterns = (str) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;
  const patterns = [
    /<script>/gi, /javascript:/gi, /onerror\s*=/gi,
    /onload\s*=/gi, /<iframe>/gi, /<object>/gi,
    /<embed>/gi, /eval\s*\(/gi, /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// ─── Audit Logger ──────────────────────────────────────────────────────────
const logSecurityEvent = async (eventType, userId, details = {}) => {
  try {
    console.log('🔒 SECURITY EVENT:', {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'anonymous',
      ...details,
    });
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────
const sanitizeBranch = (branch) => {
  if (!branch) return null;
  return {
    _id: branch._id,
    id: branch._id,
    restaurantId: branch.restaurantId,
    name: sanitizeInput(branch.name || ''),
    code: branch.code || '',
    email: branch.email,
    phone: branch.phone,
    address: {
      street: sanitizeInput(branch.address?.street || ''),
      city: sanitizeInput(branch.address?.city || ''),
      state: sanitizeInput(branch.address?.state || ''),
      country: sanitizeInput(branch.address?.country || ''),
      pincode: branch.address?.pincode || '',
      latitude: branch.address?.latitude || null,
      longitude: branch.address?.longitude || null,
    },
    managerId: branch.managerId || null,
    openingDate: branch.openingDate,
    isMainBranch: branch.isMainBranch || false,
    workingHours: branch.workingHours || {},
    features: branch.features || {},
    stats: branch.stats || {},
    isActive: branch.isActive !== false,
    status: branch.status || 'active',
    fullAddress: branch.fullAddress || '',
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
};

// ─── GET ALL BRANCHES ──────────────────────────────────────────────────────
export const getBranches = async (req, res) => {
  try {
    console.log('📋 GET ALL BRANCHES');

    const { restaurantId, status, search, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = restaurantId;
    }

    if (status && status !== 'all') {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status filter',
        });
      }
      filter.status = status;
    }

    if (search) {
      const sanitizedSearch = sanitizeInput(search.trim());
      if (checkForSQLInjection(sanitizedSearch) || checkForXSSPatterns(sanitizedSearch)) {
        await logSecurityEvent('SQL_INJECTION_ATTEMPT', req.admin?._id, {
          ip: req.ip,
          search: sanitizedSearch,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid search query',
        });
      }
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { code: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { phone: { $regex: sanitizedSearch, $options: 'i' } },
        { 'address.city': { $regex: sanitizedSearch, $options: 'i' } },
        { 'address.state': { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [branches, total] = await Promise.all([
      Branch.find(filter)
        .populate('restaurantId', 'name email phone')
        .populate('managerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Branch.countDocuments(filter),
    ]);

    const sanitizedBranches = branches.map(branch => {
      const restaurant = branch.restaurantId || {};
      const manager = branch.managerId || {};
      return {
        ...sanitizeBranch(branch),
        restaurantName: restaurant.name || 'Unknown',
        managerName: manager.name || null,
        managerEmail: manager.email || null,
        managerPhone: manager.phone || null,
      };
    });

    console.log(`✅ Found ${sanitizedBranches.length} branches`);

    res.status(200).json({
      success: true,
      data: {
        branches: sanitizedBranches,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        count: sanitizedBranches.length,
      },
    });
  } catch (error) {
    console.error('❌ Get Branches Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branches',
    });
  }
};

// ─── GET BRANCH BY ID ──────────────────────────────────────────────────────
export const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    const branch = await Branch.findById(id)
      .populate('restaurantId', 'name email phone')
      .populate('managerId', 'name email phone')
      .lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }

    const restaurant = branch.restaurantId || {};
    const manager = branch.managerId || {};

    res.status(200).json({
      success: true,
      data: {
        ...sanitizeBranch(branch),
        restaurantName: restaurant.name || 'Unknown',
        managerName: manager.name || null,
        managerEmail: manager.email || null,
        managerPhone: manager.phone || null,
      },
    });
  } catch (error) {
    console.error('❌ Get Branch Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch',
    });
  }
};

// ─── CREATE BRANCH ────────────────────────────────────────────────────────
export const createBranch = async (req, res) => {
  console.log('📝 CREATE BRANCH');

  try {
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;

    const body = sanitizeObject(req.body);

    const {
      restaurantId,
      name,
      code,
      email,
      phone,
      address,
      managerId,
      openingDate,
      isMainBranch,
      workingHours,
      features,
    } = body;

    if (!restaurantId || !isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid restaurant ID is required',
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Branch name is required and must be at least 2 characters',
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

    if (!address?.street || !address?.city || !address?.state || !address?.pincode) {
      return res.status(400).json({
        success: false,
        error: 'Full address is required (street, city, state, pincode)',
      });
    }

    const existingBranch = await Branch.findOne({
      restaurantId,
      $or: [
        { name: name.trim() },
        { code: code?.trim() },
        { email: email.toLowerCase().trim() },
        { phone: phone },
      ],
    });

    if (existingBranch) {
      if (existingBranch.name === name.trim()) {
        return res.status(409).json({
          success: false,
          error: 'A branch with this name already exists in this restaurant',
        });
      }
      if (existingBranch.code === code?.trim()) {
        return res.status(409).json({
          success: false,
          error: 'A branch with this code already exists',
        });
      }
      if (existingBranch.email === email.toLowerCase().trim()) {
        return res.status(409).json({
          success: false,
          error: 'A branch with this email already exists',
        });
      }
      if (existingBranch.phone === phone) {
        return res.status(409).json({
          success: false,
          error: 'A branch with this phone number already exists',
        });
      }
    }

    const branchCount = await Branch.countDocuments({ restaurantId });
    if (branchCount >= MAX_BRANCHES_PER_RESTAURANT) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_BRANCHES_PER_RESTAURANT} branches allowed per restaurant`,
      });
    }

    // ─── CREATE BRANCH ──────────────────────────────────────────────────
    const branchData = {
      restaurantId,
      name: sanitizeInput(name.trim()),
      code: code ? code.toUpperCase().trim() : '',
      email: email.toLowerCase().trim(),
      phone,
      address: {
        street: sanitizeInput(address.street.trim()),
        city: sanitizeInput(address.city.trim()),
        state: sanitizeInput(address.state.trim()),
        country: address.country || 'India',
        pincode: address.pincode.trim(),
        latitude: address.latitude || null,
        longitude: address.longitude || null,
      },
      managerId: managerId || null,
      openingDate: openingDate || new Date(),
      isMainBranch: isMainBranch || false,
      workingHours: workingHours || {
        monday: { open: '09:00', close: '22:00', isClosed: false },
        tuesday: { open: '09:00', close: '22:00', isClosed: false },
        wednesday: { open: '09:00', close: '22:00', isClosed: false },
        thursday: { open: '09:00', close: '22:00', isClosed: false },
        friday: { open: '09:00', close: '22:00', isClosed: false },
        saturday: { open: '09:00', close: '22:00', isClosed: false },
        sunday: { open: '09:00', close: '22:00', isClosed: false },
      },
      features: features || {
        dineIn: true,
        takeaway: true,
        delivery: true,
        driveThru: false,
      },
      isActive: true,
      status: 'active',
      createdBy: adminId,
      updatedBy: adminId,
    };

    const branch = await Branch.create(branchData);

    // ✅ FIX: Add branch to restaurant's branches array
    const branchRef = {
      _id: branch._id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      manager: {
        name: null,
        phone: null,
        email: null,
      },
      status: branch.status,
      isActive: branch.isActive,
      stats: {
        orders: 0,
        revenue: 0,
        staff: 0,
      },
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };

    await Restaurant.findByIdAndUpdate(restaurantId, {
      $push: { branches: branchRef },
      $inc: { 'stats.totalBranches': 1 },
    });

    await logSecurityEvent('BRANCH_CREATED', adminId, {
      branchId: branch._id,
      branchName: branch.name,
      restaurantId,
      ip: clientIp,
    });

    console.log('✅ Branch created successfully and added to restaurant:', branch.name);

    res.status(201).json({
      success: true,
      data: sanitizeBranch(branch),
      message: 'Branch created successfully',
    });
  } catch (error) {
    console.error('❌ Create Branch Error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A branch with this information already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create branch',
    });
  }
};

// ─── UPDATE BRANCH ────────────────────────────────────────────────────────
export const updateBranch = async (req, res) => {
  console.log('✏️ UPDATE BRANCH');

  try {
    const { id } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }

    const body = sanitizeObject(req.body);
    const updateData = { updatedBy: adminId };
    const restaurantUpdateData = {};

    if (body.name) {
      updateData.name = sanitizeInput(body.name.trim());
      restaurantUpdateData['branches.$.name'] = sanitizeInput(body.name.trim());
    }
    if (body.code) updateData.code = body.code.toUpperCase().trim();
    if (body.email) {
      if (!isValidEmail(body.email)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address',
        });
      }
      updateData.email = body.email.toLowerCase().trim();
      restaurantUpdateData['branches.$.email'] = body.email.toLowerCase().trim();
    }
    if (body.phone) {
      if (!isValidPhone(body.phone)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid phone number',
        });
      }
      updateData.phone = body.phone;
      restaurantUpdateData['branches.$.phone'] = body.phone;
    }

    if (body.address) {
      const addressUpdate = {
        street: sanitizeInput(body.address.street?.trim() || branch.address.street),
        city: sanitizeInput(body.address.city?.trim() || branch.address.city),
        state: sanitizeInput(body.address.state?.trim() || branch.address.state),
        country: body.address.country || branch.address.country,
        pincode: body.address.pincode || branch.address.pincode,
        latitude: body.address.latitude !== undefined ? body.address.latitude : branch.address.latitude,
        longitude: body.address.longitude !== undefined ? body.address.longitude : branch.address.longitude,
      };
      updateData.address = addressUpdate;
      restaurantUpdateData['branches.$.address'] = addressUpdate;
    }

    if (body.managerId !== undefined) {
      updateData.managerId = body.managerId || null;
    }

    if (body.openingDate) {
      updateData.openingDate = new Date(body.openingDate);
    }

    if (body.isMainBranch !== undefined) {
      updateData.isMainBranch = body.isMainBranch;
    }

    if (body.workingHours) {
      updateData.workingHours = body.workingHours;
    }

    if (body.features) {
      updateData.features = body.features;
    }

    if (body.status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(body.status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value',
        });
      }
      updateData.status = body.status;
      restaurantUpdateData['branches.$.status'] = body.status;
      if (body.status === 'active') {
        updateData.isActive = true;
        restaurantUpdateData['branches.$.isActive'] = true;
      }
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
      restaurantUpdateData['branches.$.isActive'] = body.isActive;
      if (!body.isActive && updateData.status === 'active') {
        updateData.status = 'inactive';
        restaurantUpdateData['branches.$.status'] = 'inactive';
      }
    }

    const updatedBranch = await Branch.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // ✅ Update restaurant's branch reference
    if (Object.keys(restaurantUpdateData).length > 0) {
      await Restaurant.updateOne(
        { _id: branch.restaurantId, 'branches._id': id },
        { $set: restaurantUpdateData }
      );
    }

    await logSecurityEvent('BRANCH_UPDATED', adminId, {
      branchId: updatedBranch._id,
      branchName: updatedBranch.name,
      ip: clientIp,
      updatedFields: Object.keys(updateData),
    });

    console.log('✅ Branch updated successfully:', updatedBranch.name);

    res.status(200).json({
      success: true,
      data: sanitizeBranch(updatedBranch),
      message: 'Branch updated successfully',
    });
  } catch (error) {
    console.error('❌ Update Branch Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update branch',
    });
  }
};

// ─── DELETE BRANCH ────────────────────────────────────────────────────────
export const deleteBranch = async (req, res) => {
  console.log('🗑️ DELETE BRANCH');

  try {
    const { id } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }

    // ─── DELETE ──────────────────────────────────────────────────────────
    await Branch.findByIdAndDelete(id);

    // ✅ Remove branch from restaurant's branches array
    await Restaurant.findByIdAndUpdate(branch.restaurantId, {
      $pull: { branches: { _id: id } },
      $inc: { 'stats.totalBranches': -1 },
    });

    await logSecurityEvent('BRANCH_DELETED', adminId, {
      branchId: branch._id,
      branchName: branch.name,
      restaurantId: branch.restaurantId,
      ip: clientIp,
    });

    console.log('✅ Branch deleted successfully and removed from restaurant:', branch.name);

    res.status(200).json({
      success: true,
      message: `Branch '${branch.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('❌ Delete Branch Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete branch',
    });
  }
};

// ─── GET BRANCH STATS ──────────────────────────────────────────────────────
export const getBranchStats = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    const filter = {};
    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      if (isValidObjectId(restaurantId)) {
        filter.restaurantId = restaurantId;
      }
    }

    const stats = await Branch.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBranches: { $sum: 1 },
          activeBranches: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          inactiveBranches: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] },
          },
          suspendedBranches: {
            $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] },
          },
          totalTables: { $sum: '$stats.totalTables' },
          totalEmployees: { $sum: '$stats.totalEmployees' },
          totalOrders: { $sum: '$stats.totalOrders' },
        },
      },
    ]);

    const result = stats[0] || {
      totalBranches: 0,
      activeBranches: 0,
      inactiveBranches: 0,
      suspendedBranches: 0,
      totalTables: 0,
      totalEmployees: 0,
      totalOrders: 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Get Branch Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch stats',
    });
  }
};