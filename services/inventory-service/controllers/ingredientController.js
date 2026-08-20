// controllers/ingredientController.js
import Ingredient from '../models/Ingredient.js';
import mongoose from 'mongoose';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  isValidPhone,
  isValidEmail,
  isValidPrice,
  isValidQuantity,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_NAME_LENGTH_INGREDIENT = 100;
const MAX_DESCRIPTION_LENGTH_INGREDIENT = 500;
const MAX_SKU_LENGTH = 50;
const MAX_LOCATION_LENGTH = 200;
const MAX_SUPPLIER_LENGTH = 200;
const MAX_UNIT_LENGTH = 20;
const MAX_STOCK_AMOUNT = 999999;
const MAX_REORDER_POINT = 99999;
const MAX_STOCK_ADDITION = 99999;
const ALLOWED_UNITS = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack', 'bottle', 'can', 'bag', 'carton', 'dozen', 'pair', 'set'];
const SKU_REGEX = /^[A-Z0-9-]+$/;

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Validate ingredient name with XSS protection
const isValidIngredientName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_NAME_LENGTH_INGREDIENT) return false;
  // Only allow safe characters
  const nameRegex = /^[a-zA-Z0-9\s\-_.,&()'"]+$/;
  return nameRegex.test(trimmed);
};

// Validate SKU
const isValidSKU = (sku) => {
  if (!sku) return false;
  const trimmed = sku.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_SKU_LENGTH) return false;
  return SKU_REGEX.test(trimmed.toUpperCase());
};

// Validate unit
const isValidUnit = (unit) => {
  if (!unit) return false;
  const trimmed = unit.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_UNIT_LENGTH) return false;
  return ALLOWED_UNITS.includes(trimmed.toLowerCase());
};

// Validate stock amount
const isValidStock = (stock) => {
  if (stock === undefined || stock === null) return false;
  if (!Number.isFinite(stock)) return false;
  if (stock < 0) return false;
  if (stock > MAX_STOCK_AMOUNT) return false;
  return true;
};

// Validate reorder point
const isValidReorderPoint = (point) => {
  if (point === undefined || point === null) return true;
  if (!Number.isFinite(point)) return false;
  if (point < 0) return false;
  if (point > MAX_REORDER_POINT) return false;
  return true;
};

// Validate location
const isValidLocation = (location) => {
  if (!location) return true;
  const trimmed = location.trim();
  if (trimmed.length > MAX_LOCATION_LENGTH) return false;
  return true;
};

// Validate supplier
const isValidSupplier = (supplier) => {
  if (!supplier) return true;
  const trimmed = supplier.trim();
  if (trimmed.length > MAX_SUPPLIER_LENGTH) return false;
  return true;
};

// Validate isActive
const isValidBoolean = (value) => {
  if (value === undefined || value === null) return true;
  return typeof value === 'boolean';
};

// Sanitize ingredient for response
const sanitizeIngredient = (ingredient) => {
  if (!ingredient) return null;
  return {
    _id: ingredient._id,
    id: ingredient._id,
    name: sanitizeInput(ingredient.name || ''),
    sku: ingredient.sku || '',
    category: sanitizeInput(ingredient.category || ''),
    categoryId: ingredient.categoryId,
    unit: ingredient.unit || '',
    currentStock: ingredient.currentStock || 0,
    reorderPoint: ingredient.reorderPoint || 0,
    supplier: sanitizeInput(ingredient.supplier || ''),
    storageLocation: sanitizeInput(ingredient.storageLocation || ''),
    isActive: ingredient.isActive !== false,
    description: sanitizeInput(ingredient.description || ''),
    minStock: ingredient.minStock || 0,
    maxStock: ingredient.maxStock || 0,
    costPerUnit: ingredient.costPerUnit || 0,
    createdAt: ingredient.createdAt,
    updatedAt: ingredient.updatedAt,
  };
};

// ============================================================
//  INGREDIENT CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all ingredients
// @route   GET /api/ingredients
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const getIngredients = async (req, res) => {
  try {
    // ─── VALIDATE QUERY PARAMS ──────────────────────────────────────────
    const search = req.query.search || '';
    const category = req.query.category || '';
    const categoryId = req.query.categoryId || '';
    const isActive = req.query.isActive;
    const lowStock = req.query.lowStock === 'true';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = {};

    // Search filter (sanitized)
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { sku: { $regex: sanitizedSearch, $options: 'i' } },
        { supplier: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    // Category filter
    if (category) {
      filter.category = sanitizeInput(category.trim());
    }

    // Category ID filter
    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category ID format',
        });
      }
      filter.categoryId = categoryId;
    }

    // Active status filter
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // Low stock filter
    if (lowStock) {
      filter.$expr = { $lte: ['$currentStock', '$reorderPoint'] };
    }

    // ─── VALIDATE SORT FIELD ────────────────────────────────────────────
    const allowedSortFields = ['name', 'sku', 'category', 'currentStock', 'reorderPoint', 'createdAt', 'updatedAt'];
    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        error: `Invalid sort field. Allowed: ${allowedSortFields.join(', ')}`,
      });
    }

    // ─── FETCH INGREDIENTS ──────────────────────────────────────────────
    const [ingredients, total] = await Promise.all([
      Ingredient.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ingredient.countDocuments(filter),
    ]);

    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedIngredients = ingredients.map(sanitizeIngredient);

    // ─── CALCULATE LOW STOCK COUNT ──────────────────────────────────────
    const lowStockCount = await Ingredient.countDocuments({
      $expr: { $lte: ['$currentStock', '$reorderPoint'] },
      ...filter,
    });

    return res.json({
      success: true,
      data: {
        ingredients: sanitizedIngredients,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: ingredients.length,
        summary: {
          lowStockCount,
          totalStock: ingredients.reduce((sum, i) => sum + (i.currentStock || 0), 0),
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/ingredients] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredients',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get ingredient by ID
// @route   GET /api/ingredients/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const getIngredientById = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID format',
      });
    }

    // ─── FETCH INGREDIENT ──────────────────────────────────────────────
    const ingredient = await Ingredient.findById(id).lean();
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizeIngredient(ingredient),
    });
  } catch (err) {
    console.error('[GET /api/ingredients/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredient',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create ingredient
// @route   POST /api/ingredients
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const createIngredient = async (req, res) => {
  try {
    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const body = sanitizeObject(req.body);
    const { 
      name, 
      sku, 
      category, 
      categoryId,
      unit, 
      currentStock, 
      reorderPoint,
      supplier,
      storageLocation,
      isActive,
      description,
      minStock,
      maxStock,
      costPerUnit,
    } = body;

    // ─── VALIDATE NAME ──────────────────────────────────────────────────
    if (!name || !isValidIngredientName(name)) {
      return res.status(400).json({
        success: false,
        error: `Ingredient name is required and must be between 1 and ${MAX_NAME_LENGTH_INGREDIENT} characters. Only letters, numbers, spaces, hyphens, underscores, dots, ampersands, parentheses, and quotes are allowed.`,
      });
    }

    // ─── VALIDATE SKU ───────────────────────────────────────────────────
    if (!sku || !isValidSKU(sku)) {
      return res.status(400).json({
        success: false,
        error: `SKU is required and must be 1-${MAX_SKU_LENGTH} characters. Only uppercase letters, numbers, and hyphens are allowed.`,
      });
    }

    // ─── VALIDATE UNIT ──────────────────────────────────────────────────
    if (!unit || !isValidUnit(unit)) {
      return res.status(400).json({
        success: false,
        error: `Unit is required. Allowed units: ${ALLOWED_UNITS.join(', ')}`,
      });
    }

    // ─── VALIDATE CATEGORY ID ───────────────────────────────────────────
    if (categoryId && !isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
      });
    }

    // ─── VALIDATE CURRENT STOCK ─────────────────────────────────────────
    if (currentStock !== undefined && !isValidStock(currentStock)) {
      return res.status(400).json({
        success: false,
        error: `Current stock must be between 0 and ${MAX_STOCK_AMOUNT}`,
      });
    }

    // ─── VALIDATE REORDER POINT ─────────────────────────────────────────
    if (reorderPoint !== undefined && !isValidReorderPoint(reorderPoint)) {
      return res.status(400).json({
        success: false,
        error: `Reorder point must be between 0 and ${MAX_REORDER_POINT}`,
      });
    }

    // ─── VALIDATE MIN STOCK ─────────────────────────────────────────────
    if (minStock !== undefined) {
      if (!isValidStock(minStock)) {
        return res.status(400).json({
          success: false,
          error: `Min stock must be between 0 and ${MAX_STOCK_AMOUNT}`,
        });
      }
      if (minStock > (maxStock || Number.MAX_SAFE_INTEGER)) {
        return res.status(400).json({
          success: false,
          error: 'Min stock cannot be greater than max stock',
        });
      }
    }

    // ─── VALIDATE MAX STOCK ─────────────────────────────────────────────
    if (maxStock !== undefined) {
      if (!isValidStock(maxStock)) {
        return res.status(400).json({
          success: false,
          error: `Max stock must be between 0 and ${MAX_STOCK_AMOUNT}`,
        });
      }
      if (maxStock < (minStock || 0)) {
        return res.status(400).json({
          success: false,
          error: 'Max stock cannot be less than min stock',
        });
      }
    }

    // ─── VALIDATE COST PER UNIT ─────────────────────────────────────────
    if (costPerUnit !== undefined && !isValidPrice(costPerUnit)) {
      return res.status(400).json({
        success: false,
        error: 'Cost per unit must be a positive number',
      });
    }

    // ─── VALIDATE LOCATION ──────────────────────────────────────────────
    if (storageLocation && !isValidLocation(storageLocation)) {
      return res.status(400).json({
        success: false,
        error: `Storage location cannot exceed ${MAX_LOCATION_LENGTH} characters`,
      });
    }

    // ─── VALIDATE SUPPLIER ──────────────────────────────────────────────
    if (supplier && !isValidSupplier(supplier)) {
      return res.status(400).json({
        success: false,
        error: `Supplier name cannot exceed ${MAX_SUPPLIER_LENGTH} characters`,
      });
    }

    // ─── VALIDATE DESCRIPTION ────────────────────────────────────────────
    if (description && !isValidText(description, MAX_DESCRIPTION_LENGTH_INGREDIENT)) {
      return res.status(400).json({
        success: false,
        error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH_INGREDIENT} characters`,
      });
    }

    // ─── CHECK DUPLICATE SKU ────────────────────────────────────────────
    const normalizedSKU = sku.trim().toUpperCase();
    const existing = await Ingredient.findOne({ sku: normalizedSKU });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `SKU '${normalizedSKU}' already exists`,
      });
    }

    // ─── CREATE INGREDIENT ──────────────────────────────────────────────
    const ingredientData = {
      name: sanitizeInput(name.trim()),
      sku: normalizedSKU,
      category: category ? sanitizeInput(category.trim()) : '',
      categoryId: categoryId || null,
      unit: unit.trim().toLowerCase(),
      currentStock: currentStock || 0,
      reorderPoint: reorderPoint || 0,
      supplier: supplier ? sanitizeInput(supplier.trim()) : '',
      storageLocation: storageLocation ? sanitizeInput(storageLocation.trim()) : '',
      isActive: isActive !== undefined ? isActive : true,
      description: description ? sanitizeInput(description.trim()) : '',
      minStock: minStock || 0,
      maxStock: maxStock || 0,
      costPerUnit: costPerUnit || 0,
    };

    const ingredient = await Ingredient.create(ingredientData);

    return res.status(201).json({
      success: true,
      data: sanitizeIngredient(ingredient),
      message: 'Ingredient created successfully',
    });
  } catch (err) {
    console.error('[POST /api/ingredients] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Ingredient with this SKU already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create ingredient',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update ingredient
// @route   PATCH /api/ingredients/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const updateIngredient = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID format',
      });
    }

    // ─── FIND EXISTING INGREDIENT ──────────────────────────────────────
    const existingIngredient = await Ingredient.findById(id);
    if (!existingIngredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const body = sanitizeObject(req.body);
    const updateData = {};

    // ─── VALIDATE NAME ──────────────────────────────────────────────────
    if (body.name !== undefined) {
      if (!isValidIngredientName(body.name)) {
        return res.status(400).json({
          success: false,
          error: `Ingredient name must be between 1 and ${MAX_NAME_LENGTH_INGREDIENT} characters. Only letters, numbers, spaces, hyphens, underscores, dots, ampersands, parentheses, and quotes are allowed.`,
        });
      }
      updateData.name = sanitizeInput(body.name.trim());
    }

    // ─── VALIDATE SKU ───────────────────────────────────────────────────
    if (body.sku !== undefined) {
      if (!isValidSKU(body.sku)) {
        return res.status(400).json({
          success: false,
          error: `SKU must be 1-${MAX_SKU_LENGTH} characters. Only uppercase letters, numbers, and hyphens are allowed.`,
        });
      }
      
      const normalizedSKU = body.sku.trim().toUpperCase();
      const conflict = await Ingredient.findOne({ 
        sku: normalizedSKU, 
        _id: { $ne: id } 
      });
      
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `SKU '${normalizedSKU}' already exists`,
        });
      }
      
      updateData.sku = normalizedSKU;
    }

    // ─── VALIDATE UNIT ──────────────────────────────────────────────────
    if (body.unit !== undefined) {
      if (!isValidUnit(body.unit)) {
        return res.status(400).json({
          success: false,
          error: `Invalid unit. Allowed units: ${ALLOWED_UNITS.join(', ')}`,
        });
      }
      updateData.unit = body.unit.trim().toLowerCase();
    }

    // ─── VALIDATE CATEGORY ID ───────────────────────────────────────────
    if (body.categoryId !== undefined) {
      if (body.categoryId && !isValidObjectId(body.categoryId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category ID format',
        });
      }
      updateData.categoryId = body.categoryId || null;
    }

    // ─── VALIDATE CURRENT STOCK ─────────────────────────────────────────
    if (body.currentStock !== undefined) {
      if (!isValidStock(body.currentStock)) {
        return res.status(400).json({
          success: false,
          error: `Current stock must be between 0 and ${MAX_STOCK_AMOUNT}`,
        });
      }
      updateData.currentStock = body.currentStock;
    }

    // ─── VALIDATE REORDER POINT ─────────────────────────────────────────
    if (body.reorderPoint !== undefined) {
      if (!isValidReorderPoint(body.reorderPoint)) {
        return res.status(400).json({
          success: false,
          error: `Reorder point must be between 0 and ${MAX_REORDER_POINT}`,
        });
      }
      updateData.reorderPoint = body.reorderPoint;
    }

    // ─── VALIDATE MIN STOCK ─────────────────────────────────────────────
    if (body.minStock !== undefined) {
      if (!isValidStock(body.minStock)) {
        return res.status(400).json({
          success: false,
          error: `Min stock must be between 0 and ${MAX_STOCK_AMOUNT}`,
        });
      }
      const maxStock = body.maxStock !== undefined ? body.maxStock : existingIngredient.maxStock;
      if (body.minStock > (maxStock || Number.MAX_SAFE_INTEGER)) {
        return res.status(400).json({
          success: false,
          error: 'Min stock cannot be greater than max stock',
        });
      }
      updateData.minStock = body.minStock;
    }

    // ─── VALIDATE MAX STOCK ─────────────────────────────────────────────
    if (body.maxStock !== undefined) {
      if (!isValidStock(body.maxStock)) {
        return res.status(400).json({
          success: false,
          error: `Max stock must be between 0 and ${MAX_STOCK_AMOUNT}`,
        });
      }
      const minStock = body.minStock !== undefined ? body.minStock : existingIngredient.minStock;
      if ((minStock || 0) > body.maxStock) {
        return res.status(400).json({
          success: false,
          error: 'Max stock cannot be less than min stock',
        });
      }
      updateData.maxStock = body.maxStock;
    }

    // ─── VALIDATE COST PER UNIT ─────────────────────────────────────────
    if (body.costPerUnit !== undefined) {
      if (!isValidPrice(body.costPerUnit)) {
        return res.status(400).json({
          success: false,
          error: 'Cost per unit must be a positive number',
        });
      }
      updateData.costPerUnit = body.costPerUnit;
    }

    // ─── VALIDATE LOCATION ──────────────────────────────────────────────
    if (body.storageLocation !== undefined) {
      if (!isValidLocation(body.storageLocation)) {
        return res.status(400).json({
          success: false,
          error: `Storage location cannot exceed ${MAX_LOCATION_LENGTH} characters`,
        });
      }
      updateData.storageLocation = body.storageLocation ? sanitizeInput(body.storageLocation.trim()) : '';
    }

    // ─── VALIDATE SUPPLIER ──────────────────────────────────────────────
    if (body.supplier !== undefined) {
      if (!isValidSupplier(body.supplier)) {
        return res.status(400).json({
          success: false,
          error: `Supplier name cannot exceed ${MAX_SUPPLIER_LENGTH} characters`,
        });
      }
      updateData.supplier = body.supplier ? sanitizeInput(body.supplier.trim()) : '';
    }

    // ─── VALIDATE DESCRIPTION ────────────────────────────────────────────
    if (body.description !== undefined) {
      if (!isValidText(body.description, MAX_DESCRIPTION_LENGTH_INGREDIENT)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH_INGREDIENT} characters`,
        });
      }
      updateData.description = body.description ? sanitizeInput(body.description.trim()) : '';
    }

    // ─── VALIDATE IS ACTIVE ─────────────────────────────────────────────
    if (body.isActive !== undefined) {
      if (!isValidBoolean(body.isActive)) {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
        });
      }
      updateData.isActive = body.isActive;
    }

    // ─── UPDATE INGREDIENT ──────────────────────────────────────────────
    const updated = await Ingredient.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    return res.json({
      success: true,
      data: sanitizeIngredient(updated),
      message: 'Ingredient updated successfully',
    });
  } catch (err) {
    console.error('[PATCH /api/ingredients/:id] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Ingredient with this SKU already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update ingredient',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete ingredient
// @route   DELETE /api/ingredients/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const deleteIngredient = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID format',
      });
    }

    // ─── FIND INGREDIENT ─────────────────────────────────────────────────
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    // ─── DELETE INGREDIENT ──────────────────────────────────────────────
    await Ingredient.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Ingredient '${sanitizeInput(ingredient.name)}' deleted successfully`,
    });
  } catch (err) {
    console.error('[DELETE /api/ingredients/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete ingredient',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Add stock to ingredient
// @route   PATCH /api/ingredients/:id/add-stock
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const addStock = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID format',
      });
    }

    // ─── VALIDATE QUANTITY ──────────────────────────────────────────────
    const { quantity, reason, note } = req.body;
    
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: 'Quantity is required',
      });
    }

    if (!Number.isFinite(quantity)) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a valid number',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0',
      });
    }

    if (quantity > MAX_STOCK_ADDITION) {
      return res.status(400).json({
        success: false,
        error: `Quantity cannot exceed ${MAX_STOCK_ADDITION}`,
      });
    }

    // ─── VALIDATE REASON ─────────────────────────────────────────────────
    const validReasons = ['purchase', 'return', 'adjustment', 'transfer', 'production'];
    if (reason && !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: `Invalid reason. Allowed: ${validReasons.join(', ')}`,
      });
    }

    // ─── FIND INGREDIENT ─────────────────────────────────────────────────
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    // ─── UPDATE STOCK ────────────────────────────────────────────────────
    const previousStock = ingredient.currentStock;
    ingredient.currentStock += quantity;
    
    // Check if stock exceeds max stock
    if (ingredient.maxStock > 0 && ingredient.currentStock > ingredient.maxStock) {
      return res.status(400).json({
        success: false,
        error: `Stock would exceed maximum stock (${ingredient.maxStock})`,
      });
    }

    await ingredient.save();

    console.log(`📦 Stock added: ${ingredient.name} +${quantity} ${ingredient.unit}`);

    return res.json({
      success: true,
      data: {
        ingredient: sanitizeIngredient(ingredient),
        added: quantity,
        previousStock,
        newStock: ingredient.currentStock,
      },
      message: `Added ${quantity} ${ingredient.unit} to ${ingredient.name}`,
    });
  } catch (err) {
    console.error('[PATCH /api/ingredients/:id/add-stock] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to add stock',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Deduct stock from ingredient
// @route   PATCH /api/ingredients/:id/deduct-stock
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const deductStock = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID format',
      });
    }

    // ─── VALIDATE QUANTITY ──────────────────────────────────────────────
    const { quantity, reason, note } = req.body;
    
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: 'Quantity is required',
      });
    }

    if (!Number.isFinite(quantity)) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a valid number',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0',
      });
    }

    if (quantity > MAX_STOCK_ADDITION) {
      return res.status(400).json({
        success: false,
        error: `Quantity cannot exceed ${MAX_STOCK_ADDITION}`,
      });
    }

    // ─── VALIDATE REASON ─────────────────────────────────────────────────
    const validReasons = ['usage', 'waste', 'expired', 'damage', 'return_to_supplier'];
    if (reason && !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: `Invalid reason. Allowed: ${validReasons.join(', ')}`,
      });
    }

    // ─── FIND INGREDIENT ─────────────────────────────────────────────────
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    // ─── CHECK STOCK ─────────────────────────────────────────────────────
    if (ingredient.currentStock < quantity) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock. Available: ${ingredient.currentStock} ${ingredient.unit}`,
      });
    }

    // ─── UPDATE STOCK ────────────────────────────────────────────────────
    const previousStock = ingredient.currentStock;
    ingredient.currentStock -= quantity;

    await ingredient.save();

    console.log(`📦 Stock deducted: ${ingredient.name} -${quantity} ${ingredient.unit}`);

    return res.json({
      success: true,
      data: {
        ingredient: sanitizeIngredient(ingredient),
        deducted: quantity,
        previousStock,
        newStock: ingredient.currentStock,
      },
      message: `Deducted ${quantity} ${ingredient.unit} from ${ingredient.name}`,
    });
  } catch (err) {
    console.error('[PATCH /api/ingredients/:id/deduct-stock] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to deduct stock',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete ingredients
// @route   DELETE /api/ingredients/bulk
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteIngredients = async (req, res) => {
  try {
    // ─── VALIDATE INPUT ──────────────────────────────────────────────────
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of ingredient IDs',
      });
    }
    
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 ingredients can be deleted at once',
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
    
    // ─── DELETE INGREDIENTS ─────────────────────────────────────────────
    const result = await Ingredient.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No ingredients found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} ingredients deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    console.error('[DELETE /api/ingredients/bulk] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete ingredients',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Toggle ingredient status
// @route   PATCH /api/ingredients/:id/toggle-status
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const toggleIngredientStatus = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID format',
      });
    }

    // ─── FIND INGREDIENT ─────────────────────────────────────────────────
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    // ─── TOGGLE STATUS ──────────────────────────────────────────────────
    ingredient.isActive = !ingredient.isActive;
    await ingredient.save();

    return res.json({
      success: true,
      data: sanitizeIngredient(ingredient),
      message: `Ingredient ${ingredient.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    console.error('[PATCH /api/ingredients/:id/toggle-status] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle ingredient status',
    });
  }
};