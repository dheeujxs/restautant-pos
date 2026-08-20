// controllers/tableController.js - COMPLETE FIXED VERSION WITH BRANCH SUPPORT

import Table from '../models/Table.js';
import Floor from '../models/Floor.js';
import Order from '../models/Order.js';
import Branch from '../models/super-admin/Branch.js';
import QRCode from 'qrcode';
import { validationResult, body, param, query } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ============================================================
//  SECURITY UTILITIES (Built-in)
// ============================================================

// XSS Sanitizer
const sanitizeXSS = (str) => {
  if (!str) return str;
  if (typeof str !== 'string') return str;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'/]/g, (match) => map[match] || match);
};

// SQL Injection Detection
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
    /(;+\s*$)/g
  ];
  
  return patterns.some(pattern => pattern.test(str));
};

// XSS Pattern Detection
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
    /setInterval\s*\(/gi
  ];
  
  return patterns.some(pattern => pattern.test(str));
};

// MongoDB ID Validation
const validateMongoId = (id) => {
  return /^[a-fA-F0-9]{24}$/.test(id);
};

// Get Object Depth (for DoS protection)
const getObjectDepth = (obj, depth = 0) => {
  if (typeof obj !== 'object' || obj === null) return depth;
  if (Array.isArray(obj)) {
    return obj.length > 0 ? Math.max(...obj.map(item => getObjectDepth(item, depth + 1))) : depth;
  }
  return Object.values(obj).length > 0 
    ? Math.max(...Object.values(obj).map(value => getObjectDepth(value, depth + 1)))
    : depth;
};

// Check for Bot Traffic
const checkForBotTraffic = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /scanner/i,
    /headless/i,
    /puppeteer/i,
    /phantom/i,
    /selenium/i,
    /webdriver/i,
    /automation/i,
    /curl/i,
    /wget/i,
    /python/i,
    /ruby/i,
    /perl/i,
    /java/i,
    /php/i,
    /nikto/i,
    /sqlmap/i,
    /nmap/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
};

// Generate Secure Hash
const generateSecureHash = (data) => {
  return crypto
    .createHash('sha256')
    .update(data + (process.env.SECURITY_SALT || 'default-salt'))
    .digest('hex');
};

// ============================================================
//  BRANCH HELPER FUNCTIONS
// ============================================================

// Get default branch for a user/restaurant
const getDefaultBranch = async (userId) => {
  try {
    // Try to find branch from user's restaurant
    if (userId) {
      // You might want to get the user's restaurant from User model
      // For now, get the first active main branch
      const branch = await Branch.findOne({ isMainBranch: true, isActive: true }).lean();
      if (branch) return branch;
    }
    
    // Fallback: get any active branch
    const branch = await Branch.findOne({ isActive: true }).lean();
    if (branch) return branch;
    
    return null;
  } catch (error) {
    console.error('Error getting default branch:', error);
    return null;
  }
};

// Get branch from request body or user
const getBranchFromRequest = async (req) => {
  try {
    // Check if branchId is provided in request body
    if (req.body.branchId && validateMongoId(req.body.branchId)) {
      const branch = await Branch.findById(req.body.branchId).lean();
      if (branch) return branch;
    }
    
    // Check if branchId is in user object
    if (req.user?.branchId && validateMongoId(req.user.branchId)) {
      const branch = await Branch.findById(req.user.branchId).lean();
      if (branch) return branch;
    }
    
    // Get default branch
    return await getDefaultBranch(req.user?._id);
  } catch (error) {
    console.error('Error getting branch from request:', error);
    return null;
  }
};

// ============================================================
//  AUTHORIZATION HELPER
// ============================================================

const checkAuthorization = (user, permission) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  const rolePermissions = {
    manager: ['TABLE_READ', 'TABLE_CREATE', 'TABLE_UPDATE', 'TABLE_DELETE'],
    user: ['TABLE_READ'],
    waiter: ['TABLE_READ', 'TABLE_UPDATE'],
    cashier: ['TABLE_READ']
  };
  
  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
};

// ============================================================
//  VALIDATION MIDDLEWARE
// ============================================================

export const validateTable = [
  body().custom((value) => {
    const depth = getObjectDepth(value);
    if (depth > 10) {
      throw new Error('Request object too deeply nested');
    }
    
    const size = JSON.stringify(value).length;
    if (size > 1024 * 1024) {
      throw new Error('Request payload too large');
    }
    return true;
  }),

  body('number')
    .trim()
    .notEmpty().withMessage('Table number is required')
    .isLength({ min: 1, max: 50 }).withMessage('Table number must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_.]+$/).withMessage('Table number contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (checkForSQLInjection(value) || checkForXSSPatterns(value)) {
        throw new Error('Table number contains malicious patterns');
      }
      return true;
    }),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Table name too long')
    .matches(/^[a-zA-Z0-9\s\-_.']+$/).withMessage('Table name contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Table name contains malicious patterns');
      }
      return true;
    }),
  
  body('floorId')
    .notEmpty().withMessage('Floor is required')
    .isMongoId().withMessage('Invalid floor ID format')
    .custom((value) => {
      if (!validateMongoId(value)) {
        throw new Error('Invalid floor ID format');
      }
      return true;
    }),
  
  body('branchId')
    .optional()
    .isMongoId().withMessage('Invalid branch ID format')
    .custom((value) => {
      if (value && !validateMongoId(value)) {
        throw new Error('Invalid branch ID format');
      }
      return true;
    }),
  
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Capacity must be between 1 and 50')
    .toInt(),
  
  body('shape')
    .optional()
    .isIn(['square', 'rectangle', 'circle', 'round']).withMessage('Invalid table shape'),
  
  body('positionX')
    .optional()
    .isFloat({ min: -10000, max: 10000 }).withMessage('Position X must be a valid number')
    .toFloat(),
  
  body('positionY')
    .optional()
    .isFloat({ min: -10000, max: 10000 }).withMessage('Position Y must be a valid number')
    .toFloat(),
  
  body('width')
    .optional()
    .isInt({ min: 20, max: 500 }).withMessage('Width must be between 20 and 500')
    .toInt(),
  
  body('height')
    .optional()
    .isInt({ min: 20, max: 500 }).withMessage('Height must be between 20 and 500')
    .toInt(),
  
  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0, max: 999999.99 }).withMessage('Minimum order amount must be between 0 and 999999.99')
    .toFloat(),
  
  body('coverCharge')
    .optional()
    .isFloat({ min: 0, max: 999999.99 }).withMessage('Cover charge must be between 0 and 999999.99')
    .toFloat(),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean value')
    .toBoolean(),
  
  body('status')
    .optional()
    .isIn(['available', 'occupied', 'reserved', 'cleaning', 'out_of_service']).withMessage('Invalid table status')
];

// ... (other validation functions remain the same)

// ============================================================
//  QR CODE GENERATION
// ============================================================

const generateQRCode = async (tableId, tableNumber) => {
  try {
    if (!tableId || !validateMongoId(tableId)) {
      throw new Error('Invalid table ID');
    }
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrData = `${baseUrl}/menu?tableId=${tableId}&t=${Date.now()}`;
    
    const qrOptions = {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    };
    
    return await QRCode.toDataURL(qrData, qrOptions);
  } catch (err) {
    console.error('QR generation failed:', err);
    return '';
  }
};

// ============================================================
//  CONTROLLER FUNCTIONS
// ============================================================

// @desc    Get all tables
// @route   GET /api/tables
export const getTables = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    if (!checkAuthorization(req.user, 'TABLE_READ')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requestId
      });
    }

    if (checkForBotTraffic(req)) {
      return res.status(403).json({
        success: false,
        error: 'Bot traffic detected',
        requestId
      });
    }

    const search = req.query.search || '';
    const floorId = req.query.floorId;
    const status = req.query.status;
    const branchId = req.query.branchId;
    
    const filter = {};
    
    if (search) {
      const sanitizedSearch = sanitizeXSS(search.trim());
      if (checkForSQLInjection(sanitizedSearch)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid search query',
          requestId
        });
      }
      filter.$text = { $search: sanitizedSearch };
    }
    
    if (floorId) {
      if (!validateMongoId(floorId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid floor ID format',
          requestId
        });
      }
      filter.floorId = floorId;
    }
    
    if (status) {
      const validStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'out_of_service'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status filter',
          requestId
        });
      }
      filter.status = status;
    }
    
    // ✅ Filter by branch if provided
    if (branchId && validateMongoId(branchId)) {
      filter.branchId = branchId;
    }
    
    if (req.user?.organizationId) {
      filter.organizationId = req.user.organizationId;
    }
    
    const tables = await Table.find(filter)
      .sort({ number: 1 })
      .lean()
      .maxTimeMS(5000);
    
    const floors = await Floor.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean()
      .maxTimeMS(3000);
    
    return res.json({ 
      success: true, 
      data: { 
        tables, 
        floors,
        count: tables.length
      },
      requestId
    });
  } catch (err) {
    console.error('[GET /api/tables]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch tables',
      requestId
    });
  }
};

// @desc    Get single table
// @route   GET /api/tables/:id
export const getTableById = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    const { id } = req.params;

    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid table ID format',
        requestId
      });
    }

    if (!checkAuthorization(req.user, 'TABLE_READ')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requestId
      });
    }

    const table = await Table.findById(id).lean().maxTimeMS(3000);
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found',
        requestId
      });
    }

    return res.json({ 
      success: true, 
      data: table,
      requestId
    });
  } catch (err) {
    console.error('[GET /api/tables/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch table',
      requestId
    });
  }
};

// @desc    Create table - FIXED with branch support
// @route   POST /api/tables
export const createTable = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        requestId
      });
    }

    if (!checkAuthorization(req.user, 'TABLE_CREATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create tables',
        requestId
      });
    }

    const body = req.body;

    const sanitizedNumber = sanitizeXSS(body.number.trim());
    const sanitizedName = body.name ? sanitizeXSS(body.name.trim()) : '';
    
    if (!sanitizedNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Table number is required',
        requestId
      });
    }

    if (!body.floorId || !validateMongoId(body.floorId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid floor ID is required',
        requestId
      });
    }

    // Check for duplicate
    const existing = await Table.findOne({ 
      number: { $regex: `^${sanitizedNumber}$`, $options: 'i' }
    }).maxTimeMS(3000);
    
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: `Table number '${sanitizedNumber}' already exists`,
        requestId
      });
    }

    const floor = await Floor.findById(body.floorId).lean().maxTimeMS(3000);
    if (!floor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Floor not found',
        requestId
      });
    }

    // ✅ Get branch data
    const branch = await getBranchFromRequest(req);
    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'No branch found. Please assign a branch to this table.',
        requestId
      });
    }

    const tableData = {
      number: sanitizedNumber,
      name: sanitizedName,
      floorId: body.floorId,
      floorName: floor.name,
      // ✅ Add branch data
      branchId: branch._id,
      branchName: branch.name,
      restaurantId: branch.restaurantId,
      restaurantName: branch.restaurantName || 'Kanha',
      capacity: Math.max(1, Math.min(50, parseInt(body.capacity) || 4)),
      shape: ['square', 'rectangle', 'circle', 'round'].includes(body.shape) ? body.shape : 'square',
      positionX: parseFloat(body.positionX) || 0,
      positionY: parseFloat(body.positionY) || 0,
      width: Math.max(20, Math.min(500, parseInt(body.width) || 80)),
      height: Math.max(20, Math.min(500, parseInt(body.height) || 80)),
      minOrderAmount: Math.max(0, parseFloat(body.minOrderAmount) || 0),
      coverCharge: Math.max(0, parseFloat(body.coverCharge) || 0),
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      status: body.status || 'available',
      createdBy: req.user._id,
    };

    const table = await Table.create(tableData);

    // Generate QR Code
    try {
      const qrCode = await generateQRCode(table._id.toString(), table.number);
      if (qrCode) {
        await Table.findByIdAndUpdate(table._id, { qrCode });
      }
    } catch (qrErr) {
      console.warn('QR generation failed:', qrErr.message);
    }

    const updatedTable = await Table.findById(table._id).lean().maxTimeMS(3000);

    return res.status(201).json({ 
      success: true, 
      data: updatedTable, 
      message: `Table ${table.number} created successfully in branch ${branch.name}`,
      requestId
    });
  } catch (err) {
    console.error('[POST /api/tables]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create table: ' + err.message,
      requestId
    });
  }
};

// @desc    Update table - FIXED with branch support
// @route   PUT /api/tables/:id
export const updateTable = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    const { id } = req.params;

    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid table ID format',
        requestId
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        requestId
      });
    }

    if (!checkAuthorization(req.user, 'TABLE_UPDATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update tables',
        requestId
      });
    }

    const existingTable = await Table.findById(id).maxTimeMS(3000);
    if (!existingTable) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found',
        requestId
      });
    }

    const body = req.body;
    const updateData = {};
    
    // Sanitize fields
    const sanitizedFields = ['number', 'name', 'shape', 'status'];
    for (const field of sanitizedFields) {
      if (body[field] !== undefined) {
        const sanitized = sanitizeXSS(body[field].trim());
        if (checkForSQLInjection(sanitized) || checkForXSSPatterns(sanitized)) {
          return res.status(400).json({
            success: false,
            error: `${field} contains malicious patterns`,
            requestId
          });
        }
        updateData[field] = sanitized;
      }
    }

    // Check duplicate number if changed
    if (updateData.number && updateData.number !== existingTable.number) {
      const duplicate = await Table.findOne({ 
        number: { $regex: `^${updateData.number}$`, $options: 'i' },
        _id: { $ne: id }
      }).maxTimeMS(3000);
      
      if (duplicate) {
        return res.status(409).json({ 
          success: false, 
          error: `Table number '${updateData.number}' already exists`,
          requestId
        });
      }
    }

    // Handle floor change
    if (body.floorId && body.floorId !== existingTable.floorId) {
      if (!validateMongoId(body.floorId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid floor ID format',
          requestId
        });
      }
      
      const floor = await Floor.findById(body.floorId).lean().maxTimeMS(3000);
      if (floor) {
        updateData.floorId = body.floorId;
        updateData.floorName = floor.name;
      }
    }

    // ✅ Handle branch change
    if (body.branchId && body.branchId !== existingTable.branchId?.toString()) {
      if (!validateMongoId(body.branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
          requestId
        });
      }
      
      const branch = await Branch.findById(body.branchId).lean();
      if (branch) {
        updateData.branchId = branch._id;
        updateData.branchName = branch.name;
        updateData.restaurantId = branch.restaurantId;
        updateData.restaurantName = branch.restaurantName || 'Kanha';
      }
    }

    // Numeric fields
    const numericFields = ['capacity', 'positionX', 'positionY', 'width', 'height', 'minOrderAmount', 'coverCharge'];
    for (const field of numericFields) {
      if (body[field] !== undefined) {
        const value = parseFloat(body[field]);
        if (!isNaN(value)) {
          const ranges = {
            capacity: { min: 1, max: 50 },
            positionX: { min: -10000, max: 10000 },
            positionY: { min: -10000, max: 10000 },
            width: { min: 20, max: 500 },
            height: { min: 20, max: 500 },
            minOrderAmount: { min: 0, max: 999999.99 },
            coverCharge: { min: 0, max: 999999.99 }
          };
          
          const range = ranges[field];
          if (value >= range.min && value <= range.max) {
            updateData[field] = Math.round(value * 100) / 100;
          }
        }
      }
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    const updated = await Table.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).maxTimeMS(5000);

    return res.json({ 
      success: true, 
      data: updated, 
      message: 'Table updated successfully',
      requestId
    });
  } catch (err) {
    console.error('[PATCH /api/tables/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update table: ' + err.message,
      requestId
    });
  }
};

// @desc    Delete table
// @route   DELETE /api/tables/:id
export const deleteTable = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    const { id } = req.params;

    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid table ID format',
        requestId
      });
    }

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions to delete tables',
        requestId
      });
    }

    const table = await Table.findById(id).maxTimeMS(3000);
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found',
        requestId
      });
    }

    if (table.currentOrderId && table.status === 'occupied') {
      const order = await Order.findById(table.currentOrderId).maxTimeMS(3000);
      if (order && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled') {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot delete table with active order. Complete or cancel order first.',
          requestId
        });
      }
    }

    await Table.findByIdAndDelete(id).maxTimeMS(3000);

    return res.json({ 
      success: true, 
      data: null, 
      message: 'Table deleted successfully',
      requestId
    });
  } catch (err) {
    console.error('[DELETE /api/tables/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete table',
      requestId
    });
  }
};

// @desc    Update table status
// @route   PATCH /api/tables/:id/status
export const updateTableStatus = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    const { id } = req.params;
    const { status, currentOrderId, reservedFor, reservedTime } = req.body;

    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid table ID format',
        requestId
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        requestId
      });
    }

    if (!checkAuthorization(req.user, 'TABLE_UPDATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update table status',
        requestId
      });
    }

    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'out_of_service'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value',
        requestId
      });
    }

    const updateData = { status };

    if (status === 'occupied') {
      if (!currentOrderId || !validateMongoId(currentOrderId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid order ID is required when occupying a table',
          requestId
        });
      }
      updateData.currentOrderId = currentOrderId;
      updateData.reservedFor = '';
      updateData.reservedTime = null;
    } else if (status === 'reserved') {
      if (!reservedFor) {
        return res.status(400).json({
          success: false,
          error: 'Reservation name is required when reserving a table',
          requestId
        });
      }
      if (!reservedTime) {
        return res.status(400).json({
          success: false,
          error: 'Reservation time is required when reserving a table',
          requestId
        });
      }
      
      const sanitizedReservedFor = sanitizeXSS(reservedFor.trim());
      if (checkForSQLInjection(sanitizedReservedFor) || checkForXSSPatterns(sanitizedReservedFor)) {
        return res.status(400).json({
          success: false,
          error: 'Reservation name contains malicious patterns',
          requestId
        });
      }
      
      const reservationDate = new Date(reservedTime);
      if (isNaN(reservationDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid reservation time format',
          requestId
        });
      }
      
      if (reservationDate < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Reservation time cannot be in the past',
          requestId
        });
      }
      
      updateData.reservedFor = sanitizedReservedFor;
      updateData.reservedTime = reservationDate;
      updateData.currentOrderId = null;
    } else {
      updateData.currentOrderId = null;
      updateData.reservedFor = '';
      updateData.reservedTime = null;
    }

    const updated = await Table.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).maxTimeMS(3000);

    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found',
        requestId
      });
    }

    return res.json({ 
      success: true, 
      data: updated, 
      message: `Table status updated to ${status}`,
      requestId
    });
  } catch (err) {
    console.error('[PATCH /api/tables/:id/status]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update status',
      requestId
    });
  }
};

// @desc    Get tables with orders
// @route   GET /api/tables/with-orders
export const getTablesWithOrders = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    if (!checkAuthorization(req.user, 'TABLE_READ')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requestId
      });
    }

    const filter = {};
    if (req.user?.organizationId) {
      filter.organizationId = req.user.organizationId;
    }

    const tables = await Table.find(filter).lean().maxTimeMS(5000);
    
    const tablesWithDetails = await Promise.all(tables.map(async (table) => {
      let orderDetails = null;
      
      if (table.currentOrderId && table.status === 'occupied') {
        const order = await Order.findOne({
          _id: table.currentOrderId,
          tableId: table._id
        }).lean().maxTimeMS(3000);
        
        if (order) {
          orderDetails = {
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            total: order.total,
            createdAt: order.createdAt,
            items: (order.items || []).map(item => ({
              productName: sanitizeXSS(item.productName),
              quantity: item.quantity,
              totalPrice: item.totalPrice
            }))
          };
        }
      }
      
      return { ...table, orderDetails };
    }));
    
    return res.json({ 
      success: true, 
      data: tablesWithDetails,
      requestId
    });
  } catch (err) {
    console.error('[GET /api/tables/with-orders]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch tables with orders',
      requestId
    });
  }
};

// @desc    Force free table
// @route   POST /api/tables/:id/free
export const forceFreeTable = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    const { id } = req.params;

    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid table ID format',
        requestId
      });
    }

    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to force free tables',
        requestId
      });
    }

    const table = await Table.findById(id).maxTimeMS(3000);
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found',
        requestId
      });
    }

    console.log(`[SECURITY] Force freeing table ${table.number} by user ${req.user._id}`);

    const updated = await Table.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: 'available', 
          currentOrderId: null,
          reservedFor: '',
          reservedTime: null,
        }
      },
      { new: true }
    ).maxTimeMS(3000);

    // Update associated order if exists
    if (table.currentOrderId) {
      try {
        const order = await Order.findById(table.currentOrderId).maxTimeMS(3000);
        if (order) {
          await Order.findByIdAndUpdate(
            table.currentOrderId,
            { 
              $set: { 
                orderStatus: 'cancelled', 
                paymentStatus: 'refunded',
                cancelledAt: new Date(),
                cancelledBy: req.user._id,
                cancellationReason: 'Force freed by admin'
              }
            }
          );
        }
      } catch (orderErr) {
        console.warn('Failed to update order:', orderErr.message);
      }
    }

    return res.json({ 
      success: true, 
      data: updated, 
      message: `Table ${table.number} has been freed successfully`,
      requestId
    });
  } catch (err) {
    console.error('[POST /api/tables/:id/free]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to free table',
      requestId
    });
  }
};

// ============================================================
//  EXPORTS
// ============================================================

export default {
  getTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  forceFreeTable,
  getTablesWithOrders
};