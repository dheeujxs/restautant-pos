// controllers/super-admin/categoryController.js - COMPLETE FIXED VERSION

import Category from '../../models/Category.js';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';
import crypto from 'crypto';

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_BULK_DELETE = 50;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
const ALLOWED_IMAGE_REGEX = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

// ─── Security Utilities ──────────────────────────────────────────────────

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
    /(;+\s*$)/g,
    // ✅ FIXED: Properly closed regex with non-capturing group
    /(?:SLEEP|BENCHMARK|WAITFOR)\s*\([^)]*\)/gi,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// XSS Pattern Detection
const checkForXSSPatterns = (str) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;
  
  const patterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /onerror\s*=\s*["']?[^"']*["']?/gi,
    /onload\s*=\s*["']?[^"']*["']?/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /<object[^>]*>[\s\S]*?<\/object>/gi,
    /<embed[^>]*>[\s\S]*?<\/embed>/gi,
    /eval\s*\([^)]*\)/gi,
    /setTimeout\s*\([^)]*\)/gi,
    /setInterval\s*\([^)]*\)/gi,
    /document\s*\.\s*[a-zA-Z]+/gi,
    /window\s*\.\s*[a-zA-Z]+/gi,
    /\.innerHTML\s*=/gi,
    /\.cookie\s*=/gi,
    /localStorage\s*\./gi,
    /sessionStorage\s*\./gi,
    /<svg[^>]*onload\s*=/gi,
    /<img[^>]*onerror\s*=/gi,
    /<body[^>]*onload\s*=/gi,
    /alert\s*\([^)]*\)/gi,
    /prompt\s*\([^)]*\)/gi,
    /confirm\s*\([^)]*\)/gi,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// Generate Secure Hash
const generateSecureHash = (data) => {
  return crypto
    .createHash('sha256')
    .update(data + (process.env.SECURITY_SALT || 'default-salt'))
    .digest('hex');
};

// Validate Image URL
const isValidImageUrl = (imageUrl) => {
  if (!imageUrl) return true;
  
  // Check for XSS in URL
  if (checkForXSSPatterns(imageUrl) || checkForSQLInjection(imageUrl)) {
    return false;
  }
  
  // Base64 image validation
  if (imageUrl.startsWith('data:image')) {
    const base64Data = imageUrl.split(',')[1];
    if (!base64Data) return false;
    // Check size (max 5MB)
    const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
    if (sizeInBytes > MAX_IMAGE_SIZE) return false;
    return true;
  }
  
  // HTTP URL validation with security checks
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /onerror=/i,
      /onload=/i,
      /alert\(/i,
      /prompt\(/i,
      /confirm\(/i,
    ];
    for (const pattern of maliciousPatterns) {
      if (pattern.test(imageUrl)) return false;
    }
    
    // Check for path traversal
    if (imageUrl.includes('..')) return false;
    
    return true;
  }
  
  // File extension check
  if (!ALLOWED_IMAGE_REGEX.test(imageUrl)) return false;
  
  return true;
};

// Rate Limiting
const rateLimiter = new Map();

const checkRateLimit = (ip) => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [key, data] of rateLimiter.entries()) {
    if (data.timestamp < windowStart) {
      rateLimiter.delete(key);
    }
  }
  
  const key = `category:${ip}`;
  const current = rateLimiter.get(key) || { count: 0, timestamp: now };
  
  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  current.count += 1;
  current.timestamp = now;
  rateLimiter.set(key, current);
  return true;
};

// Audit Logger
const logSecurityEvent = async (eventType, userId, details = {}) => {
  try {
    console.log('🔒 SECURITY EVENT:', {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'anonymous',
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      ...details,
    });
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
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
    /nmap/i,
    /burp/i,
    /zap/i,
    /wappalyzer/i,
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
};

// ─── Authorization Helper ──────────────────────────────────────────────
const checkAuthorization = (user, permission) => {
  if (!user) return false;
  
  // Super Admin has all permissions
  if (user.role === 'superadmin') return true;
  
  // Check specific permissions
  const rolePermissions = {
    admin: ['CATEGORY_READ', 'CATEGORY_CREATE', 'CATEGORY_UPDATE'],
    manager: ['CATEGORY_READ'],
    user: ['CATEGORY_READ'],
  };
  
  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
};

// ─── Helpers ──────────────────────────────────────────────────────────
const sanitizeCategory = (category) => {
  if (!category) return null;
  return {
    _id: category._id,
    id: category._id,
    name: sanitizeInput(category.name || ''),
    description: sanitizeInput(category.description || ''),
    image: category.image || '',
    isActive: category.isActive !== false,
    securityHash: category.securityHash || null,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

// ─── GET ALL CATEGORIES ──────────────────────────────────────────────
export const getCategories = async (req, res) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  
  try {
    console.log(`📋 [${requestId}] Super Admin: Fetching categories...`);
    
    // ─── Security Checks ──────────────────────────────────────────────
    
    // Check rate limit
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(clientIp)) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', req.admin?._id, {
        ip: clientIp,
        requestId,
      });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        requestId,
      });
    }
    
    // Check for bot traffic
    if (checkForBotTraffic(req)) {
      await logSecurityEvent('BOT_TRAFFIC_DETECTED', req.admin?._id, {
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        requestId,
      });
      return res.status(403).json({
        success: false,
        error: 'Bot traffic detected',
        requestId,
      });
    }
    
    // Check authorization
    if (!checkAuthorization(req.admin, 'CATEGORY_READ')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view categories',
        requestId,
      });
    }
    
    // ─── Validate Query Parameters ────────────────────────────────────
    const { search, isActive, page = 1, limit = 20 } = req.query;
    
    // Validate and sanitize search
    let sanitizedSearch = '';
    if (search) {
      const rawSearch = String(search).trim();
      if (checkForSQLInjection(rawSearch) || checkForXSSPatterns(rawSearch)) {
        await logSecurityEvent('SQL_INJECTION_ATTEMPT', req.admin?._id, {
          ip: clientIp,
          search: rawSearch,
          requestId,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid search query',
          requestId,
        });
      }
      sanitizedSearch = sanitizeInput(rawSearch);
    }
    
    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter with validation
    const filter = {};
    if (sanitizedSearch) {
      filter.name = { $regex: sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // ─── Execute Query ────────────────────────────────────────────────
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .maxTimeMS(5000),
      Category.countDocuments(filter).maxTimeMS(2000),
    ]);
    
    // ─── Sanitize Response ────────────────────────────────────────────
    const sanitizedCategories = categories.map(sanitizeCategory);
    
    // ─── Log Success ──────────────────────────────────────────────────
    console.log(`✅ [${requestId}] Found ${sanitizedCategories.length} categories`);
    
    res.status(200).json({
      success: true,
      data: {
        categories: sanitizedCategories,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        count: sanitizedCategories.length,
      },
      requestId,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Get Categories Error:`, error);
    
    await logSecurityEvent('ERROR', req.admin?._id, {
      error: error.message,
      requestId,
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      requestId,
    });
  }
};

// ─── GET CATEGORY BY ID ──────────────────────────────────────────────
export const getCategoryById = async (req, res) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  
  try {
    console.log(`📋 [${requestId}] Super Admin: Fetching category by ID...`);
    
    const { id } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ─── Security Checks ──────────────────────────────────────────────
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        requestId,
      });
    }
    
    // Check authorization
    if (!checkAuthorization(req.admin, 'CATEGORY_READ')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view category',
        requestId,
      });
    }
    
    // Validate ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
        requestId,
      });
    }
    
    // ─── Execute Query ────────────────────────────────────────────────
    const category = await Category.findById(id)
      .lean()
      .maxTimeMS(3000);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        requestId,
      });
    }
    
    // ─── Sanitize Response ────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: sanitizeCategory(category),
      requestId,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Get Category Error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
      requestId,
    });
  }
};

// ─── CREATE CATEGORY ──────────────────────────────────────────────────
export const createCategory = async (req, res) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  
  try {
    console.log(`📝 [${requestId}] Super Admin: Creating category...`);
    
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    // ─── Security Checks ──────────────────────────────────────────────
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        requestId,
      });
    }
    
    // Check for bot traffic
    if (checkForBotTraffic(req)) {
      await logSecurityEvent('BOT_TRAFFIC_DETECTED', adminId, {
        ip: clientIp,
        userAgent,
        requestId,
      });
      return res.status(403).json({
        success: false,
        error: 'Bot traffic detected',
        requestId,
      });
    }
    
    // Check authorization
    if (!checkAuthorization(req.admin, 'CATEGORY_CREATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create categories',
        requestId,
      });
    }
    
    // ─── Sanitize Input ──────────────────────────────────────────────
    const body = sanitizeObject(req.body);
    const { name, description, image, isActive } = body;
    
    // ─── Validate Inputs ──────────────────────────────────────────────
    
    // Validate name - with security checks
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required',
        requestId,
      });
    }
    
    const sanitizedName = sanitizeInput(name.trim());
    if (checkForSQLInjection(sanitizedName) || checkForXSSPatterns(sanitizedName)) {
      await logSecurityEvent('SQL_INJECTION_ATTEMPT', adminId, {
        ip: clientIp,
        field: 'name',
        value: name,
        requestId,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid category name detected',
        requestId,
      });
    }
    
    if (!isValidName(sanitizedName)) {
      return res.status(400).json({
        success: false,
        error: `Category name must be between 1 and ${MAX_NAME_LENGTH} characters`,
        requestId,
      });
    }
    
    // Validate description with security checks
    let sanitizedDescription = '';
    if (description) {
      sanitizedDescription = sanitizeInput(description.trim());
      if (checkForSQLInjection(sanitizedDescription) || checkForXSSPatterns(sanitizedDescription)) {
        await logSecurityEvent('SQL_INJECTION_ATTEMPT', adminId, {
          ip: clientIp,
          field: 'description',
          value: description,
          requestId,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid description detected',
          requestId,
        });
      }
      
      if (!isValidText(sanitizedDescription, MAX_DESCRIPTION_LENGTH)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
          requestId,
        });
      }
    }
    
    // Validate image with security checks
    if (image && !isValidImageUrl(image)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Allowed: JPG, JPEG, PNG, WebP, GIF, SVG. Maximum size: 5MB.',
        requestId,
      });
    }
    
    // ─── Check for Duplicate ──────────────────────────────────────────
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') }
    }).maxTimeMS(3000);
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Category '${sanitizedName}' already exists`,
        requestId,
      });
    }
    
    // ─── Create Category ──────────────────────────────────────────────
    const categoryData = {
      name: sanitizedName,
      description: sanitizedDescription,
      image: image || '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      securityHash: generateSecureHash(JSON.stringify({
        name: sanitizedName,
        description: sanitizedDescription,
        image: image || '',
        createdBy: adminId,
        timestamp: Date.now(),
      })),
    };
    
    const category = await Category.create(categoryData);
    
    // ─── Log Security Event ──────────────────────────────────────────
    await logSecurityEvent('CATEGORY_CREATED', adminId, {
      categoryId: category._id,
      categoryName: category.name,
      ip: clientIp,
      userAgent,
      requestId,
    });
    
    console.log(`✅ [${requestId}] Super Admin: Category created: ${category.name}`);
    
    res.status(201).json({
      success: true,
      data: sanitizeCategory(category),
      message: 'Category created successfully',
      requestId,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Create Category Error:`, error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Category with this name already exists',
        requestId,
      });
    }
    
    await logSecurityEvent('ERROR', req.admin?._id, {
      error: error.message,
      requestId,
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      requestId,
    });
  }
};

// ─── UPDATE CATEGORY ──────────────────────────────────────────────────
export const updateCategory = async (req, res) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  
  try {
    console.log(`✏️ [${requestId}] Super Admin: Updating category...`);
    
    const { id } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    const body = sanitizeObject(req.body);
    
    // ─── Security Checks ──────────────────────────────────────────────
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        requestId,
      });
    }
    
    // Check authorization
    if (!checkAuthorization(req.admin, 'CATEGORY_UPDATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update categories',
        requestId,
      });
    }
    
    // Validate ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
        requestId,
      });
    }
    
    // ─── Find Category with Version Control ──────────────────────────
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        requestId,
      });
    }
    
    // ─── Validate and Prepare Update Data ─────────────────────────────
    const updateData = {};
    let hasChanges = false;
    
    // Validate name
    if (body.name !== undefined) {
      const sanitizedName = sanitizeInput(body.name.trim());
      
      if (checkForSQLInjection(sanitizedName) || checkForXSSPatterns(sanitizedName)) {
        await logSecurityEvent('SQL_INJECTION_ATTEMPT', adminId, {
          ip: clientIp,
          field: 'name',
          value: body.name,
          requestId,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid category name detected',
          requestId,
        });
      }
      
      if (!isValidName(sanitizedName)) {
        return res.status(400).json({
          success: false,
          error: `Category name must be between 1 and ${MAX_NAME_LENGTH} characters`,
          requestId,
        });
      }
      
      // Check duplicate name
      const duplicate = await Category.findOne({
        name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') },
        _id: { $ne: id }
      }).maxTimeMS(3000);
      
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: `Category '${sanitizedName}' already exists`,
          requestId,
        });
      }
      
      updateData.name = sanitizedName;
      hasChanges = true;
    }
    
    // Validate description
    if (body.description !== undefined) {
      const sanitizedDescription = body.description ? sanitizeInput(body.description.trim()) : '';
      
      if (checkForSQLInjection(sanitizedDescription) || checkForXSSPatterns(sanitizedDescription)) {
        await logSecurityEvent('SQL_INJECTION_ATTEMPT', adminId, {
          ip: clientIp,
          field: 'description',
          value: body.description,
          requestId,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid description detected',
          requestId,
        });
      }
      
      if (sanitizedDescription && !isValidText(sanitizedDescription, MAX_DESCRIPTION_LENGTH)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
          requestId,
        });
      }
      
      updateData.description = sanitizedDescription;
      hasChanges = true;
    }
    
    // Validate image
    if (body.image !== undefined) {
      if (body.image && !isValidImageUrl(body.image)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image format. Allowed: JPG, JPEG, PNG, WebP, GIF, SVG. Maximum size: 5MB.',
          requestId,
        });
      }
      updateData.image = body.image || '';
      hasChanges = true;
    }
    
    // Validate isActive
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
          requestId,
        });
      }
      updateData.isActive = body.isActive;
      hasChanges = true;
    }
    
    // ─── Check if any changes ──────────────────────────────────────────
    if (!hasChanges) {
      return res.status(400).json({
        success: false,
        error: 'No changes detected',
        requestId,
      });
    }
    
    // ─── Update with Version Control ──────────────────────────────────
    const updated = await Category.findOneAndUpdate(
      { _id: id, __v: category.__v },
      { 
        $set: updateData,
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(409).json({
        success: false,
        error: 'Category was modified by another user. Please refresh and try again.',
        requestId,
      });
    }
    
    // ─── Log Security Event ──────────────────────────────────────────
    await logSecurityEvent('CATEGORY_UPDATED', adminId, {
      categoryId: updated._id,
      categoryName: updated.name,
      updatedFields: Object.keys(updateData),
      ip: clientIp,
      requestId,
    });
    
    console.log(`✅ [${requestId}] Super Admin: Category updated: ${updated.name}`);
    
    res.status(200).json({
      success: true,
      data: sanitizeCategory(updated),
      message: 'Category updated successfully',
      requestId,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Update Category Error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category',
      requestId,
    });
  }
};

// ─── DELETE CATEGORY ──────────────────────────────────────────────────
export const deleteCategory = async (req, res) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  
  try {
    console.log(`🗑️ [${requestId}] Super Admin: Deleting category...`);
    
    const { id } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ─── Security Checks ──────────────────────────────────────────────
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        requestId,
      });
    }
    
    // Check authorization (only super admin can delete)
    if (req.admin?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete categories',
        requestId,
      });
    }
    
    // Validate ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
        requestId,
      });
    }
    
    // ─── Find Category ──────────────────────────────────────────────────
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        requestId,
      });
    }
    
    // ─── Check if category has dishes ──────────────────────────────────
    const Dish = (await import('../../models/Dish.js')).default;
    const dishCount = await Dish.countDocuments({ categoryId: id }).maxTimeMS(3000);
    
    if (dishCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${dishCount} dish(es) associated. Please reassign or delete the dishes first.`,
        requestId,
      });
    }
    
    // ─── Delete with Version Control ──────────────────────────────────
    const deleted = await Category.findOneAndDelete({ _id: id, __v: category.__v });
    
    if (!deleted) {
      return res.status(409).json({
        success: false,
        error: 'Category was modified by another user. Please refresh and try again.',
        requestId,
      });
    }
    
    // ─── Log Security Event ──────────────────────────────────────────
    await logSecurityEvent('CATEGORY_DELETED', adminId, {
      categoryId: category._id,
      categoryName: category.name,
      ip: clientIp,
      requestId,
    });
    
    console.log(`✅ [${requestId}] Super Admin: Category deleted: ${category.name}`);
    
    res.status(200).json({
      success: true,
      message: `Category '${category.name}' deleted successfully`,
      requestId,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Delete Category Error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
      requestId,
    });
  }
};

// ─── TOGGLE CATEGORY STATUS ──────────────────────────────────────────
export const toggleCategoryStatus = async (req, res) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  
  try {
    console.log(`🔄 [${requestId}] Super Admin: Toggling category status...`);
    
    const { id } = req.params;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ─── Security Checks ──────────────────────────────────────────────
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        requestId,
      });
    }
    
    // Check authorization
    if (!checkAuthorization(req.admin, 'CATEGORY_UPDATE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update category status',
        requestId,
      });
    }
    
    // Validate ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
        requestId,
      });
    }
    
    // ─── Find Category ──────────────────────────────────────────────────
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        requestId,
      });
    }
    
    // ─── Toggle Status with Version Control ──────────────────────────
    const newStatus = !category.isActive;
    
    const updated = await Category.findOneAndUpdate(
      { _id: id, __v: category.__v },
      {
        $set: { 
          isActive: newStatus,
        },
        $inc: { __v: 1 },
      },
      { new: true }
    );
    
    if (!updated) {
      return res.status(409).json({
        success: false,
        error: 'Category was modified by another user. Please refresh and try again.',
        requestId,
      });
    }
    
    // ─── Log Security Event ──────────────────────────────────────────
    await logSecurityEvent('CATEGORY_STATUS_TOGGLED', adminId, {
      categoryId: updated._id,
      categoryName: updated.name,
      newStatus: newStatus,
      ip: clientIp,
      requestId,
    });
    
    console.log(`✅ [${requestId}] Super Admin: Category ${newStatus ? 'activated' : 'deactivated'}: ${updated.name}`);
    
    res.status(200).json({
      success: true,
      data: sanitizeCategory(updated),
      message: `Category ${newStatus ? 'activated' : 'deactivated'} successfully`,
      requestId,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Toggle Category Status Error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle category status',
      requestId,
    });
  }
};

// ─── BULK DELETE CATEGORIES ──────────────────────────────────────────
export const bulkDeleteCategories = async (req, res) => {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  
  try {
    console.log(`🗑️ [${requestId}] Super Admin: Bulk deleting categories...`);
    
    const { ids } = req.body;
    const adminId = req.admin?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // ─── Security Checks ──────────────────────────────────────────────
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        requestId,
      });
    }
    
    // Check authorization (only super admin can bulk delete)
    if (req.admin?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to bulk delete categories',
        requestId,
      });
    }
    
    // Validate IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of category IDs',
        requestId,
      });
    }
    
    if (ids.length > MAX_BULK_DELETE) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_BULK_DELETE} categories can be deleted at once`,
        requestId,
      });
    }
    
    // Validate all IDs
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ID format: ${invalidIds.join(', ')}`,
        requestId,
      });
    }
    
    // ─── Check for categories with dishes ──────────────────────────────
    const Dish = (await import('../../models/Dish.js')).default;
    const categoriesWithDishes = await Dish.find({
      categoryId: { $in: ids }
    }).distinct('categoryId').maxTimeMS(3000);
    
    if (categoriesWithDishes.length > 0) {
      const categoryNames = await Category.find({
        _id: { $in: categoriesWithDishes }
      }).select('name').lean();
      
      return res.status(400).json({
        success: false,
        error: `Cannot delete categories that have dishes. Categories with dishes: ${categoryNames.map(c => c.name).join(', ')}`,
        requestId,
      });
    }
    
    // ─── Delete Categories ────────────────────────────────────────────
    const result = await Category.deleteMany({
      _id: { $in: ids },
      isDeleted: { $ne: true } // Only delete non-deleted categories
    });
    
    // ─── Log Security Event ──────────────────────────────────────────
    await logSecurityEvent('BULK_CATEGORY_DELETED', adminId, {
      count: result.deletedCount,
      ids: ids,
      ip: clientIp,
      requestId,
    });
    
    console.log(`✅ [${requestId}] Super Admin: ${result.deletedCount} categories deleted`);
    
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} categories deleted successfully`,
      requestId,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Bulk Delete Categories Error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete categories',
      requestId,
    });
  }
};