// controllers/supplierController.js

import Supplier from '../models/Supplier.js';
import { validationResult, body, param, query } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto'; // ✅ IMPORT crypto at the top

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
    /setInterval\s*\(/gi,
    /document\./gi,
    /window\./gi,
    /\.innerHTML/gi,
    /\.cookie/gi
  ];
  
  return patterns.some(pattern => pattern.test(str));
};

// Phone Number Validation
const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^[\+\d]{7,20}$/.test(cleaned);
};

// Email Validation
const validateEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// MongoDB ID Validation
const validateMongoId = (id) => {
  return /^[a-fA-F0-9]{24}$/.test(id);
};

// Mask Sensitive Data
const maskSensitiveData = (data, type = 'default') => {
  if (!data) return data;
  
  const str = String(data);
  const length = str.length;
  
  switch (type) {
    case 'email':
      const parts = str.split('@');
      if (parts.length === 2) {
        const username = parts[0];
        const domain = parts[1];
        const masked = username.length > 2 
          ? username.substring(0, 2) + '*'.repeat(Math.min(5, username.length - 2))
          : '*'.repeat(username.length);
        return `${masked}@${domain}`;
      }
      return '*'.repeat(Math.min(10, length));
      
    case 'phone':
      if (length >= 10) {
        return str.substring(0, 3) + '***' + str.substring(length - 4);
      }
      return '*'.repeat(Math.min(7, length));
      
    default:
      if (length > 8) {
        return str.substring(0, 4) + '*'.repeat(Math.min(10, length - 8)) + str.substring(length - 4);
      }
      return '*'.repeat(Math.min(6, length));
  }
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

// ✅ FIXED: Use imported crypto instead of require
const generateSecureHash = (data) => {
  return crypto
    .createHash('sha256')
    .update(data + (process.env.SECURITY_SALT || 'default-salt'))
    .digest('hex');
};

// ============================================================
//  VALIDATION SCHEMAS
// ============================================================

export const validateSupplier = [
  // Payload size and depth validation
  body().custom((value) => {
    const depth = getObjectDepth(value);
    if (depth > 10) {
      throw new Error('Request object too deeply nested');
    }
    
    const size = JSON.stringify(value).length;
    if (size > 1024 * 1024) { // 1MB limit
      throw new Error('Request payload too large');
    }
    return true;
  }),

  body('supplierName')
    .trim()
    .notEmpty().withMessage('Supplier name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Supplier name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-.,&()'"]+$/).withMessage('Supplier name contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (checkForSQLInjection(value) || checkForXSSPatterns(value)) {
        throw new Error('Supplier name contains malicious patterns');
      }
      return true;
    }),
  
  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Contact person name too long')
    .matches(/^[a-zA-Z\s\-.,']+$/).withMessage('Contact person contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Contact person contains malicious patterns');
      }
      return true;
    }),
  
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .isLength({ min: 7, max: 20 }).withMessage('Phone number must be between 7 and 20 characters')
    .matches(/^[\+\d\s\-()]+$/).withMessage('Phone number contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (!validatePhoneNumber(value)) {
        throw new Error('Invalid phone number format');
      }
      return true;
    }),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .isLength({ max: 100 }).withMessage('Email too long')
    .normalizeEmail()
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && !validateEmail(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address too long')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Address contains malicious patterns');
      }
      return true;
    }),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes too long')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Notes contain malicious patterns');
      }
      return true;
    }),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Invalid status value'),
  
  body('supplierIngredients')
    .optional()
    .isArray().withMessage('Supplier ingredients must be an array')
    .isArray({ max: 100 }).withMessage('Too many ingredients')
    .custom((ingredients) => {
      if (!ingredients) return true;
      
      for (const [index, ing] of ingredients.entries()) {
        if (ing.ingredientId && !validateMongoId(ing.ingredientId)) {
          throw new Error(`Invalid ingredient ID format at index ${index}`);
        }
        
        if (ing.lastPurchasePrice !== undefined) {
          if (typeof ing.lastPurchasePrice !== 'number' || 
              ing.lastPurchasePrice < 0 || 
              ing.lastPurchasePrice > 999999.99) {
            throw new Error(`Invalid purchase price at index ${index}`);
          }
        }
        
        if (ing.unit && checkForXSSPatterns(ing.unit)) {
          throw new Error(`XSS patterns detected in unit at index ${index}`);
        }
      }
      return true;
    })
];

export const validateId = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isMongoId().withMessage('Invalid ID format')
    .custom((value) => {
      if (!validateMongoId(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    })
];

export const validateStatus = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isMongoId().withMessage('Invalid ID format')
    .custom((value) => {
      if (!validateMongoId(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    }),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['active', 'inactive']).withMessage('Invalid status value')
    .custom((value, { req }) => {
      if (value === 'inactive' && !req.body.reason) {
        throw new Error('Reason is required for deactivation');
      }
      return true;
    })
];

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt()
    .custom((value) => {
      if (value > 1000) {
        throw new Error('Page number too large');
      }
      return true;
    }),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('search')
    .optional()
    .isLength({ max: 200 }).withMessage('Search query too long')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Search query contains malicious patterns');
      }
      return true;
    }),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Invalid status filter'),
  
  query('sortBy')
    .optional()
    .isIn(['supplierName', 'createdAt', 'updatedAt', 'status']).withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Invalid sort order')
];

// ============================================================
//  AUTHORIZATION HELPER
// ============================================================

const checkAuthorization = (user, permission) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  const rolePermissions = {
    manager: ['SUPPLIER_READ', 'SUPPLIER_CREATE', 'SUPPLIER_UPDATE'],
    user: ['SUPPLIER_READ'],
    auditor: ['SUPPLIER_READ']
  };
  
  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
};

// ============================================================
//  CONTROLLER FUNCTIONS
// ============================================================

// @desc    Get all suppliers
// @route   GET /api/suppliers
export const getSuppliers = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    // Check authorization
    if (!checkAuthorization(req.user, 'SUPPLIER_READ')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requestId
      });
    }

    // Check for bot traffic
    if (checkForBotTraffic(req)) {
      return res.status(403).json({
        success: false,
        error: 'Bot traffic detected',
        requestId
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = req.query.search || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';
    
    // Sanitize search input
    const sanitizedSearch = sanitizeXSS(search.trim());
    if (sanitizedSearch && checkForSQLInjection(sanitizedSearch)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search query',
        requestId
      });
    }
    
    // Build filter
    const filter = {};
    if (sanitizedSearch) {
      const escapedSearch = sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { supplierName: { $regex: escapedSearch, $options: 'i' } },
        { contactPerson: { $regex: escapedSearch, $options: 'i' } },
        { phoneNumber: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    
    // Add organization filter for multi-tenant
    if (req.user?.organizationId) {
      filter.organizationId = req.user.organizationId;
    }
    
    // Create sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Query with timeout
    const suppliers = await Supplier.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .maxTimeMS(5000);
    
    const total = await Supplier.countDocuments(filter).maxTimeMS(2000);
    
    // Mask sensitive data
    const maskedSuppliers = suppliers.map(supplier => {
      const masked = { ...supplier };
      if (masked.email) {
        masked.email = maskSensitiveData(masked.email, 'email');
      }
      if (masked.phoneNumber) {
        masked.phoneNumber = maskSensitiveData(masked.phoneNumber, 'phone');
      }
      return masked;
    });
    
    const responseData = {
      suppliers: maskedSuppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
    
    return res.json({
      success: true,
      data: responseData,
      requestId,
      responseTime: Date.now() - startTime
    });
  } catch (err) {
    console.error('[GET /api/suppliers]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch suppliers',
      requestId
    });
  }
};

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
export const getSupplierById = async (req, res) => {
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

    // Validate ID
    if (!validateMongoId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid supplier ID format',
        requestId
      });
    }

    // Check authorization
    if (!checkAuthorization(req.user, 'SUPPLIER_READ')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requestId
      });
    }

    const supplier = await Supplier.findById(req.params.id)
      .lean()
      .maxTimeMS(3000);
      
    if (!supplier) {
      return res.status(404).json({ 
        success: false, 
        error: 'Supplier not found',
        requestId
      });
    }

    return res.json({ 
      success: true, 
      data: supplier,
      requestId
    });
  } catch (err) {
    console.error('[GET /api/suppliers/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch supplier',
      requestId
    });
  }
};

// @desc    Create supplier
// @route   POST /api/suppliers
export const createSupplier = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array(),
        requestId
      });
    }

    // Check authentication
    if (!req.user?._id) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        requestId
      });
    }

    // Check authorization
    if (!checkAuthorization(req.user, 'SUPPLIER_CREATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create suppliers',
        requestId
      });
    }

    const body = req.body;
    
    // Sanitize all inputs
    const sanitizedBody = {
      supplierName: sanitizeXSS(body.supplierName.trim()),
      contactPerson: body.contactPerson ? sanitizeXSS(body.contactPerson.trim()) : '',
      phoneNumber: sanitizeXSS(body.phoneNumber.trim()),
      email: body.email ? sanitizeXSS(body.email.trim().toLowerCase()) : '',
      address: body.address ? sanitizeXSS(body.address.trim()) : '',
      notes: body.notes ? sanitizeXSS(body.notes.trim()) : '',
      status: body.status || 'active',
      createdBy: req.user._id
    };

    // Validate phone
    if (!validatePhoneNumber(sanitizedBody.phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number format',
        requestId
      });
    }

    // Validate email if provided
    if (sanitizedBody.email && !validateEmail(sanitizedBody.email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format',
        requestId
      });
    }

    // Check for duplicate
    const existing = await Supplier.findOne({ 
      supplierName: sanitizedBody.supplierName 
    }).maxTimeMS(3000);
    
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'Supplier name already exists',
        requestId
      });
    }

    // Process ingredients
    const supplierIngredients = (body.supplierIngredients || []).map(ing => ({
      ingredientId: ing.ingredientId && validateMongoId(ing.ingredientId) ? ing.ingredientId : null,
      lastPurchasePrice: Math.max(0, parseFloat(ing.lastPurchasePrice) || 0),
      unit: ing.unit ? sanitizeXSS(ing.unit.trim()) : '',
      isPreferred: !!ing.isPreferred
    })).filter(ing => ing.ingredientId !== null);

    // Create supplier
    const supplierData = {
      ...sanitizedBody,
      supplierIngredients,
      organizationId: req.user.organizationId,
      lastModifiedBy: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId,
      securityHash: generateSecureHash(JSON.stringify(sanitizedBody))
    };

    const supplier = await Supplier.create(supplierData);

    return res.status(201).json({
      success: true,
      data: supplier.toObject(),
      message: 'Supplier created successfully',
      requestId
    });
  } catch (err) {
    console.error('[POST /api/suppliers]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create supplier: ' + err.message,
      requestId
    });
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
export const updateSupplier = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
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

    // Validate ID
    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid supplier ID format',
        requestId
      });
    }

    // Check authentication
    if (!req.user?._id) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        requestId
      });
    }

    // Check authorization
    if (!checkAuthorization(req.user, 'SUPPLIER_UPDATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update suppliers',
        requestId
      });
    }

    const body = req.body;

    // Find existing supplier
    const existingSupplier = await Supplier.findById(id).maxTimeMS(3000);
    if (!existingSupplier) {
      return res.status(404).json({ 
        success: false, 
        error: 'Supplier not found',
        requestId
      });
    }

    // Sanitize inputs
    const sanitizedBody = {
      supplierName: body.supplierName !== undefined ? sanitizeXSS(body.supplierName.trim()) : undefined,
      contactPerson: body.contactPerson !== undefined ? sanitizeXSS(body.contactPerson.trim()) : undefined,
      phoneNumber: body.phoneNumber !== undefined ? sanitizeXSS(body.phoneNumber.trim()) : undefined,
      email: body.email !== undefined ? sanitizeXSS(body.email.trim().toLowerCase()) : undefined,
      address: body.address !== undefined ? sanitizeXSS(body.address.trim()) : undefined,
      notes: body.notes !== undefined ? sanitizeXSS(body.notes.trim()) : undefined,
      status: body.status !== undefined ? body.status : undefined
    };

    // Check duplicate name if changed
    if (sanitizedBody.supplierName && 
        sanitizedBody.supplierName !== existingSupplier.supplierName) {
      const duplicate = await Supplier.findOne({ 
        supplierName: sanitizedBody.supplierName 
      }).maxTimeMS(3000);
      
      if (duplicate) {
        return res.status(409).json({ 
          success: false, 
          error: 'Supplier name already exists',
          requestId
        });
      }
    }

    // Validate phone if provided
    if (sanitizedBody.phoneNumber && !validatePhoneNumber(sanitizedBody.phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number format',
        requestId
      });
    }

    // Validate email if provided
    if (sanitizedBody.email && !validateEmail(sanitizedBody.email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format',
        requestId
      });
    }

    // Process ingredients
    const supplierIngredients = (body.supplierIngredients || []).map(ing => ({
      ingredientId: ing.ingredientId && validateMongoId(ing.ingredientId) ? ing.ingredientId : null,
      lastPurchasePrice: Math.max(0, parseFloat(ing.lastPurchasePrice) || 0),
      unit: ing.unit ? sanitizeXSS(ing.unit.trim()) : '',
      isPreferred: !!ing.isPreferred
    })).filter(ing => ing.ingredientId !== null);

    // Prepare update data
    const updateData = {};
    Object.keys(sanitizedBody).forEach(key => {
      if (sanitizedBody[key] !== undefined) {
        updateData[key] = sanitizedBody[key];
      }
    });
    updateData.supplierIngredients = supplierIngredients;
    updateData.lastModifiedBy = req.user._id;
    updateData.lastModifiedAt = new Date();

    // Update with version control
    const updated = await Supplier.findOneAndUpdate(
      { _id: id, __v: existingSupplier.__v },
      { $set: updateData, $inc: { __v: 1 } },
      { new: true, runValidators: true }
    ).maxTimeMS(5000);

    if (!updated) {
      return res.status(409).json({ 
        success: false, 
        error: 'Supplier was modified by another user. Please refresh and try again.',
        requestId
      });
    }

    return res.json({
      success: true,
      data: updated,
      message: 'Supplier updated successfully',
      requestId
    });
  } catch (err) {
    console.error('[PUT /api/suppliers/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update supplier: ' + err.message,
      requestId
    });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
export const deleteSupplier = async (req, res) => {
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

    // Validate ID
    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid supplier ID format',
        requestId
      });
    }

    // Check admin role for deletion
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions to delete suppliers',
        requestId
      });
    }

    const deleted = await Supplier.findByIdAndDelete(id).maxTimeMS(3000);
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: 'Supplier not found',
        requestId
      });
    }

    return res.json({ 
      success: true, 
      data: null, 
      message: 'Supplier deleted successfully',
      requestId
    });
  } catch (err) {
    console.error('[DELETE /api/suppliers/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete supplier',
      requestId
    });
  }
};

// @desc    Update supplier status
// @route   PATCH /api/suppliers/:id/status
export const updateSupplierStatus = async (req, res) => {
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
    const { status, reason } = req.body;

    // Validate ID
    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid supplier ID format',
        requestId
      });
    }

    // Check authentication
    if (!req.user?._id) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        requestId
      });
    }

    // Check authorization
    if (!checkAuthorization(req.user, 'SUPPLIER_UPDATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update supplier status',
        requestId
      });
    }

    // Build update data
    const updateData = { 
      status, 
      lastModifiedBy: req.user._id,
      lastModifiedAt: new Date()
    };

    // Add reason if provided
    if (reason) {
      updateData.statusReason = sanitizeXSS(reason.trim());
    }

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      { $set: updateData, $inc: { __v: 1 } },
      { new: true, runValidators: true }
    ).maxTimeMS(3000);

    if (!supplier) {
      return res.status(404).json({ 
        success: false, 
        error: 'Supplier not found',
        requestId
      });
    }

    return res.json({
      success: true,
      data: supplier,
      message: `Supplier ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      requestId
    });
  } catch (err) {
    console.error('[PATCH /api/suppliers/:id/status]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update status',
      requestId
    });
  }
};

// ============================================================
//  EXPORTS
// ============================================================

export default {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierStatus
};