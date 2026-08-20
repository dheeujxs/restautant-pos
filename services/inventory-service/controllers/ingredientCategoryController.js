// controllers/ingredientCategoryController.js
import IngredientCategory from '../models/IngredientCategory.js';
import Ingredient from '../models/Ingredient.js';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_NAME_LENGTH_CATEGORY = 100;
const MAX_DESCRIPTION_LENGTH_CATEGORY = 500;

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Validate category name with XSS protection
const isValidCategoryName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_NAME_LENGTH_CATEGORY) return false;
  // Only allow safe characters
  const nameRegex = /^[a-zA-Z0-9\s\-_.,&()'"]+$/;
  return nameRegex.test(trimmed);
};

// Validate description
const isValidDescription = (description) => {
  if (!description) return true;
  const trimmed = description.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH_CATEGORY) return false;
  return true;
};

// Validate isActive
const isValidBoolean = (value) => {
  if (value === undefined || value === null) return true;
  return typeof value === 'boolean';
};

// Sanitize category for response
const sanitizeCategory = (category) => {
  if (!category) return null;
  return {
    _id: category._id,
    id: category._id,
    name: sanitizeInput(category.name || ''),
    description: sanitizeInput(category.description || ''),
    isActive: category.isActive !== false,
    ingredientCount: category.ingredientCount || 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

// ============================================================
//  INGREDIENT CATEGORY CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all ingredient categories
// @route   GET /api/ingredient-categories
// @access  Public
// ──────────────────────────────────────────────────────────────────────────

export const getIngredientCategories = async (req, res) => {
  try {
    // ─── VALIDATE QUERY PARAMS ──────────────────────────────────────────
    const search = req.query.search || '';
    const isActive = req.query.isActive;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    // Search filter (sanitized)
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$text = { $search: sanitizedSearch };
    }

    // Active status filter
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // ─── FETCH CATEGORIES ──────────────────────────────────────────────
    const [categories, total] = await Promise.all([
      IngredientCategory.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IngredientCategory.countDocuments(filter),
    ]);

    // ─── GET INGREDIENT COUNTS ─────────────────────────────────────────
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const ingredientCount = await Ingredient.countDocuments({ 
          categoryId: category._id.toString(),
          isActive: true 
        });
        return { ...sanitizeCategory(category), ingredientCount };
      })
    );

    return res.json({
      success: true,
      data: {
        categories: categoriesWithCount,
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
    console.error('[GET /api/ingredient-categories] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredient categories',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get ingredient category by ID
// @route   GET /api/ingredient-categories/:id
// @access  Public
// ──────────────────────────────────────────────────────────────────────────

export const getIngredientCategoryById = async (req, res) => {
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
    const category = await IngredientCategory.findById(id).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient category not found',
      });
    }

    // ─── GET INGREDIENT COUNT ───────────────────────────────────────────
    const ingredientCount = await Ingredient.countDocuments({ 
      categoryId: category._id.toString(),
      isActive: true 
    });

    return res.json({
      success: true,
      data: {
        ...sanitizeCategory(category),
        ingredientCount,
      },
    });
  } catch (err) {
    console.error('[GET /api/ingredient-categories/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredient category',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create ingredient category
// @route   POST /api/ingredient-categories
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const createIngredientCategory = async (req, res) => {
  try {
    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const { name, description, isActive } = req.body;

    // ─── VALIDATE NAME ──────────────────────────────────────────────────
    if (!name || !isValidCategoryName(name)) {
      return res.status(400).json({
        success: false,
        error: `Category name is required and must be between 1 and ${MAX_NAME_LENGTH_CATEGORY} characters. Only letters, numbers, spaces, hyphens, underscores, dots, ampersands, parentheses, and quotes are allowed.`,
      });
    }

    // ─── VALIDATE DESCRIPTION ────────────────────────────────────────────
    if (description && !isValidDescription(description)) {
      return res.status(400).json({
        success: false,
        error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH_CATEGORY} characters`,
      });
    }

    // ─── VALIDATE IS ACTIVE ─────────────────────────────────────────────
    if (isActive !== undefined && !isValidBoolean(isActive)) {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean',
      });
    }

    // ─── CHECK DUPLICATE ─────────────────────────────────────────────────
    const sanitizedName = sanitizeInput(name.trim());
    const existing = await IngredientCategory.findOne({
      name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') }
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Ingredient category '${sanitizedName}' already exists`,
      });
    }

    // ─── CREATE CATEGORY ────────────────────────────────────────────────
    const categoryData = {
      name: sanitizedName,
      description: description ? sanitizeInput(description.trim()) : '',
      isActive: isActive !== undefined ? isActive : true,
    };

    const category = await IngredientCategory.create(categoryData);

    return res.status(201).json({
      success: true,
      data: sanitizeCategory(category),
      message: 'Ingredient category created successfully',
    });
  } catch (err) {
    console.error('[POST /api/ingredient-categories] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Ingredient category with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create ingredient category',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update ingredient category
// @route   PATCH /api/ingredient-categories/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const updateIngredientCategory = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
      });
    }

    // ─── FIND EXISTING CATEGORY ─────────────────────────────────────────
    const existingCategory = await IngredientCategory.findById(id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient category not found',
      });
    }

    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const { name, description, isActive } = req.body;
    const updateData = {};

    // ─── VALIDATE NAME ──────────────────────────────────────────────────
    if (name !== undefined) {
      if (!isValidCategoryName(name)) {
        return res.status(400).json({
          success: false,
          error: `Category name must be between 1 and ${MAX_NAME_LENGTH_CATEGORY} characters. Only letters, numbers, spaces, hyphens, underscores, dots, ampersands, parentheses, and quotes are allowed.`,
        });
      }

      const sanitizedName = sanitizeInput(name.trim());
      
      // Check duplicate
      const conflict = await IngredientCategory.findOne({
        name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `Ingredient category '${sanitizedName}' already exists`,
        });
      }
      
      updateData.name = sanitizedName;
    }

    // ─── VALIDATE DESCRIPTION ────────────────────────────────────────────
    if (description !== undefined) {
      if (!isValidDescription(description)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH_CATEGORY} characters`,
        });
      }
      updateData.description = description ? sanitizeInput(description.trim()) : '';
    }

    // ─── VALIDATE IS ACTIVE ─────────────────────────────────────────────
    if (isActive !== undefined) {
      if (!isValidBoolean(isActive)) {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
        });
      }
      updateData.isActive = isActive;
    }

    // ─── UPDATE CATEGORY ────────────────────────────────────────────────
    const updated = await IngredientCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    return res.json({
      success: true,
      data: sanitizeCategory(updated),
      message: 'Ingredient category updated successfully',
    });
  } catch (err) {
    console.error('[PATCH /api/ingredient-categories/:id] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Ingredient category with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update ingredient category',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete ingredient category
// @route   DELETE /api/ingredient-categories/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const deleteIngredientCategory = async (req, res) => {
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
    const category = await IngredientCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient category not found',
      });
    }

    // ─── CHECK IF CATEGORY HAS INGREDIENTS ─────────────────────────────
    const ingredientCount = await Ingredient.countDocuments({ 
      categoryId: id 
    });
    
    if (ingredientCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category '${sanitizeInput(category.name)}'. It has ${ingredientCount} ingredient(s) assigned. Please delete or reassign the ingredients first.`,
      });
    }

    // ─── DELETE CATEGORY ─────────────────────────────────────────────────
    await IngredientCategory.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Ingredient category '${sanitizeInput(category.name)}' deleted successfully`,
    });
  } catch (err) {
    console.error('[DELETE /api/ingredient-categories/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete ingredient category',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete ingredient categories
// @route   DELETE /api/ingredient-categories/bulk
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteIngredientCategories = async (req, res) => {
  try {
    // ─── VALIDATE INPUT ──────────────────────────────────────────────────
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of category IDs',
      });
    }
    
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 categories can be deleted at once',
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
    
    // ─── CHECK IF CATEGORIES HAVE INGREDIENTS ──────────────────────────
    const categoriesWithIngredients = await Ingredient.aggregate([
      { $match: { categoryId: { $in: ids } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);
    
    if (categoriesWithIngredients.length > 0) {
      const categoryIdsWithIngredients = categoriesWithIngredients.map(c => c._id);
      const categoryNames = await IngredientCategory.find({
        _id: { $in: categoryIdsWithIngredients }
      }).select('name');
      
      return res.status(400).json({
        success: false,
        error: `Cannot delete categories that have ingredients. Categories with ingredients: ${categoryNames.map(c => sanitizeInput(c.name)).join(', ')}`,
      });
    }
    
    // ─── DELETE CATEGORIES ──────────────────────────────────────────────
    const result = await IngredientCategory.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No categories found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} ingredient categories deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    console.error('[DELETE /api/ingredient-categories/bulk] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete ingredient categories',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Toggle category status
// @route   PATCH /api/ingredient-categories/:id/toggle-status
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const toggleIngredientCategoryStatus = async (req, res) => {
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
    const category = await IngredientCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient category not found',
      });
    }

    // ─── TOGGLE STATUS ──────────────────────────────────────────────────
    category.isActive = !category.isActive;
    await category.save();

    // ─── UPDATE INGREDIENTS STATUS ──────────────────────────────────────
    await Ingredient.updateMany(
      { categoryId: id },
      { $set: { isActive: category.isActive } }
    );

    return res.json({
      success: true,
      data: sanitizeCategory(category),
      message: `Ingredient category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    console.error('[PATCH /api/ingredient-categories/:id/toggle-status] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle category status',
    });
  }
};