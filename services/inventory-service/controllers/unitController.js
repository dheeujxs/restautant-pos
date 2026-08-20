// controllers/unitController.js - FIXED

import Unit from '../models/Unit.js';
import { validationResult, body, param, query } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto'; // ✅ ADD THIS IMPORT

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

// Check for Bot Traffic (Optional - can be removed for public routes)
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

// ✅ FIXED: Generate Secure Hash - using imported crypto
const generateSecureHash = (data) => {
  return crypto
    .createHash('sha256')
    .update(data + (process.env.SECURITY_SALT || 'default-salt'))
    .digest('hex');
};

// ============================================================
//  AUTHORIZATION HELPER
// ============================================================

const checkAuthorization = (user, permission) => {
  // ✅ Allow public read access for UNIT_READ permission
  if (permission === 'UNIT_READ' && !user) {
    return true;
  }
  
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  const rolePermissions = {
    manager: ['UNIT_READ', 'UNIT_CREATE', 'UNIT_UPDATE'],
    user: ['UNIT_READ'],
    auditor: ['UNIT_READ']
  };
  
  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
};

// ============================================================
//  VALIDATION MIDDLEWARE
// ============================================================

export const validateUnit = [
  // Payload size and depth validation
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

  body('name')
    .trim()
    .notEmpty().withMessage('Unit name is required')
    .isLength({ min: 1, max: 50 }).withMessage('Unit name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_.()]+$/).withMessage('Unit name contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (checkForSQLInjection(value) || checkForXSSPatterns(value)) {
        throw new Error('Unit name contains malicious patterns');
      }
      return true;
    }),
  
  body('symbol')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Unit symbol too long')
    .matches(/^[a-zA-Z0-9\s\-_.()°]+$/).withMessage('Unit symbol contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Unit symbol contains malicious patterns');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description too long')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Description contains malicious patterns');
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean value')
    .toBoolean(),
  
  body('conversionFactor')
    .optional()
    .isFloat({ min: 0, max: 999999.99 }).withMessage('Conversion factor must be a valid number')
    .toFloat(),
  
  body('baseUnit')
    .optional()
    .isMongoId().withMessage('Invalid base unit ID format')
    .custom((value) => {
      if (value && !validateMongoId(value)) {
        throw new Error('Invalid base unit ID format');
      }
      return true;
    })
];

export const validateUnitUpdate = [
  // Payload size and depth validation
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

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Unit name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_.()]+$/).withMessage('Unit name contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Unit name contains malicious patterns');
      }
      return true;
    }),
  
  body('symbol')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Unit symbol too long')
    .matches(/^[a-zA-Z0-9\s\-_.()°]+$/).withMessage('Unit symbol contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Unit symbol contains malicious patterns');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description too long')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Description contains malicious patterns');
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean value')
    .toBoolean(),
  
  body('conversionFactor')
    .optional()
    .isFloat({ min: 0, max: 999999.99 }).withMessage('Conversion factor must be a valid number')
    .toFloat(),
  
  body('baseUnit')
    .optional()
    .isMongoId().withMessage('Invalid base unit ID format')
    .custom((value) => {
      if (value && !validateMongoId(value)) {
        throw new Error('Invalid base unit ID format');
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

export const validateGetUnits = [
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
  
  query('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean value')
    .toBoolean(),
  
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
    .toInt()
];

// ============================================================
//  CONTROLLER FUNCTIONS
// ============================================================

// @desc    Get all units (PUBLIC)
// @route   GET /api/units
export const getUnits = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    // Validate request
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: validationErrors.array(),
        requestId
      });
    }

    const search = req.query.search || '';
    const isActive = req.query.isActive;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    
    const filter = {};
    
    // Build filter with security
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
    
    if (isActive !== undefined) {
      filter.isActive = Boolean(isActive);
    }
    
    // Add organization filter for multi-tenant (only if user is authenticated)
    if (req.user?.organizationId) {
      filter.organizationId = req.user.organizationId;
    }
    
    // Query with timeout
    const units = await Unit.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .maxTimeMS(5000);
    
    const total = await Unit.countDocuments(filter).maxTimeMS(2000);
    
    return res.json({ 
      success: true, 
      data: { 
        units,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      requestId,
      responseTime: Date.now() - startTime
    });
  } catch (err) {
    console.error('[GET /api/units]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch units',
      requestId
    });
  }
};

// @desc    Get single unit (PUBLIC)
// @route   GET /api/units/:id
export const getUnitById = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: validationErrors.array(),
        requestId
      });
    }

    const { id } = req.params;

    // Validate ID
    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid unit ID format',
        requestId
      });
    }

    const unit = await Unit.findById(id).lean().maxTimeMS(3000);
    if (!unit) {
      return res.status(404).json({ 
        success: false, 
        error: 'Unit not found',
        requestId
      });
    }

    return res.json({ 
      success: true, 
      data: unit,
      requestId
    });
  } catch (err) {
    console.error('[GET /api/units/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch unit',
      requestId
    });
  }
};

// @desc    Get unit by symbol (PUBLIC)
// @route   GET /api/units/symbol/:symbol
export const getUnitBySymbol = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: validationErrors.array(),
        requestId
      });
    }

    const { symbol } = req.params;

    // Validate symbol
    const sanitizedSymbol = sanitizeXSS(symbol.trim());
    if (!sanitizedSymbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
        requestId
      });
    }

    const filter = { 
      symbol: { $regex: `^${sanitizedSymbol}$`, $options: 'i' }
    };
    
    // Add organization filter for multi-tenant (only if user is authenticated)
    if (req.user?.organizationId) {
      filter.organizationId = req.user.organizationId;
    }

    const unit = await Unit.findOne(filter).lean().maxTimeMS(3000);
    
    if (!unit) {
      return res.status(404).json({ 
        success: false, 
        error: 'Unit not found',
        requestId
      });
    }

    return res.json({ 
      success: true, 
      data: unit,
      requestId
    });
  } catch (err) {
    console.error('[GET /api/units/symbol/:symbol]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch unit',
      requestId
    });
  }
};

// ============================================================
//  PROTECTED CONTROLLER FUNCTIONS (Require Authentication)
// ============================================================

// @desc    Create unit
// @route   POST /api/units
export const createUnit = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    // Validate request
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: validationErrors.array(),
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
    if (!checkAuthorization(req.user, 'UNIT_CREATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create units',
        requestId
      });
    }

    const { name, symbol, description, isActive, conversionFactor, baseUnit } = req.body;

    // Sanitize inputs
    const sanitizedName = sanitizeXSS(name.trim());
    const sanitizedSymbol = symbol ? sanitizeXSS(symbol.trim()) : '';
    const sanitizedDescription = description ? sanitizeXSS(description.trim()) : '';

    // Validate name
    if (!sanitizedName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Unit name is required',
        requestId
      });
    }

    // Check for duplicate with case-insensitive
    const existing = await Unit.findOne({ 
      name: { $regex: `^${sanitizedName}$`, $options: 'i' }
    }).maxTimeMS(3000);
    
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: `Unit '${sanitizedName}' already exists`,
        requestId
      });
    }

    // Check symbol duplicate if provided
    if (sanitizedSymbol) {
      const symbolExists = await Unit.findOne({ 
        symbol: { $regex: `^${sanitizedSymbol}$`, $options: 'i' }
      }).maxTimeMS(3000);
      
      if (symbolExists) {
        return res.status(409).json({ 
          success: false, 
          error: `Unit symbol '${sanitizedSymbol}' already exists`,
          requestId
        });
      }
    }

    // Validate baseUnit if provided
    if (baseUnit && !validateMongoId(baseUnit)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid base unit ID format',
        requestId
      });
    }

    // Build unit data
    const unitData = {
      name: sanitizedName,
      symbol: sanitizedSymbol,
      description: sanitizedDescription,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user._id,
      organizationId: req.user.organizationId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId,
    };

    // ✅ Add securityHash after unitData is fully defined
    unitData.securityHash = generateSecureHash(JSON.stringify({
      name: sanitizedName,
      symbol: sanitizedSymbol,
      description: sanitizedDescription
    }));

    // Add optional fields
    if (conversionFactor !== undefined) {
      unitData.conversionFactor = Math.max(0, parseFloat(conversionFactor) || 1);
    }
    if (baseUnit) {
      unitData.baseUnit = baseUnit;
    }

    const unit = await Unit.create(unitData);

    return res.status(201).json({ 
      success: true, 
      data: unit.toObject(), 
      message: 'Unit created successfully',
      requestId
    });
  } catch (err) {
    console.error('[POST /api/units]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create unit: ' + err.message,
      requestId
    });
  }
};

// @desc    Update unit
// @route   PUT /api/units/:id
export const updateUnit = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: validationErrors.array(),
        requestId
      });
    }

    const { id } = req.params;

    // Validate ID
    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid unit ID format',
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
    if (!checkAuthorization(req.user, 'UNIT_UPDATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update units',
        requestId
      });
    }

    const { name, symbol, description, isActive, conversionFactor, baseUnit } = req.body;

    // Find existing unit with version control
    const existingUnit = await Unit.findById(id).maxTimeMS(3000);
    if (!existingUnit) {
      return res.status(404).json({ 
        success: false, 
        error: 'Unit not found',
        requestId
      });
    }

    // Prepare update data
    const updateData = {};
    const sanitizedFields = ['name', 'symbol', 'description'];
    
    for (const field of sanitizedFields) {
      if (req.body[field] !== undefined) {
        const sanitized = sanitizeXSS(req.body[field].trim());
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

    // Check name duplicate if changed
    if (updateData.name && updateData.name !== existingUnit.name) {
      const duplicate = await Unit.findOne({ 
        name: { $regex: `^${updateData.name}$`, $options: 'i' },
        _id: { $ne: id }
      }).maxTimeMS(3000);
      
      if (duplicate) {
        return res.status(409).json({ 
          success: false, 
          error: `Unit '${updateData.name}' already exists`,
          requestId
        });
      }
    }

    // Check symbol duplicate if changed
    if (updateData.symbol && updateData.symbol !== existingUnit.symbol) {
      const symbolDuplicate = await Unit.findOne({ 
        symbol: { $regex: `^${updateData.symbol}$`, $options: 'i' },
        _id: { $ne: id }
      }).maxTimeMS(3000);
      
      if (symbolDuplicate) {
        return res.status(409).json({ 
          success: false, 
          error: `Unit symbol '${updateData.symbol}' already exists`,
          requestId
        });
      }
    }

    // Boolean fields
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    // Numeric fields
    if (conversionFactor !== undefined) {
      const factor = parseFloat(conversionFactor);
      if (!isNaN(factor) && factor >= 0) {
        updateData.conversionFactor = factor;
      }
    }

    // Base unit validation
    if (baseUnit !== undefined) {
      if (baseUnit && !validateMongoId(baseUnit)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid base unit ID format',
          requestId
        });
      }
      updateData.baseUnit = baseUnit || null;
    }

    // Add audit fields
    updateData.lastModifiedBy = req.user._id;
    updateData.lastModifiedAt = new Date();

    // Update with version control
    const updated = await Unit.findOneAndUpdate(
      { _id: id, __v: existingUnit.__v },
      { $set: updateData, $inc: { __v: 1 } },
      { new: true, runValidators: true }
    ).maxTimeMS(5000);

    if (!updated) {
      return res.status(409).json({
        success: false,
        error: 'Unit was modified by another user. Please refresh and try again.',
        requestId
      });
    }

    return res.json({ 
      success: true, 
      data: updated, 
      message: 'Unit updated successfully',
      requestId
    });
  } catch (err) {
    console.error('[PATCH /api/units/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update unit: ' + err.message,
      requestId
    });
  }
};

// @desc    Delete unit
// @route   DELETE /api/units/:id
export const deleteUnit = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: validationErrors.array(),
        requestId
      });
    }

    const { id } = req.params;

    // Validate ID
    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid unit ID format',
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

    // Check authorization (only admin)
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions to delete units',
        requestId
      });
    }

    // Use version control for deletion
    const existingUnit = await Unit.findById(id).maxTimeMS(3000);
    if (!existingUnit) {
      return res.status(404).json({ 
        success: false, 
        error: 'Unit not found',
        requestId
      });
    }

    await Unit.findOneAndDelete({ _id: id, __v: existingUnit.__v }).maxTimeMS(3000);

    return res.json({ 
      success: true, 
      data: null, 
      message: 'Unit deleted successfully',
      requestId
    });
  } catch (err) {
    console.error('[DELETE /api/units/:id]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete unit',
      requestId
    });
  }
};

// @desc    Toggle unit status
// @route   PATCH /api/units/:id/toggle
export const toggleUnitStatus = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: validationErrors.array(),
        requestId
      });
    }

    const { id } = req.params;

    // Validate ID
    if (!validateMongoId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid unit ID format',
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
    if (!checkAuthorization(req.user, 'UNIT_UPDATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update units',
        requestId
      });
    }

    const unit = await Unit.findById(id).maxTimeMS(3000);
    if (!unit) {
      return res.status(404).json({ 
        success: false, 
        error: 'Unit not found',
        requestId
      });
    }

    // Toggle status
    const newStatus = !unit.isActive;
    
    const updated = await Unit.findOneAndUpdate(
      { _id: id, __v: unit.__v },
      { 
        $set: { 
          isActive: newStatus,
          lastModifiedBy: req.user._id,
          lastModifiedAt: new Date()
        },
        $inc: { __v: 1 }
      },
      { new: true }
    ).maxTimeMS(3000);

    if (!updated) {
      return res.status(409).json({
        success: false,
        error: 'Unit was modified by another user. Please try again.',
        requestId
      });
    }

    return res.json({ 
      success: true, 
      data: updated, 
      message: `Unit ${newStatus ? 'activated' : 'deactivated'} successfully`,
      requestId
    });
  } catch (err) {
    console.error('[PATCH /api/units/:id/toggle]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to toggle unit status',
      requestId
    });
  }
};

// @desc    Bulk create units
// @route   POST /api/units/bulk
export const bulkCreateUnits = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: validationErrors.array(),
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
    if (!checkAuthorization(req.user, 'UNIT_CREATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create units',
        requestId
      });
    }

    const { units } = req.body;

    if (!Array.isArray(units) || units.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Units array is required',
        requestId
      });
    }

    if (units.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 units can be created at once',
        requestId
      });
    }

    const createdUnits = [];
    const bulkErrors = [];

    for (const [index, unitData] of units.entries()) {
      try {
        const sanitizedName = sanitizeXSS(unitData.name.trim());
        
        // Check if unit exists
        const exists = await Unit.findOne({ 
          name: { $regex: `^${sanitizedName}$`, $options: 'i' }
        }).maxTimeMS(3000);
        
        if (exists) {
          bulkErrors.push(`Unit at index ${index}: '${sanitizedName}' already exists`);
          continue;
        }

        const unit = await Unit.create({
          name: sanitizedName,
          symbol: unitData.symbol ? sanitizeXSS(unitData.symbol.trim()) : '',
          description: unitData.description ? sanitizeXSS(unitData.description.trim()) : '',
          isActive: unitData.isActive !== undefined ? Boolean(unitData.isActive) : true,
          createdBy: req.user._id,
          organizationId: req.user.organizationId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId
        });

        createdUnits.push(unit);
      } catch (err) {
        bulkErrors.push(`Unit at index ${index}: ${err.message}`);
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        created: createdUnits,
        errors: bulkErrors.length > 0 ? bulkErrors : undefined,
        total: createdUnits.length
      },
      message: `${createdUnits.length} units created successfully`,
      requestId
    });
  } catch (err) {
    console.error('[POST /api/units/bulk]', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create units: ' + err.message,
      requestId
    });
  }
};

// ============================================================
//  EXPORTS
// ============================================================

export default {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  toggleUnitStatus,
  bulkCreateUnits,
  getUnitBySymbol
};