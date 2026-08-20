// controllers/super-admin/restaurantController.js - WITH RESTAURANT ID SUPPORT

import Restaurant from '../../models/super-admin/Restaurant.js';
import {
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidText,
  isValidObjectId,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_RESTAURANTS_PER_ADMIN = 100;

// ============================================================
//  SECURITY UTILITIES
// ============================================================

const checkForSQLInjection = (str) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;

  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|MERGE)\b)/gi,
    /(\b(UNION|INTERSECT|EXCEPT|MINUS)\b)/gi,
    /(\b(OR|AND)\s+[=!<>])/gi,
    /['"]\s*(OR|AND)\s*['"]/gi,
    /(--)/g,
    /(\/\*)/g,
    /(\*\/)/g,
    /(;+\s*$)/g,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

const checkForXSSPatterns = (str) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;

  const patterns = [
    /<script>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /<iframe>/gi,
    /<object>/gi,
    /<embed>/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// ============================================================
//  AUDIT LOGGER
// ============================================================

const SecurityEventTypes = {
  RESTAURANT_CREATED: 'RESTAURANT_CREATED',
  RESTAURANT_UPDATED: 'RESTAURANT_UPDATED',
  RESTAURANT_DELETED: 'RESTAURANT_DELETED',
  RESTAURANT_STATUS_CHANGED: 'RESTAURANT_STATUS_CHANGED',
  RESTAURANT_VERIFICATION_UPDATED: 'RESTAURANT_VERIFICATION_UPDATED',
  BRANCH_ADDED: 'BRANCH_ADDED',
  BRANCH_UPDATED: 'BRANCH_UPDATED',
  BRANCH_DELETED: 'BRANCH_DELETED',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ERROR: 'ERROR',
};

const logSecurityEvent = async (eventType, userId, details = {}) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'anonymous',
      details,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
    };
    console.log('🔒 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
    return logEntry;
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
};

// ============================================================
//  HELPERS
// ============================================================

const sanitizeRestaurant = (restaurant) => {
  if (!restaurant) return null;
  
  const obj = restaurant.toObject ? restaurant.toObject() : restaurant;
  
  // Get existing stats or use empty object
  const stats = obj.stats || {};
  
  return {
    _id: obj._id,
    id: obj._id,
    restaurantId: obj.restaurantId || null, // ✅ Add restaurantId
    name: sanitizeInput(obj.name || ''),
    logo: obj.logo || '',
    email: obj.email || '',
    phone: obj.phone || '',
    address: {
      street: sanitizeInput(obj.address?.street || ''),
      city: sanitizeInput(obj.address?.city || ''),
      state: sanitizeInput(obj.address?.state || ''),
      country: sanitizeInput(obj.address?.country || ''),
      pincode: obj.address?.pincode || '',
      location: obj.address?.location || {},
    },
    owner: {
      name: sanitizeInput(obj.owner?.name || ''),
      email: obj.owner?.email || '',
      phone: obj.owner?.phone || '',
      address: sanitizeInput(obj.owner?.address || ''),
      pan: obj.owner?.pan || '',
      aadhaar: obj.owner?.aadhaar || '',
    },
    businessType: obj.businessType || '',
    cuisineTypes: obj.cuisineTypes || [],
    operatingHours: obj.operatingHours || {},
    daysOfOperation: obj.daysOfOperation || [],
    gstNumber: obj.gstNumber || '',
    licenseNumber: obj.licenseNumber || '',
    panNumber: obj.panNumber || '',
    fssaiLicense: obj.fssaiLicense || '',
    subscription: {
      plan: obj.subscription?.plan || 'trial',
      billingCycle: obj.subscription?.billingCycle || 'monthly',
      amount: obj.subscription?.amount || 0,
      startDate: obj.subscription?.startDate,
      endDate: obj.subscription?.endDate,
      status: obj.subscription?.status || 'trial',
    },
    commission: {
      rate: obj.commission?.rate || 10,
      customRate: obj.commission?.customRate || null,
    },
    status: obj.status || 'pending',
    verificationStatus: obj.verificationStatus || 'pending',
    verificationNotes: sanitizeInput(obj.verificationNotes || ''),
    settings: obj.settings || {},
    stats: {
      totalOrders: Number(stats.totalOrders) || 0,
      totalRevenue: Number(stats.totalRevenue) || 0,
      totalStaff: Number(stats.totalStaff) || 0,
      totalBranches: obj.branches?.length || 0,
    },
    revenue: {
      total: obj.revenue?.total || 0,
      today: obj.revenue?.today || 0,
      thisWeek: obj.revenue?.thisWeek || 0,
      thisMonth: obj.revenue?.thisMonth || 0,
      thisYear: obj.revenue?.thisYear || 0,
      lastMonth: obj.revenue?.lastMonth || 0,
      lastYear: obj.revenue?.lastYear || 0,
    },
    branches: obj.branches?.map(b => ({
      _id: b._id,
      name: sanitizeInput(b.name || ''),
      address: {
        street: sanitizeInput(b.address?.street || ''),
        city: sanitizeInput(b.address?.city || ''),
        state: sanitizeInput(b.address?.state || ''),
        country: sanitizeInput(b.address?.country || ''),
        pincode: b.address?.pincode || '',
        location: b.address?.location || {},
      },
      phone: b.phone || '',
      email: b.email || '',
      manager: {
        name: sanitizeInput(b.manager?.name || ''),
        phone: b.manager?.phone || '',
        email: b.manager?.email || '',
      },
      status: b.status || 'active',
      isActive: b.isActive !== false,
      stats: b.stats || {},
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })) || [],
    branchCount: obj.branches?.length || 0,
    isActive: obj.isActive !== false,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

// ============================================================
//  ─── GET ALL RESTAURANTS ────────────────────────────────────
// ============================================================

export const getRestaurants = async (req, res) => {
  console.log('========================================');
  console.log('📋 GET ALL RESTAURANTS');
  console.log('========================================');

  try {
    const { status, verificationStatus, search, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    
    if (status && status !== 'all' && status !== 'undefined') {
      const validStatuses = ['pending', 'active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status filter',
        });
      }
      filter.status = status;
    }
    
    if (verificationStatus && verificationStatus !== 'all' && verificationStatus !== 'undefined') {
      const validVerificationStatuses = ['pending', 'verified', 'rejected'];
      if (!validVerificationStatuses.includes(verificationStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification status filter',
        });
      }
      filter.verificationStatus = verificationStatus;
    }
    
    if (search && search.trim() !== '') {
      const sanitizedSearch = sanitizeInput(search.trim());
      if (checkForSQLInjection(sanitizedSearch) || checkForXSSPatterns(sanitizedSearch)) {
        await logSecurityEvent(SecurityEventTypes.SQL_INJECTION_ATTEMPT, req.admin?._id, {
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
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { phone: { $regex: sanitizedSearch, $options: 'i' } },
        { restaurantId: { $regex: sanitizedSearch, $options: 'i' } }, // ✅ Search by restaurantId
        { 'owner.name': { $regex: sanitizedSearch, $options: 'i' } },
        { 'owner.email': { $regex: sanitizedSearch, $options: 'i' } },
        { 'address.city': { $regex: sanitizedSearch, $options: 'i' } },
        { 'address.state': { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    
    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Restaurant.countDocuments(filter),
    ]);
    
    const sanitizedRestaurants = restaurants.map((restaurant) => {
      const sanitized = sanitizeRestaurant(restaurant);
      const existingStats = restaurant.stats || {};
      const branchCount = restaurant.branches ? restaurant.branches.length : 0;
      
      sanitized.stats = {
        totalOrders: Number(existingStats.totalOrders) || 0,
        totalRevenue: Number(existingStats.totalRevenue) || 0,
        totalStaff: Number(existingStats.totalStaff) || 0,
        totalBranches: branchCount,
      };
      
      sanitized.branches = restaurant.branches || [];
      
      return sanitized;
    });
    
    res.status(200).json({
      success: true,
      data: {
        restaurants: sanitizedRestaurants,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        count: sanitizedRestaurants.length,
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

// ============================================================
//  ─── GET RESTAURANT BY ID ──────────────────────────────────
// ============================================================

export const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Allow searching by either ObjectId or restaurantId
    let restaurant;
    if (isValidObjectId(id)) {
      restaurant = await Restaurant.findById(id).lean();
    }
    
    if (!restaurant) {
      // Try finding by restaurantId
      restaurant = await Restaurant.findOne({ restaurantId: id }).lean();
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: sanitizeRestaurant(restaurant),
    });
  } catch (error) {
    console.error('❌ Get Restaurant Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant',
    });
  }
};

// ============================================================
//  ─── CREATE RESTAURANT ─────────────────────────────────────
// ============================================================

export const createRestaurant = async (req, res) => {
  console.log('📝 CREATE RESTAURANT');

  try {
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    const restaurantCount = await Restaurant.countDocuments({ createdBy: adminId });
    if (restaurantCount >= MAX_RESTAURANTS_PER_ADMIN) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_RESTAURANTS_PER_ADMIN} restaurants allowed per admin`,
      });
    }
    
    const body = sanitizeObject(req.body);
    
    const {
      name,
      email,
      phone,
      address,
      owner,
      businessType,
      gstNumber,
      panNumber,
      licenseNumber,
      fssaiLicense,
      commission,
    } = body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant name is required and must be at least 2 characters',
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
    
    if (!owner?.name) {
      return res.status(400).json({
        success: false,
        error: 'Owner name is required',
      });
    }
    
    const existingRestaurant = await Restaurant.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { name: name.trim() }],
    });
    
    if (existingRestaurant) {
      if (existingRestaurant.email === email.toLowerCase().trim()) {
        return res.status(409).json({
          success: false,
          error: 'A restaurant with this email already exists',
        });
      }
      if (existingRestaurant.name === name.trim()) {
        return res.status(409).json({
          success: false,
          error: 'A restaurant with this name already exists',
        });
      }
    }
    
    // ✅ Generate restaurantId
    const restaurantId = await Restaurant.generateRestaurantId(name);
    
    const restaurantData = {
      restaurantId, // ✅ Add generated restaurantId
      name: sanitizeInput(name.trim()),
      email: email.toLowerCase().trim(),
      phone: phone,
      address: {
        street: sanitizeInput(address.street.trim()),
        city: sanitizeInput(address.city.trim()),
        state: sanitizeInput(address.state.trim()),
        country: address.country || 'India',
        pincode: address.pincode.trim(),
        location: address.location || {},
      },
      owner: {
        name: sanitizeInput(owner.name.trim()),
        email: owner.email ? owner.email.toLowerCase().trim() : '',
        phone: owner.phone || '',
        address: owner.address ? sanitizeInput(owner.address.trim()) : '',
        pan: owner.pan ? owner.pan.toUpperCase().trim() : '',
        aadhaar: owner.aadhaar || '',
      },
      businessType: businessType || 'Restaurant',
      cuisineTypes: body.cuisineTypes || [],
      operatingHours: body.operatingHours || {},
      daysOfOperation: body.daysOfOperation || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      gstNumber: gstNumber ? gstNumber.toUpperCase().trim() : '',
      panNumber: panNumber ? panNumber.toUpperCase().trim() : '',
      licenseNumber: licenseNumber || '',
      fssaiLicense: fssaiLicense || '',
      commission: {
        rate: commission?.rate || 10,
        customRate: commission?.customRate || null,
      },
      stats: {
        totalOrders: 0,
        totalRevenue: 0,
        totalStaff: 0,
        totalBranches: 0,
      },
      revenue: {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        thisYear: 0,
        lastMonth: 0,
        lastYear: 0,
      },
      status: 'pending',
      verificationStatus: 'pending',
      createdBy: adminId,
      updatedBy: adminId,
      isActive: true,
    };
    
    const restaurant = await Restaurant.create(restaurantData);
    
    await logSecurityEvent(SecurityEventTypes.RESTAURANT_CREATED, adminId, {
      restaurantId: restaurant.restaurantId,
      restaurantName: restaurant.name,
      email: restaurant.email,
      ip: clientIp,
    });
    
    res.status(201).json({
      success: true,
      data: sanitizeRestaurant(restaurant),
      message: 'Restaurant created successfully',
    });
  } catch (error) {
    console.error('❌ Create Restaurant Error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A restaurant with this name or email already exists',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create restaurant',
    });
  }
};

// ============================================================
//  ─── UPDATE RESTAURANT ─────────────────────────────────────
// ============================================================

export const updateRestaurant = async (req, res) => {
  console.log('📝 UPDATE RESTAURANT');

  try {
    const { id } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ✅ Allow finding by either ObjectId or restaurantId
    let restaurant;
    if (isValidObjectId(id)) {
      restaurant = await Restaurant.findById(id);
    }
    
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ restaurantId: id });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    const body = sanitizeObject(req.body);
    const updateData = { updatedBy: adminId };
    
    // ✅ Don't allow updating restaurantId
    if (body.name) {
      updateData.name = sanitizeInput(body.name.trim());
      // If name changes, update restaurantId too
      if (body.name.trim() !== restaurant.name) {
        const newRestaurantId = await Restaurant.generateRestaurantId(body.name.trim());
        updateData.restaurantId = newRestaurantId;
      }
    }
    if (body.email) {
      if (!isValidEmail(body.email)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address',
        });
      }
      updateData.email = body.email.toLowerCase().trim();
    }
    if (body.phone) {
      if (!isValidPhone(body.phone)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid phone number',
        });
      }
      updateData.phone = body.phone;
    }
    if (body.logo !== undefined) updateData.logo = body.logo || '';
    
    if (body.address) {
      updateData.address = {
        street: sanitizeInput(body.address.street?.trim() || restaurant.address.street),
        city: sanitizeInput(body.address.city?.trim() || restaurant.address.city),
        state: sanitizeInput(body.address.state?.trim() || restaurant.address.state),
        country: body.address.country || restaurant.address.country,
        pincode: body.address.pincode || restaurant.address.pincode,
        location: body.address.location || restaurant.address.location,
      };
    }
    
    if (body.owner) {
      updateData.owner = {
        name: sanitizeInput(body.owner.name?.trim() || restaurant.owner.name),
        email: body.owner.email ? body.owner.email.toLowerCase().trim() : restaurant.owner.email,
        phone: body.owner.phone || restaurant.owner.phone,
        address: body.owner.address ? sanitizeInput(body.owner.address.trim()) : restaurant.owner.address,
        pan: body.owner.pan ? body.owner.pan.toUpperCase().trim() : restaurant.owner.pan,
        aadhaar: body.owner.aadhaar || restaurant.owner.aadhaar,
      };
    }
    
    if (body.businessType) {
      const validBusinessTypes = ['Restaurant', 'Cafe', 'Bakery', 'Food Truck', 'Cloud Kitchen', 'Fine Dining', 'Fast Food', 'Other'];
      if (!validBusinessTypes.includes(body.businessType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid business type. Allowed: ${validBusinessTypes.join(', ')}`,
        });
      }
      updateData.businessType = body.businessType;
    }
    
    if (body.cuisineTypes !== undefined) updateData.cuisineTypes = body.cuisineTypes || [];
    if (body.operatingHours) updateData.operatingHours = body.operatingHours;
    if (body.daysOfOperation) updateData.daysOfOperation = body.daysOfOperation;
    
    if (body.gstNumber !== undefined) updateData.gstNumber = body.gstNumber ? body.gstNumber.toUpperCase().trim() : '';
    if (body.panNumber !== undefined) updateData.panNumber = body.panNumber ? body.panNumber.toUpperCase().trim() : '';
    if (body.licenseNumber !== undefined) updateData.licenseNumber = body.licenseNumber || '';
    if (body.fssaiLicense !== undefined) updateData.fssaiLicense = body.fssaiLicense || '';
    
    if (body.status) {
      const validStatuses = ['pending', 'active', 'inactive', 'suspended'];
      if (!validStatuses.includes(body.status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value',
        });
      }
      updateData.status = body.status;
    }
    
    if (body.verificationStatus) {
      const validVerificationStatuses = ['pending', 'verified', 'rejected'];
      if (!validVerificationStatuses.includes(body.verificationStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification status',
        });
      }
      updateData.verificationStatus = body.verificationStatus;
    }
    
    if (body.verificationNotes !== undefined) {
      updateData.verificationNotes = body.verificationNotes ? sanitizeInput(body.verificationNotes.trim()) : '';
    }
    
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurant._id,
      { $set: updateData },
      { new: true, runValidators: false }
    ).lean();
    
    await logSecurityEvent(SecurityEventTypes.RESTAURANT_UPDATED, adminId, {
      restaurantId: updatedRestaurant.restaurantId,
      restaurantName: updatedRestaurant.name,
      ip: clientIp,
      updatedFields: Object.keys(updateData),
    });
    
    res.status(200).json({
      success: true,
      data: sanitizeRestaurant(updatedRestaurant),
      message: 'Restaurant updated successfully',
    });
  } catch (error) {
    console.error('❌ Update Restaurant Error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A restaurant with this name or email already exists',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update restaurant',
    });
  }
};

// ============================================================
//  ─── DELETE RESTAURANT ─────────────────────────────────────
// ============================================================

export const deleteRestaurant = async (req, res) => {
  console.log('🗑️ DELETE RESTAURANT');

  try {
    const { id } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ✅ Allow finding by either ObjectId or restaurantId
    let restaurant;
    if (isValidObjectId(id)) {
      restaurant = await Restaurant.findById(id);
    }
    
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ restaurantId: id });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    await Restaurant.findByIdAndDelete(restaurant._id);
    
    await logSecurityEvent(SecurityEventTypes.RESTAURANT_DELETED, adminId, {
      restaurantId: restaurant.restaurantId,
      restaurantName: restaurant.name,
      email: restaurant.email,
      ip: clientIp,
    });
    
    res.status(200).json({
      success: true,
      message: `Restaurant '${sanitizeInput(restaurant.name)}' deleted successfully`,
    });
  } catch (error) {
    console.error('❌ Delete Restaurant Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete restaurant',
    });
  }
};

// ============================================================
//  ─── UPDATE RESTAURANT STATUS ──────────────────────────────
// ============================================================

export const updateRestaurantStatus = async (req, res) => {
  console.log('🔄 UPDATE RESTAURANT STATUS');

  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ✅ Allow finding by either ObjectId or restaurantId
    let restaurant;
    if (isValidObjectId(id)) {
      restaurant = await Restaurant.findById(id);
    }
    
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ restaurantId: id });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    const validStatuses = ['pending', 'active', 'inactive', 'suspended'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value',
      });
    }
    
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurant._id,
      { 
        $set: { 
          status, 
          updatedBy: adminId,
          ...(status === 'active' ? { isActive: true } : {}),
        } 
      },
      { new: true, runValidators: true }
    ).lean();
    
    await logSecurityEvent(SecurityEventTypes.RESTAURANT_STATUS_CHANGED, adminId, {
      restaurantId: updatedRestaurant.restaurantId,
      restaurantName: updatedRestaurant.name,
      newStatus: status,
      ip: clientIp,
    });
    
    res.status(200).json({
      success: true,
      data: sanitizeRestaurant(updatedRestaurant),
      message: `Restaurant status updated to ${status}`,
    });
  } catch (error) {
    console.error('❌ Update Status Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update restaurant status',
    });
  }
};

// ============================================================
//  ─── UPDATE RESTAURANT VERIFICATION ─────────────────────────
// ============================================================

export const updateRestaurantVerification = async (req, res) => {
  console.log('🔄 UPDATE RESTAURANT VERIFICATION');

  try {
    const { id } = req.params;
    const { verificationStatus, verificationNotes } = req.body;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ✅ Allow finding by either ObjectId or restaurantId
    let restaurant;
    if (isValidObjectId(id)) {
      restaurant = await Restaurant.findById(id);
    }
    
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ restaurantId: id });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    const validVerificationStatuses = ['pending', 'verified', 'rejected'];
    if (!verificationStatus || !validVerificationStatuses.includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification status value',
      });
    }
    
    const updateData = {
      verificationStatus,
      verificationNotes: verificationNotes ? sanitizeInput(verificationNotes.trim()) : '',
      updatedBy: adminId,
    };
    
    if (verificationStatus === 'verified') {
      updateData.status = 'active';
      updateData.isActive = true;
    }
    
    if (verificationStatus === 'rejected') {
      updateData.status = 'inactive';
      updateData.isActive = false;
    }
    
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurant._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
    
    await logSecurityEvent(SecurityEventTypes.RESTAURANT_VERIFICATION_UPDATED, adminId, {
      restaurantId: updatedRestaurant.restaurantId,
      restaurantName: updatedRestaurant.name,
      verificationStatus,
      ip: clientIp,
    });
    
    res.status(200).json({
      success: true,
      data: sanitizeRestaurant(updatedRestaurant),
      message: `Restaurant verification updated to ${verificationStatus}`,
    });
  } catch (error) {
    console.error('❌ Update Verification Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update restaurant verification',
    });
  }
};

// ============================================================
//  ─── ADD BRANCH ─────────────────────────────────────────────
// ============================================================

export const addBranch = async (req, res) => {
  console.log('➕ ADD BRANCH');

  try {
    const { id } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ✅ Allow finding by either ObjectId or restaurantId
    let restaurant;
    if (isValidObjectId(id)) {
      restaurant = await Restaurant.findById(id);
    }
    
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ restaurantId: id });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    const body = sanitizeObject(req.body);
    const { name, address, phone, email, manager } = body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Branch name is required and must be at least 2 characters',
      });
    }
    
    if (!address?.street || !address?.city || !address?.state || !address?.pincode) {
      return res.status(400).json({
        success: false,
        error: 'Full address is required for branch',
      });
    }
    
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid phone number for branch',
      });
    }
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address for branch',
      });
    }
    
    const branchData = {
      name: sanitizeInput(name.trim()),
      address: {
        street: sanitizeInput(address.street.trim()),
        city: sanitizeInput(address.city.trim()),
        state: sanitizeInput(address.state.trim()),
        country: address.country || 'India',
        pincode: address.pincode.trim(),
        location: address.location || {},
      },
      phone: phone,
      email: email.toLowerCase().trim(),
      manager: manager ? {
        name: sanitizeInput(manager.name?.trim() || ''),
        phone: manager.phone || '',
        email: manager.email ? manager.email.toLowerCase().trim() : '',
      } : {},
      status: 'active',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    restaurant.branches.push(branchData);
    await restaurant.save();
    
    await logSecurityEvent(SecurityEventTypes.BRANCH_ADDED, adminId, {
      restaurantId: restaurant.restaurantId,
      restaurantName: restaurant.name,
      branchName: branchData.name,
      ip: clientIp,
    });
    
    const updatedRestaurant = await Restaurant.findById(restaurant._id).lean();
    
    res.status(201).json({
      success: true,
      data: sanitizeRestaurant(updatedRestaurant),
      message: 'Branch added successfully',
    });
  } catch (error) {
    console.error('❌ Add Branch Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add branch',
    });
  }
};

// ============================================================
//  ─── UPDATE BRANCH ──────────────────────────────────────────
// ============================================================

export const updateBranch = async (req, res) => {
  console.log('✏️ UPDATE BRANCH');

  try {
    const { id, branchId } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ✅ Allow finding by either ObjectId or restaurantId
    let restaurant;
    if (isValidObjectId(id)) {
      restaurant = await Restaurant.findById(id);
    }
    
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ restaurantId: id });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    if (!isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }
    
    const branch = restaurant.branches.id(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }
    
    const body = sanitizeObject(req.body);
    
    if (body.name) branch.name = sanitizeInput(body.name.trim());
    if (body.phone) {
      if (!isValidPhone(body.phone)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid phone number',
        });
      }
      branch.phone = body.phone;
    }
    if (body.email) {
      if (!isValidEmail(body.email)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address',
        });
      }
      branch.email = body.email.toLowerCase().trim();
    }
    if (body.address) {
      branch.address = {
        street: sanitizeInput(body.address.street?.trim() || branch.address.street),
        city: sanitizeInput(body.address.city?.trim() || branch.address.city),
        state: sanitizeInput(body.address.state?.trim() || branch.address.state),
        country: body.address.country || branch.address.country,
        pincode: body.address.pincode || branch.address.pincode,
        location: body.address.location || branch.address.location,
      };
    }
    if (body.manager) {
      branch.manager = {
        name: sanitizeInput(body.manager.name?.trim() || branch.manager?.name || ''),
        phone: body.manager.phone || branch.manager?.phone || '',
        email: body.manager.email ? body.manager.email.toLowerCase().trim() : branch.manager?.email || '',
      };
    }
    if (body.status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(body.status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value',
        });
      }
      branch.status = body.status;
    }
    if (body.isActive !== undefined) {
      branch.isActive = Boolean(body.isActive);
    }
    
    branch.updatedAt = new Date();
    await restaurant.save();
    
    await logSecurityEvent(SecurityEventTypes.BRANCH_UPDATED, adminId, {
      restaurantId: restaurant.restaurantId,
      restaurantName: restaurant.name,
      branchName: branch.name,
      ip: clientIp,
    });
    
    const updatedRestaurant = await Restaurant.findById(restaurant._id).lean();
    
    res.status(200).json({
      success: true,
      data: sanitizeRestaurant(updatedRestaurant),
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

// ============================================================
//  ─── DELETE BRANCH ──────────────────────────────────────────
// ============================================================

export const deleteBranch = async (req, res) => {
  console.log('🗑️ DELETE BRANCH');

  try {
    const { id, branchId } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ✅ Allow finding by either ObjectId or restaurantId
    let restaurant;
    if (isValidObjectId(id)) {
      restaurant = await Restaurant.findById(id);
    }
    
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ restaurantId: id });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }
    
    if (!isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }
    
    const branch = restaurant.branches.id(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }
    
    const branchName = branch.name;
    restaurant.branches.pull(branchId);
    await restaurant.save();
    
    await logSecurityEvent(SecurityEventTypes.BRANCH_DELETED, adminId, {
      restaurantId: restaurant.restaurantId,
      restaurantName: restaurant.name,
      branchName: branchName,
      ip: clientIp,
    });
    
    const updatedRestaurant = await Restaurant.findById(restaurant._id).lean();
    
    res.status(200).json({
      success: true,
      data: sanitizeRestaurant(updatedRestaurant),
      message: 'Branch deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete Branch Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete branch',
    });
  }
};