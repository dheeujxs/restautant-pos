// controllers/uploadController.js - UNLIMITED FILE SIZE VERSION

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import { validationResult, body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

dotenv.config();

// ============================================================
//  DEBUG: Check Cloudinary credentials
// ============================================================
console.log('🔍 Cloudinary Config Check:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

// ============================================================
//  SECURITY UTILITIES
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

// Validate file type
const validateFileType = (mimetype) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'image/svg+xml',
    'image/bmp',
    'image/tiff'
  ];
  return allowedTypes.includes(mimetype);
};

// ✅ REMOVED: File size validation - no limit
const validateFileSize = (size) => {
  // Always return true - no file size limit
  return true;
};

// Generate secure filename
const generateSecureFilename = (originalname) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const sanitizedName = sanitizeXSS(originalname.replace(/\s+/g, '_'));
  return `${timestamp}-${random}-${sanitizedName}`;
};

// Check for bot traffic
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

// ============================================================
//  AUTHORIZATION HELPER
// ============================================================

const checkAuthorization = (user, permission) => {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin') return true;
  
  const rolePermissions = {
    manager: ['IMAGE_UPLOAD', 'IMAGE_DELETE'],
    user: ['IMAGE_UPLOAD'],
    auditor: ['IMAGE_READ']
  };
  
  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
};

// ============================================================
//  VALIDATION MIDDLEWARE
// ============================================================

export const validateImageUpload = [
  body('folder')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Folder name too long')
    .matches(/^[a-zA-Z0-9\-_.]+$/).withMessage('Folder name contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Folder name contains malicious patterns');
      }
      return true;
    }),
  
  body('publicId')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Public ID too long')
    .matches(/^[a-zA-Z0-9\-_.]+$/).withMessage('Public ID contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        throw new Error('Public ID contains malicious patterns');
      }
      return true;
    }),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .isArray({ max: 20 }).withMessage('Maximum 20 tags allowed')
    .custom((tags) => {
      if (!tags) return true;
      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.length > 50) {
          throw new Error('Each tag must be a string with maximum 50 characters');
        }
        if (checkForSQLInjection(tag) || checkForXSSPatterns(tag)) {
          throw new Error('Tag contains malicious patterns');
        }
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
    })
];

export const validateImageDelete = [
  body('publicId')
    .notEmpty().withMessage('Public ID is required')
    .trim()
    .isLength({ max: 200 }).withMessage('Public ID too long')
    .matches(/^[a-zA-Z0-9\-_.\/]+$/).withMessage('Public ID contains invalid characters')
    .customSanitizer(value => sanitizeXSS(value))
    .custom((value) => {
      if (checkForSQLInjection(value) || checkForXSSPatterns(value)) {
        throw new Error('Public ID contains malicious patterns');
      }
      return true;
    })
];

// ============================================================
//  CLOUDINARY CONFIGURATION
// ============================================================

// Validate Cloudinary credentials
const validateCloudinaryConfig = () => {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing Cloudinary environment variables:', missing.join(', '));
    return false;
  }
  return true;
};

// Configure Cloudinary with security
if (validateCloudinaryConfig()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 30000,
  });
  console.log('✅ Cloudinary configured successfully');
}

// ============================================================
//  SECURE STORAGE CONFIGURATION
// ============================================================

// Create storage with better error handling
let storage;
try {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: (req, file) => {
        const folder = req.body?.folder || 'restaurant-dishes';
        const sanitized = sanitizeXSS(folder);
        return sanitized.replace(/\.\./g, '').replace(/\/\//g, '/');
      },
      public_id: (req, file) => {
        const customId = req.body?.publicId;
        if (customId) {
          const sanitized = sanitizeXSS(customId);
          if (checkForSQLInjection(sanitized) || checkForXSSPatterns(sanitized)) {
            throw new Error('Public ID contains malicious patterns');
          }
          return `${sanitized}-${Date.now()}`;
        }
        return generateSecureFilename(file.originalname);
      },
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff'],
      transformation: [
        { 
          width: 1920, 
          height: 1920, 
          crop: 'limit', 
          quality: 'auto:good',
          fetch_format: 'auto',
        }
      ],
    },
  });
  console.log('✅ Cloudinary storage configured');
} catch (error) {
  console.error('❌ Failed to configure Cloudinary storage:', error.message);
}

// ✅ UNLIMITED: Create multer upload instance with no file size limit
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (effectively unlimited for images)
    files: 5,
    fieldSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    try {
      if (!file) {
        return cb(new Error('No file provided'));
      }

      if (!validateFileType(file.mimetype)) {
        return cb(new Error('Only JPG, PNG, WEBP, GIF, SVG, BMP, and TIFF images are allowed'));
      }

      // ✅ SKIP file size validation - always pass
      // Just log the size for debugging
      const sizeInMB = file.size ? (file.size / 1024 / 1024).toFixed(2) : 'unknown';
      console.log(`📊 File size: ${sizeInMB}MB`);

      const sanitizedName = sanitizeXSS(file.originalname);
      if (sanitizedName !== file.originalname) {
        file.originalname = sanitizedName;
      }

      if (checkForSQLInjection(file.originalname) || checkForXSSPatterns(file.originalname)) {
        return cb(new Error('Filename contains malicious patterns'));
      }

      cb(null, true);
    } catch (error) {
      cb(new Error('File validation failed: ' + error.message));
    }
  },
});

// Create upload middleware instances
export const uploadSingleImage = upload.single('image');
export const uploadMultipleImages = upload.array('images', 5);
export const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

// ============================================================
//  CONTROLLER FUNCTIONS
// ============================================================

// @desc    Upload single image
// @route   POST /api/upload
export const uploadImage = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    console.log('📤 Upload request received:', requestId);
    console.log('📤 User authenticated:', req.user ? 'Yes' : 'No');
    console.log('📤 Content-Type:', req.headers['content-type']);
    
    // Check authentication
    if (!req.user?._id) {
      console.log('❌ No user found');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        requestId
      });
    }

    console.log('✅ User:', req.user._id, 'Role:', req.user.role);

    // Check authorization
    if (!checkAuthorization(req.user, 'IMAGE_UPLOAD')) {
      console.log('❌ User not authorized');
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to upload images',
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

    // Validate request body
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: validationErrors.array(),
        requestId
      });
    }

    // Check content type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type. Expected multipart/form-data',
        requestId
      });
    }

    // Handle upload
    try {
      await new Promise((resolve, reject) => {
        uploadSingleImage(req, res, (err) => {
          if (err) {
            console.error('❌ Multer error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (multerError) {
      console.error('❌ Multer upload error:', multerError);
      
      if (multerError.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Please compress your image.',
          requestId
        });
      }
      
      if (multerError.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field. Please use "image" field name.',
          requestId
        });
      }
      
      if (multerError.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too many files. Maximum 5 files allowed.',
          requestId
        });
      }
      
      return res.status(400).json({
        success: false,
        error: multerError.message || 'File upload failed',
        requestId
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        requestId
      });
    }

    console.log('✅ File uploaded:', req.file.filename);

    // Process uploaded file
    const uploadedFile = {
      url: req.file.path || req.file.secure_url,
      publicId: req.file.filename || req.file.public_id,
      format: req.file.format,
      width: req.file.width,
      height: req.file.height,
      bytes: req.file.size,
      secureUrl: req.file.path?.replace('http:', 'https:') || req.file.secure_url,
    };

    console.log('✅ Upload successful:', {
      requestId,
      userId: req.user._id,
      file: uploadedFile.publicId,
    });

    return res.status(201).json({
      success: true,
      data: uploadedFile,
      message: 'Image uploaded successfully',
      requestId,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    if (error.message === 'Authentication required') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login again.',
        requestId
      });
    }

    if (error.message && error.message.includes('Cloudinary')) {
      return res.status(503).json({
        success: false,
        error: 'Image service temporarily unavailable. Please try again.',
        requestId
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to upload image: ' + error.message,
      requestId
    });
  }
};

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
export const uploadMultipleImagesController = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    console.log('📤 Multiple upload request received:', requestId);
    
    // Check authentication
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        requestId
      });
    }

    // Check authorization
    if (!checkAuthorization(req.user, 'IMAGE_UPLOAD')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to upload images',
        requestId
      });
    }

    // Handle upload
    try {
      await new Promise((resolve, reject) => {
        uploadMultipleImages(req, res, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (multerError) {
      console.error('❌ Multer upload error:', multerError);
      
      if (multerError.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Please compress your images.',
          requestId
        });
      }
      
      if (multerError.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too many files. Maximum 5 files allowed.',
          requestId
        });
      }
      
      return res.status(400).json({
        success: false,
        error: multerError.message || 'File upload failed',
        requestId
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
        requestId
      });
    }

    // Process uploaded files
    const uploadedFiles = req.files.map(file => ({
      url: file.path || file.secure_url,
      publicId: file.filename || file.public_id,
      format: file.format,
      width: file.width,
      height: file.height,
      bytes: file.size,
      secureUrl: file.path?.replace('http:', 'https:') || file.secure_url,
    }));

    console.log('✅ Multiple upload successful:', {
      requestId,
      userId: req.user._id,
      files: uploadedFiles.length,
    });

    return res.status(201).json({
      success: true,
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      },
      message: `${uploadedFiles.length} images uploaded successfully`,
      requestId,
      responseTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload images: ' + error.message,
      requestId
    });
  }
};

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload
export const deleteImage = async (req, res) => {
  const requestId = uuidv4();
  
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
    if (!checkAuthorization(req.user, 'IMAGE_DELETE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete images',
        requestId
      });
    }

    const { publicId } = req.body;

    // Validate public ID
    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required',
        requestId
      });
    }

    // Sanitize public ID
    const sanitizedPublicId = sanitizeXSS(publicId.trim());
    if (checkForSQLInjection(sanitizedPublicId) || checkForXSSPatterns(sanitizedPublicId)) {
      return res.status(400).json({
        success: false,
        error: 'Public ID contains malicious patterns',
        requestId
      });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(sanitizedPublicId, {
      invalidate: true,
    });

    if (result.result === 'not found') {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        requestId
      });
    }

    if (result.result === 'error') {
      throw new Error('Failed to delete image from Cloudinary');
    }

    console.log('✅ Image deleted:', {
      requestId,
      userId: req.user._id,
      publicId: sanitizedPublicId,
    });

    return res.json({
      success: true,
      data: null,
      message: 'Image deleted successfully',
      requestId
    });

  } catch (error) {
    console.error('❌ Delete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete image: ' + error.message,
      requestId
    });
  }
};

// @desc    Get image info
// @route   GET /api/upload/:publicId
export const getImageInfo = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    // Check authentication
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        requestId
      });
    }

    // Check authorization
    if (!checkAuthorization(req.user, 'IMAGE_READ')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view image info',
        requestId
      });
    }

    const { publicId } = req.params;

    // Validate public ID
    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required',
        requestId
      });
    }

    // Sanitize public ID
    const sanitizedPublicId = sanitizeXSS(publicId.trim());
    if (checkForSQLInjection(sanitizedPublicId) || checkForXSSPatterns(sanitizedPublicId)) {
      return res.status(400).json({
        success: false,
        error: 'Public ID contains malicious patterns',
        requestId
      });
    }

    // Get image info from Cloudinary
    const result = await cloudinary.api.resource(sanitizedPublicId, {
      image_metadata: true,
      colors: true,
      faces: true,
      quality_analysis: true
    });

    return res.json({
      success: true,
      data: {
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        url: result.secure_url,
        createdAt: result.created_at,
        tags: result.tags || [],
        metadata: result.metadata || {},
        colors: result.colors || [],
        quality: result.quality_analysis || {}
      },
      requestId
    });

  } catch (error) {
    console.error('❌ Get image info error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        requestId
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to get image info: ' + error.message,
      requestId
    });
  }
};

// @desc    Update image metadata
// @route   PATCH /api/upload/:publicId/metadata
export const updateImageMetadata = async (req, res) => {
  const requestId = uuidv4();
  
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
    if (!checkAuthorization(req.user, 'IMAGE_UPLOAD')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update image metadata',
        requestId
      });
    }

    const { publicId } = req.params;
    const { tags, description, context } = req.body;

    // Validate public ID
    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required',
        requestId
      });
    }

    // Sanitize public ID
    const sanitizedPublicId = sanitizeXSS(publicId.trim());
    if (checkForSQLInjection(sanitizedPublicId) || checkForXSSPatterns(sanitizedPublicId)) {
      return res.status(400).json({
        success: false,
        error: 'Public ID contains malicious patterns',
        requestId
      });
    }

    // Build update data
    const updateData = {};

    if (tags) {
      const sanitizedTags = Array.isArray(tags) 
        ? tags.map(tag => sanitizeXSS(tag.trim())).filter(tag => tag)
        : [];
      if (sanitizedTags.length > 20) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 20 tags allowed',
          requestId
        });
      }
      updateData.tags = sanitizedTags;
    }

    if (description) {
      const sanitizedDescription = sanitizeXSS(description.trim());
      if (checkForSQLInjection(sanitizedDescription) || checkForXSSPatterns(sanitizedDescription)) {
        return res.status(400).json({
          success: false,
          error: 'Description contains malicious patterns',
          requestId
        });
      }
      updateData.context = {
        ...(context || {}),
        alt: sanitizedDescription,
        caption: sanitizedDescription
      };
    }

    if (context) {
      const sanitizedContext = {};
      for (const [key, value] of Object.entries(context)) {
        const sanitizedKey = sanitizeXSS(key);
        const sanitizedValue = sanitizeXSS(value);
        if (!checkForSQLInjection(sanitizedKey) && !checkForXSSPatterns(sanitizedKey)) {
          sanitizedContext[sanitizedKey] = sanitizedValue;
        }
      }
      updateData.context = {
        ...(updateData.context || {}),
        ...sanitizedContext
      };
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid metadata fields to update',
        requestId
      });
    }

    // Update on Cloudinary
    const result = await cloudinary.api.update(sanitizedPublicId, updateData);

    return res.json({
      success: true,
      data: result,
      message: 'Image metadata updated successfully',
      requestId
    });

  } catch (error) {
    console.error('❌ Update metadata error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        requestId
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update image metadata: ' + error.message,
      requestId
    });
  }
};

// ============================================================
//  EXPORTS
// ============================================================

export default {
  uploadImage,
  uploadMultipleImagesController,
  deleteImage,
  getImageInfo,
  updateImageMetadata,
  uploadSingleImage,
  uploadMultipleImages,
  uploadFields,
};