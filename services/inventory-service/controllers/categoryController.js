// controllers/categoryController.js
import Category from '../models/Category.js';
import CourseType from '../models/CourseType.js';
import Dish from '../models/Dish.js';
import mongoose from 'mongoose';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_BULK_DELETE = 50;
const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
const ALLOWED_IMAGE_REGEX = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
const MAX_NAME_LENGTH_CATEGORY = 100;
const MAX_DESCRIPTION_LENGTH_CATEGORY = 500;

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Validate category name (with XSS protection)
const isValidCategoryName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_NAME_LENGTH_CATEGORY) return false;
  // Prevent special characters that could be used for XSS
  const nameRegex = /^[a-zA-Z0-9\s\-_.,&()]+$/;
  return nameRegex.test(trimmed);
};

// Validate description
const isValidDescription = (description) => {
  if (!description) return true;
  const trimmed = description.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH_CATEGORY) return false;
  return true;
};

// Validate image URL (with security checks)
const isValidImageUrl = (imageUrl) => {
  if (!imageUrl) return true;
  
  // Base64 image validation
  if (imageUrl.startsWith('data:image')) {
    const base64Data = imageUrl.split(',')[1];
    if (!base64Data) return false;
    // Check size (max 5MB)
    const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
    if (sizeInBytes > 5 * 1024 * 1024) return false;
    return true;
  }
  
  // HTTP URL validation
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Prevent malicious URLs
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
    ];
    for (const pattern of maliciousPatterns) {
      if (pattern.test(imageUrl)) return false;
    }
    return true;
  }
  
  // File extension check
  return ALLOWED_IMAGE_REGEX.test(imageUrl);
};

// Sanitize category data for response
const sanitizeCategory = (category) => {
  if (!category) return null;
  return {
    _id: category._id,
    id: category._id,
    name: sanitizeInput(category.name || ''),
    description: sanitizeInput(category.description || ''),
    image: category.image || '',
    isActive: category.isActive || false,
    courseTypeId: category.courseTypeId,
    courseTypeName: sanitizeInput(category.courseTypeName || ''),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

// ============================================================
//  CATEGORY CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
// ──────────────────────────────────────────────────────────────────────────

export const getCategories = async (req, res) => {
  try {
    // ─── VALIDATE QUERY PARAMS ──────────────────────────────────────────
    const search = req.query.search || '';
    const courseTypeId = req.query.courseTypeId || '';
    const isActive = req.query.isActive;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    
    const filter = {};
    
    // Search filter (sanitized)
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
    
    // Course type filter
    if (courseTypeId) {
      if (!isValidObjectId(courseTypeId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid course type ID format',
        });
      }
      filter.courseTypeId = courseTypeId;
    }
    
    // Active status filter
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }
    
    // ─── EXECUTE QUERY ──────────────────────────────────────────────────
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate('courseTypeId', 'name displayOrder isActive')
        .sort({ isActive: -1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(filter),
    ]);
    
    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedCategories = categories.map(sanitizeCategory);
    
    return res.json({
      success: true,
      data: {
        categories: sanitizedCategories,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: categories.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/categories] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
// ──────────────────────────────────────────────────────────────────────────

export const getCategoryById = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
      });
    }
    
    // ─── FETCH CATEGORY ──────────────────────────────────────────────────
    const category = await Category.findById(id)
      .populate('courseTypeId', 'name displayOrder isActive')
      .lean();
      
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }
    
    return res.json({
      success: true,
      data: sanitizeCategory(category),
    });
  } catch (err) {
    console.error('[GET /api/categories/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create category
// @route   POST /api/categories
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const createCategory = async (req, res) => {
  try {
    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const { name, description, image, isActive, courseTypeId, courseTypeName } = req.body;
    
    // ─── VALIDATE NAME ──────────────────────────────────────────────────
    if (!name || !isValidCategoryName(name)) {
      return res.status(400).json({
        success: false,
        error: `Category name is required and must be between 1 and ${MAX_NAME_LENGTH_CATEGORY} characters. Only letters, numbers, spaces, hyphens, underscores, dots, ampersands, and parentheses are allowed.`,
      });
    }
    
    // ─── VALIDATE DESCRIPTION ────────────────────────────────────────────
    if (description && !isValidDescription(description)) {
      return res.status(400).json({
        success: false,
        error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH_CATEGORY} characters`,
      });
    }
    
    // ─── VALIDATE IMAGE ──────────────────────────────────────────────────
    if (image && !isValidImageUrl(image)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Allowed: JPG, JPEG, PNG, WebP, GIF, SVG. Maximum size: 5MB.',
      });
    }
    
    // ─── VALIDATE COURSE TYPE ────────────────────────────────────────────
    let finalCourseTypeName = courseTypeName || '';
    let finalCourseTypeId = courseTypeId || null;
    
    if (courseTypeId) {
      if (!isValidObjectId(courseTypeId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid course type ID format',
        });
      }
      
      const courseType = await CourseType.findById(courseTypeId);
      if (!courseType) {
        return res.status(404).json({
          success: false,
          error: 'Selected course type not found',
        });
      }
      finalCourseTypeName = courseType.name;
      finalCourseTypeId = courseTypeId;
    }
    
    // ─── CHECK DUPLICATE ─────────────────────────────────────────────────
    const sanitizedName = sanitizeInput(name.trim());
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') }
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Category '${sanitizedName}' already exists`,
      });
    }
    
    // ─── CREATE CATEGORY ─────────────────────────────────────────────────
    const categoryData = {
      name: sanitizedName,
      description: description ? sanitizeInput(description.trim()) : '',
      image: image || '',
      isActive: isActive !== undefined ? isActive : true,
      courseTypeId: finalCourseTypeId,
      courseTypeName: sanitizeInput(finalCourseTypeName),
    };
    
    const category = await Category.create(categoryData);
    
    const populatedCategory = await Category.findById(category._id)
      .populate('courseTypeId', 'name displayOrder isActive')
      .lean();
    
    return res.status(201).json({
      success: true,
      data: sanitizeCategory(populatedCategory),
      message: 'Category created successfully',
    });
  } catch (err) {
    console.error('[POST /api/categories] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Category with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create category',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update category
// @route   PATCH /api/categories/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const updateCategory = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
      });
    }
    
    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const { name, description, image, isActive, courseTypeId, courseTypeName } = req.body;
    
    // ─── BUILD UPDATE OBJECT ────────────────────────────────────────────
    const updateData = {};
    
    // Validate and set name
    if (name !== undefined) {
      if (!isValidCategoryName(name)) {
        return res.status(400).json({
          success: false,
          error: `Category name must be between 1 and ${MAX_NAME_LENGTH_CATEGORY} characters. Only letters, numbers, spaces, hyphens, underscores, dots, ampersands, and parentheses are allowed.`,
        });
      }
      
      const sanitizedName = sanitizeInput(name.trim());
      
      // Check duplicate name
      const conflict = await Category.findOne({
        name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `Category '${sanitizedName}' already exists`,
        });
      }
      
      updateData.name = sanitizedName;
    }
    
    // Validate and set description
    if (description !== undefined) {
      if (!isValidDescription(description)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH_CATEGORY} characters`,
        });
      }
      updateData.description = description ? sanitizeInput(description.trim()) : '';
    }
    
    // Validate and set image
    if (image !== undefined) {
      if (image && !isValidImageUrl(image)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image format. Allowed: JPG, JPEG, PNG, WebP, GIF, SVG. Maximum size: 5MB.',
        });
      }
      updateData.image = image || '';
    }
    
    // Set isActive
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
        });
      }
      updateData.isActive = isActive;
    }
    
    // Validate and set course type
    if (courseTypeId !== undefined) {
      if (courseTypeId) {
        if (!isValidObjectId(courseTypeId)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid course type ID format',
          });
        }
        
        const courseType = await CourseType.findById(courseTypeId);
        if (!courseType) {
          return res.status(404).json({
            success: false,
            error: 'Selected course type not found',
          });
        }
        updateData.courseTypeId = courseTypeId;
        updateData.courseTypeName = sanitizeInput(courseTypeName || courseType.name);
      } else {
        updateData.courseTypeId = null;
        updateData.courseTypeName = '';
      }
    }
    
    // ─── UPDATE CATEGORY ─────────────────────────────────────────────────
    const updated = await Category.findByIdAndUpdate(
      id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        context: 'query',
      }
    ).populate('courseTypeId', 'name displayOrder isActive');
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }
    
    return res.json({
      success: true,
      data: sanitizeCategory(updated),
      message: 'Category updated successfully',
    });
  } catch (err) {
    console.error('[PATCH /api/categories/:id] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Category with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update category',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const deleteCategory = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
      });
    }
    
    // ─── CHECK IF CATEGORY EXISTS ──────────────────────────────────────
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }
    
    // ─── CHECK IF CATEGORY HAS DISHES ──────────────────────────────────
    const dishCount = await Dish.countDocuments({ categoryId: id });
    if (dishCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${dishCount} dish(es) associated. Please reassign or delete the dishes first.`,
      });
    }
    
    // ─── DELETE CATEGORY ─────────────────────────────────────────────────
    await Category.findByIdAndDelete(id);
    
    return res.json({
      success: true,
      message: `Category '${sanitizeInput(category.name)}' deleted successfully`,
    });
  } catch (err) {
    console.error('[DELETE /api/categories/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete category',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get categories by course type
// @route   GET /api/categories/by-course-type/:courseTypeId
// @access  Public
// ──────────────────────────────────────────────────────────────────────────

export const getCategoriesByCourseType = async (req, res) => {
  try {
    // ─── VALIDATE COURSE TYPE ID ────────────────────────────────────────
    const { courseTypeId } = req.params;
    if (!isValidObjectId(courseTypeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course type ID format',
      });
    }
    
    // ─── CHECK COURSE TYPE EXISTS ──────────────────────────────────────
    const courseType = await CourseType.findById(courseTypeId);
    if (!courseType) {
      return res.status(404).json({
        success: false,
        error: 'Course type not found',
      });
    }
    
    // ─── BUILD FILTER ────────────────────────────────────────────────────
    const includeInactive = req.query.includeInactive === 'true';
    const filter = { courseTypeId };
    if (!includeInactive) {
      filter.isActive = true;
    }
    
    // ─── FETCH CATEGORIES ────────────────────────────────────────────────
    const categories = await Category.find(filter)
      .populate('courseTypeId', 'name displayOrder isActive')
      .sort({ name: 1 })
      .lean();
    
    const sanitizedCategories = categories.map(sanitizeCategory);
    
    return res.json({
      success: true,
      data: {
        categories: sanitizedCategories,
        count: categories.length,
        courseType: {
          _id: courseType._id,
          name: sanitizeInput(courseType.name),
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/categories/by-course-type/:courseTypeId] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Toggle category status
// @route   PATCH /api/categories/:id/toggle-status
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const toggleCategoryStatus = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
      });
    }
    
    // ─── FIND CATEGORY ──────────────────────────────────────────────────
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }
    
    // ─── TOGGLE STATUS ──────────────────────────────────────────────────
    category.isActive = !category.isActive;
    await category.save();
    
    const populatedCategory = await Category.findById(id)
      .populate('courseTypeId', 'name displayOrder isActive')
      .lean();
    
    return res.json({
      success: true,
      data: sanitizeCategory(populatedCategory),
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    console.error('[PATCH /api/categories/:id/toggle-status] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle category status',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete categories
// @route   DELETE /api/categories/bulk
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteCategories = async (req, res) => {
  try {
    // ─── VALIDATE INPUT ──────────────────────────────────────────────────
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of category IDs',
      });
    }
    
    if (ids.length > MAX_BULK_DELETE) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_BULK_DELETE} categories can be deleted at once`,
      });
    }
    
    // ─── VALIDATE ALL IDs ──────────────────────────────────────────────
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ID format: ${invalidIds.join(', ')}`,
      });
    }
    
    // ─── CHECK FOR CATEGORIES WITH DISHES ──────────────────────────────
    const categoriesWithDishes = await Dish.find({ 
      categoryId: { $in: ids } 
    }).distinct('categoryId');
    
    if (categoriesWithDishes.length > 0) {
      const categoryNames = await Category.find({
        _id: { $in: categoriesWithDishes }
      }).select('name');
      
      return res.status(400).json({
        success: false,
        error: `Cannot delete categories that have dishes. Categories with dishes: ${categoryNames.map(c => c.name).join(', ')}`,
      });
    }
    
    // ─── DELETE CATEGORIES ──────────────────────────────────────────────
    const result = await Category.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No categories found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} categories deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    console.error('[DELETE /api/categories/bulk] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete categories',
    });
  }
};