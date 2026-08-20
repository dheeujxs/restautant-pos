// controllers/dishController.js - COMPLETE FIXED VERSION

import Dish from '../models/Dish.js';
import Ingredient from '../models/Ingredient.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
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

const MAX_BULK_DELETE = 30;
const MAX_VARIANTS = 10;
const MAX_INGREDIENTS_PER_VARIANT = 20;
const MAX_DISH_NAME_LENGTH = 100;
const MAX_DISH_DESCRIPTION_LENGTH = 500;
const ALLOWED_DIETARY_TYPES = ['Veg', 'Non-veg', 'Vegan', 'Jain', 'Eggetarian'];
const ALLOWED_STOCK_TYPES = ['recipe', 'product'];
const ALLOWED_KOT_STATIONS = ['Main Kitchen', 'Tandoor', 'Bar', 'Cold Kitchen', 'Bakery', 'Grill'];
const ALLOWED_GLASS_TYPES = ['None', 'Small', 'Medium', 'Large', 'Extra Large'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
const ALLOWED_IMAGE_REGEX = /\.(jpg|jpeg|png|webp|gif|svg)$/i;

// ============================================================
//  VALIDATION HELPERS
// ============================================================

// Validate dish name
const isValidDishName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_DISH_NAME_LENGTH) return false;
  const nameRegex = /^[a-zA-Z0-9\s\-_.,&()'"]+$/;
  return nameRegex.test(trimmed);
};

// Validate dietary type
const isValidDietaryType = (type) => {
  if (!type) return false;
  return ALLOWED_DIETARY_TYPES.includes(type);
};

// Validate stock type
const isValidStockType = (type) => {
  if (!type) return false;
  return ALLOWED_STOCK_TYPES.includes(type);
};

// Validate KOT station
const isValidKotStation = (station) => {
  if (!station) return false;
  return ALLOWED_KOT_STATIONS.includes(station);
};

// Validate glass type
const isValidGlassType = (type) => {
  if (!type) return true;
  return ALLOWED_GLASS_TYPES.includes(type);
};

// Validate image URL with security checks
const isValidImageUrl = (imageUrl) => {
  if (!imageUrl) return true;
  
  if (imageUrl.startsWith('data:image')) {
    const base64Data = imageUrl.split(',')[1];
    if (!base64Data) return false;
    const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
    if (sizeInBytes > MAX_IMAGE_SIZE) return false;
    return true;
  }
  
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const maliciousPatterns = [
      /<script/i, /javascript:/i, /data:/i, /vbscript:/i,
      /onerror=/i, /onload=/i,
    ];
    for (const pattern of maliciousPatterns) {
      if (pattern.test(imageUrl)) return false;
    }
    return true;
  }
  
  return ALLOWED_IMAGE_REGEX.test(imageUrl);
};

// ─── Validate variants ─────────────────────────────────────────────────
const validateVariants = (variants) => {
  if (!variants || !Array.isArray(variants)) {
    return { valid: false, error: 'Variants must be an array' };
  }
  
  if (variants.length > MAX_VARIANTS) {
    return { valid: false, error: `Maximum ${MAX_VARIANTS} variants allowed` };
  }
  
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    
    if (!variant.name || variant.name.trim().length < 1 || variant.name.trim().length > 100) {
      return { valid: false, error: `Variant ${i + 1}: Invalid name` };
    }
    variant.name = sanitizeInput(variant.name.trim());
    
    if (!isValidPrice(variant.price)) {
      return { valid: false, error: `Variant ${i + 1}: Invalid price (must be between 0 and 1,000,000)` };
    }
    
    if (variant.ingredients && Array.isArray(variant.ingredients)) {
      if (variant.ingredients.length > MAX_INGREDIENTS_PER_VARIANT) {
        return { valid: false, error: `Variant ${i + 1}: Maximum ${MAX_INGREDIENTS_PER_VARIANT} ingredients allowed` };
      }
      
      for (let j = 0; j < variant.ingredients.length; j++) {
        const ing = variant.ingredients[j];
        
        if (ing.ingredientId && !isValidObjectId(ing.ingredientId)) {
          return { valid: false, error: `Variant ${i + 1}, Ingredient ${j + 1}: Invalid ingredient ID format` };
        }
        
        if (!ing.ingredientName || ing.ingredientName.trim().length < 1 || ing.ingredientName.trim().length > 100) {
          return { valid: false, error: `Variant ${i + 1}, Ingredient ${j + 1}: Invalid ingredient name` };
        }
        ing.ingredientName = sanitizeInput(ing.ingredientName.trim());
        
        if (!isValidQuantity(ing.quantity)) {
          return { valid: false, error: `Variant ${i + 1}, Ingredient ${j + 1}: Invalid quantity (must be between 1 and 999)` };
        }
        
        if (!ing.unit || ing.unit.trim().length < 1 || ing.unit.trim().length > 20) {
          return { valid: false, error: `Variant ${i + 1}, Ingredient ${j + 1}: Invalid unit` };
        }
        ing.unit = sanitizeInput(ing.unit.trim());
      }
    }
  }
  
  return { valid: true };
};

// ─── COMBO VALIDATION HELPER ──────────────────────────────────────────
const validateCombo = (isCombo, comboPrice, comboVariants) => {
  if (!isCombo) {
    return { valid: true };
  }

  if (!comboPrice && comboPrice !== 0) {
    return { valid: false, error: 'Combo price is required when combo is enabled' };
  }

  if (comboPrice <= 0) {
    return { valid: false, error: 'Combo price must be greater than 0' };
  }

  if (comboPrice > 1000000) {
    return { valid: false, error: 'Combo price cannot exceed 1,000,000' };
  }

  if (!comboVariants || !Array.isArray(comboVariants) || comboVariants.length === 0) {
    return { valid: false, error: 'At least one variant must be included in combo' };
  }

  if (comboVariants.length > MAX_VARIANTS) {
    return { valid: false, error: `Combo cannot include more than ${MAX_VARIANTS} variants` };
  }

  for (let i = 0; i < comboVariants.length; i++) {
    const cv = comboVariants[i];

    if (!cv.variantName || cv.variantName.trim().length < 1) {
      return { valid: false, error: `Combo variant ${i + 1}: variantName is required` };
    }

    if (cv.variantPrice === undefined || cv.variantPrice === null || cv.variantPrice <= 0) {
      return { valid: false, error: `Combo variant ${i + 1}: valid variantPrice is required` };
    }
  }
  
  return { valid: true };
};

// ─── SANITIZE DISH FOR RESPONSE ──────────────────────────────────────────
const sanitizeDish = (dish) => {
  if (!dish) return null;
  
  return {
    _id: dish._id,
    id: dish._id,
    name: sanitizeInput(dish.name || ''),
    description: sanitizeInput(dish.description || ''),
    categoryId: dish.categoryId,
    categoryName: sanitizeInput(dish.categoryName || ''),
    image: dish.image || '',
    price: dish.price || 0,
    basePrice: dish.basePrice || 0,
    dietaryType: dish.dietaryType || 'Veg',
    kotStation: dish.kotStation || 'Main Kitchen',
    glassType: dish.glassType || '',
    baseIngredient: sanitizeInput(dish.baseIngredient || ''),
    isActive: dish.isActive !== false,
    hasVariants: dish.hasVariants || false,
    variants: dish.variants?.map(v => ({
      ...v,
      name: sanitizeInput(v.name || ''),
      ingredients: v.ingredients?.map(ing => ({
        ...ing,
        ingredientName: sanitizeInput(ing.ingredientName || ''),
        unit: sanitizeInput(ing.unit || ''),
        notes: ing.notes ? sanitizeInput(ing.notes) : '',
      })) || [],
    })) || [],
    stockType: dish.stockType || 'recipe',
    currentStock: dish.currentStock || 0,
    preparationTime: dish.preparationTime || 15,
    isCombo: dish.isCombo === true,
    comboPrice: dish.comboPrice || 0,
    comboVariants: (dish.comboVariants || []).map(cv => ({
      variantIndex: cv.variantIndex || 0,
      variantName: sanitizeInput(cv.variantName || ''),
      variantPrice: cv.variantPrice || 0,
    })),
    createdAt: dish.createdAt,
    updatedAt: dish.updatedAt,
  };
};

// ============================================================
//  DISH CONTROLLERS
// ============================================================

// ─── GET ALL DISHES ──────────────────────────────────────────────────────
export const getDishes = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = req.query.search || '';
    const categoryId = req.query.categoryId || '';
    const dietaryType = req.query.dietaryType || '';
    const isActive = req.query.isActive;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    if (dietaryType && !isValidDietaryType(dietaryType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid dietary type. Allowed: ${ALLOWED_DIETARY_TYPES.join(', ')}`,
      });
    }

    const allowedSortFields = ['name', 'price', 'createdAt', 'updatedAt', 'preparationTime'];
    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        error: `Invalid sort field. Allowed: ${allowedSortFields.join(', ')}`,
      });
    }

    const filter = {};

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$text = { $search: sanitizedSearch };
    }

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category ID format',
        });
      }
      filter.categoryId = categoryId;
    }

    if (dietaryType) {
      filter.dietaryType = dietaryType;
    }

    const [dishes, total] = await Promise.all([
      Dish.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Dish.countDocuments(filter),
    ]);

    const categoryIds = [...new Set(dishes.map(d => d.categoryId).filter(Boolean))];
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));

    const sanitizedDishes = dishes.map(dish => ({
      ...sanitizeDish(dish),
      categoryName: categoryMap.get(dish.categoryId?.toString()) || dish.categoryName || '',
    }));

    return res.json({
      success: true,
      data: {
        dishes: sanitizedDishes,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: dishes.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/dishes] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dishes',
    });
  }
};

// ─── GET DISH BY ID ──────────────────────────────────────────────────────
export const getDishById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format',
      });
    }

    const dish = await Dish.findById(id).lean();
    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found',
      });
    }

    let categoryName = dish.categoryName || '';
    if (dish.categoryId) {
      const category = await Category.findById(dish.categoryId).lean();
      if (category) {
        categoryName = category.name;
      }
    }

    return res.json({
      success: true,
      data: {
        ...sanitizeDish(dish),
        categoryName: sanitizeInput(categoryName),
      },
    });
  } catch (err) {
    console.error('[GET /api/dishes/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dish',
    });
  }
};

// ─── CREATE DISH ─────────────────────────────────────────────────────────
export const createDish = async (req, res) => {
  try {
    console.log('📝 Admin: Creating dish...');
    
    const body = sanitizeObject(req.body);
    const required = ['name', 'categoryId', 'dietaryType', 'kotStation'];
    
    for (const field of required) {
      if (!body[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`,
        });
      }
    }
 
    if (!isValidDishName(body.name)) {
      return res.status(400).json({
        success: false,
        error: `Dish name must be between 1 and ${MAX_DISH_NAME_LENGTH} characters.`,
      });
    }
 
    if (body.description && !isValidText(body.description, MAX_DISH_DESCRIPTION_LENGTH)) {
      return res.status(400).json({
        success: false,
        error: `Description cannot exceed ${MAX_DISH_DESCRIPTION_LENGTH} characters`,
      });
    }
 
    if (!isValidObjectId(body.categoryId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID format',
      });
    }
 
    const category = await Category.findById(body.categoryId).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }
 
    if (!isValidDietaryType(body.dietaryType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid dietary type. Allowed: ${ALLOWED_DIETARY_TYPES.join(', ')}`,
      });
    }
 
    if (!isValidKotStation(body.kotStation)) {
      return res.status(400).json({
        success: false,
        error: `Invalid KOT station. Allowed: ${ALLOWED_KOT_STATIONS.join(', ')}`,
      });
    }
 
    let restaurantId = body.restaurantId || req.user?.restaurantId || null;
    let restaurantName = body.restaurantName || req.user?.restaurantName || '';
    let branchId = body.branchId || req.user?.branchId || null;
    let branchName = body.branchName || req.user?.branchName || '';
    
    if (restaurantId && !branchId) {
      try {
        const Branch = (await import('../models/super-admin/Branch.js')).default;
        const branch = await Branch.findOne({ restaurantId: restaurantId }).lean();
        if (branch) {
          branchId = branch._id;
          branchName = branch.name;
        }
      } catch (err) {
        console.log('⚠️ Could not auto-assign branch:', err.message);
      }
    }
    
    if (!restaurantId && category.restaurantId) {
      restaurantId = category.restaurantId;
      restaurantName = category.restaurantName || '';
    }
    
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant not assigned.',
      });
    }
 
    if (body.image && !isValidImageUrl(body.image)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Allowed: JPG, JPEG, PNG, WebP, GIF, SVG. Max 5MB.',
      });
    }
 
    if (body.price !== undefined && !isValidPrice(body.price)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price. Must be between 0 and 1,000,000',
      });
    }
 
    if (body.stockType && !isValidStockType(body.stockType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid stock type. Allowed: ${ALLOWED_STOCK_TYPES.join(', ')}`,
      });
    }
 
    if (body.currentStock !== undefined) {
      if (!Number.isInteger(body.currentStock) || body.currentStock < 0 || body.currentStock > 999999) {
        return res.status(400).json({
          success: false,
          error: 'Invalid current stock. Must be a positive integer',
        });
      }
    }

    // ─── DETERMINE DISH TYPE ────────────────────────────────────────────
    const isCombo = body.isCombo === true;
    const hasVariants = body.hasVariants === true;

    // 🔥 CRITICAL: If combo, validate combo data
    if (isCombo) {
      const comboValidation = validateCombo(isCombo, body.comboPrice, body.comboVariants);
      if (!comboValidation.valid) {
        return res.status(400).json({
          success: false,
          error: comboValidation.error,
        });
      }
    }

    // 🔥 CRITICAL: If regular dish, validate variants
    if (!isCombo && hasVariants) {
      if (!body.variants || body.variants.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one variant is required when hasVariants is true',
        });
      }
      
      const variantsValidation = validateVariants(body.variants);
      if (!variantsValidation.valid) {
        return res.status(400).json({
          success: false,
          error: variantsValidation.error,
        });
      }
    }
 
    const existingDish = await Dish.findOne({
      name: { $regex: new RegExp(`^${sanitizeInput(body.name.trim())}$`, 'i') },
      categoryId: body.categoryId,
      restaurantId: restaurantId,
    });
    
    if (existingDish) {
      return res.status(409).json({
        success: false,
        error: `Dish '${body.name}' already exists in this category`,
      });
    }

    // ─── BUILD DISH DATA ─────────────────────────────────────────────────
    const dishData = {
      restaurantId: restaurantId,
      restaurantName: restaurantName,
      branchId: branchId,
      branchName: branchName,
      name: sanitizeInput(body.name.trim()),
      description: body.description ? sanitizeInput(body.description.trim()) : '',
      categoryId: body.categoryId,
      categoryName: sanitizeInput(category.name),
      image: body.image || '',
      dietaryType: body.dietaryType,
      kotStation: body.kotStation,
      glassType: body.glassType || '',
      baseIngredient: body.baseIngredient ? sanitizeInput(body.baseIngredient) : '',
      isActive: body.isActive !== false,
      stockType: body.stockType || 'recipe',
      currentStock: body.currentStock || 0,
      preparationTime: body.preparationTime || 15,
      createdBy: req.user?._id,
      createdByType: 'admin',
      
      // 🔥 CRITICAL: Force values based on isCombo
      isCombo: isCombo,
      hasVariants: isCombo ? false : hasVariants,
      variants: isCombo ? [] : (hasVariants ? body.variants.map(v => ({
        ...v,
        name: sanitizeInput(v.name),
        ingredients: v.ingredients?.map(ing => ({
          ...ing,
          ingredientName: sanitizeInput(ing.ingredientName),
          unit: sanitizeInput(ing.unit),
          notes: ing.notes ? sanitizeInput(ing.notes) : '',
        })) || [],
      })) : []),
      comboPrice: isCombo ? Number(body.comboPrice) || 0 : 0,
      comboVariants: isCombo ? (body.comboVariants || []).map(cv => ({
        variantIndex: cv.variantIndex || 0,
        variantName: sanitizeInput(cv.variantName || ''),
        variantPrice: Number(cv.variantPrice) || 0,
      })) : [],
    };

    // 🔥 Set price for combo
    if (isCombo) {
      dishData.price = Number(body.comboPrice) || 0;
      dishData.basePrice = Number(body.comboPrice) || 0;
    } else {
      dishData.price = 0;
      dishData.basePrice = Number(body.basePrice) || 0;
    }

    console.log('📝 Creating dish:', JSON.stringify({
      name: dishData.name,
      isCombo: dishData.isCombo,
      hasVariants: dishData.hasVariants,
      variantsCount: dishData.variants.length,
      comboVariantCount: dishData.comboVariants.length,
    }, null, 2));

    const dish = await Dish.create(dishData);
 
    console.log('✅ Dish created:', dish._id);
 
    return res.status(201).json({
      success: true,
      data: sanitizeDish(dish),
      message: 'Dish created successfully',
    });
  } catch (err) {
    console.error('❌ [POST /api/dishes] ERROR:', err.message);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors,
      });
    }
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Dish with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Failed to create dish',
    });
  }
};

// ─── UPDATE DISH ─────────────────────────────────────────────────────────
export const updateDish = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format',
      });
    }

    const existingDish = await Dish.findById(id);
    if (!existingDish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found',
      });
    }

    const body = sanitizeObject(req.body);
    const updateData = {};

    console.log('📝 Updating dish:', body);

    // ─── IMAGE ─────────────────────────────────────────────────────────────
    if (body.image !== undefined) {
      if (body.image === '' || body.image === null) {
        updateData.image = '';
      } else if (typeof body.image === 'string' && body.image.trim().length > 0) {
        const imageUrl = body.image.trim();
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || 
            imageUrl.startsWith('/uploads/') || !imageUrl.includes('..')) {
          updateData.image = imageUrl;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid image URL format',
          });
        }
      } else {
        updateData.image = '';
      }
    }

    // ─── COMBO FLAG ──────────────────────────────────────────────────────
    if (body.isCombo !== undefined) {
      if (typeof body.isCombo !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isCombo must be a boolean',
        });
      }
      
      const isCombo = body.isCombo === true;
      updateData.isCombo = isCombo;
      
      if (isCombo) {
        // 🔥 Converting to COMBO: Clear all variant data
        const comboValidation = validateCombo(isCombo, body.comboPrice, body.comboVariants);
        if (!comboValidation.valid) {
          return res.status(400).json({
            success: false,
            error: comboValidation.error,
          });
        }
        
        updateData.hasVariants = false;
        updateData.variants = [];
        updateData.comboPrice = Number(body.comboPrice) || 0;
        updateData.comboVariants = (body.comboVariants || []).map(cv => ({
          variantIndex: cv.variantIndex || 0,
          variantName: sanitizeInput(cv.variantName || ''),
          variantPrice: Number(cv.variantPrice) || 0,
        }));
        updateData.price = Number(body.comboPrice) || 0;
        updateData.basePrice = Number(body.comboPrice) || 0;
      } else {
        // 🔥 Converting to REGULAR: Clear combo data
        updateData.comboPrice = 0;
        updateData.comboVariants = [];
        updateData.hasVariants = true;
      }
    }

    // ─── HAS VARIANTS ─────────────────────────────────────────────────────
    if (body.hasVariants !== undefined && body.isCombo === undefined) {
      if (typeof body.hasVariants !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'hasVariants must be a boolean',
        });
      }
      updateData.hasVariants = body.hasVariants;
      
      if (body.hasVariants === true) {
        if (body.variants && body.variants.length > 0) {
          const variantsValidation = validateVariants(body.variants);
          if (!variantsValidation.valid) {
            return res.status(400).json({
              success: false,
              error: variantsValidation.error,
            });
          }
          updateData.variants = body.variants;
        } else if (existingDish.variants && existingDish.variants.length > 0) {
          // Keep existing variants
        } else {
          return res.status(400).json({
            success: false,
            error: 'At least one variant is required when hasVariants is true',
          });
        }
        updateData.price = 0;
      } else {
        if (body.price !== undefined) {
          if (!isValidPrice(body.price)) {
            return res.status(400).json({
              success: false,
              error: 'Invalid price. Must be between 0 and 1,000,000',
            });
          }
          updateData.price = body.price;
        }
      }
    }

    // ─── NAME ─────────────────────────────────────────────────────────────
    if (body.name !== undefined) {
      if (!isValidDishName(body.name)) {
        return res.status(400).json({
          success: false,
          error: `Dish name must be between 1 and ${MAX_DISH_NAME_LENGTH} characters.`,
        });
      }
      
      const conflict = await Dish.findOne({
        name: { $regex: new RegExp(`^${sanitizeInput(body.name.trim())}$`, 'i') },
        categoryId: body.categoryId || existingDish.categoryId,
        _id: { $ne: id }
      });
      
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `Dish '${body.name}' already exists in this category`,
        });
      }
      
      updateData.name = sanitizeInput(body.name.trim());
    }

    // ─── DESCRIPTION ──────────────────────────────────────────────────────
    if (body.description !== undefined) {
      if (!isValidText(body.description, MAX_DISH_DESCRIPTION_LENGTH)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_DISH_DESCRIPTION_LENGTH} characters`,
        });
      }
      updateData.description = body.description ? sanitizeInput(body.description.trim()) : '';
    }

    // ─── CATEGORY ─────────────────────────────────────────────────────────
    if (body.categoryId !== undefined) {
      if (!isValidObjectId(body.categoryId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category ID format',
        });
      }
      
      const category = await Category.findById(body.categoryId).lean();
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found',
        });
      }
      
      updateData.categoryId = body.categoryId;
      updateData.categoryName = sanitizeInput(category.name);
    }

    // ─── DIETARY TYPE ─────────────────────────────────────────────────────
    if (body.dietaryType !== undefined) {
      if (!isValidDietaryType(body.dietaryType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid dietary type. Allowed: ${ALLOWED_DIETARY_TYPES.join(', ')}`,
        });
      }
      updateData.dietaryType = body.dietaryType;
    }

    // ─── KOT STATION ──────────────────────────────────────────────────────
    if (body.kotStation !== undefined) {
      if (!isValidKotStation(body.kotStation)) {
        return res.status(400).json({
          success: false,
          error: `Invalid KOT station. Allowed: ${ALLOWED_KOT_STATIONS.join(', ')}`,
        });
      }
      updateData.kotStation = body.kotStation;
    }

    // ─── GLASS TYPE ──────────────────────────────────────────────────────
    if (body.glassType !== undefined) {
      if (!isValidGlassType(body.glassType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid glass type. Allowed: ${ALLOWED_GLASS_TYPES.join(', ')}`,
        });
      }
      updateData.glassType = body.glassType;
    }

    // ─── PRICE ────────────────────────────────────────────────────────────
    if (body.price !== undefined && body.isCombo === undefined && body.hasVariants === undefined) {
      if (!isValidPrice(body.price)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid price. Must be between 0 and 1,000,000',
        });
      }
      updateData.price = body.price;
    }

    // ─── OTHER FIELDS ────────────────────────────────────────────────────
    if (body.stockType !== undefined) {
      if (!isValidStockType(body.stockType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid stock type. Allowed: ${ALLOWED_STOCK_TYPES.join(', ')}`,
        });
      }
      updateData.stockType = body.stockType;
    }

    if (body.currentStock !== undefined) {
      if (!Number.isInteger(body.currentStock) || body.currentStock < 0 || body.currentStock > 999999) {
        return res.status(400).json({
          success: false,
          error: 'Invalid current stock. Must be a positive integer',
        });
      }
      updateData.currentStock = body.currentStock;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
        });
      }
      updateData.isActive = body.isActive;
    }

    if (body.baseIngredient !== undefined) {
      updateData.baseIngredient = body.baseIngredient ? sanitizeInput(body.baseIngredient) : '';
    }

    if (body.preparationTime !== undefined) {
      if (!Number.isInteger(body.preparationTime) || body.preparationTime < 0 || body.preparationTime > 999) {
        return res.status(400).json({
          success: false,
          error: 'Invalid preparation time. Must be a positive integer',
        });
      }
      updateData.preparationTime = body.preparationTime;
    }

    // ─── VARIANTS (only if not combo and not already handled) ──────────
    if (body.variants !== undefined && body.isCombo === undefined && body.hasVariants === undefined) {
      const variantsValidation = validateVariants(body.variants);
      if (!variantsValidation.valid) {
        return res.status(400).json({
          success: false,
          error: variantsValidation.error,
        });
      }
      updateData.variants = body.variants;
      updateData.hasVariants = true;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    console.log('📝 Update data:', JSON.stringify(updateData, null, 2));

    const updated = await Dish.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    console.log('✅ Dish updated:', updated._id);

    return res.json({
      success: true,
      data: sanitizeDish(updated),
      message: 'Dish updated successfully',
    });
  } catch (err) {
    console.error('[PATCH /api/dishes/:id] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Dish with this name already exists',
      });
    }
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Failed to update dish',
    });
  }
};

// ─── DELETE DISH ─────────────────────────────────────────────────────────
export const deleteDish = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format',
      });
    }

    const dish = await Dish.findById(id);
    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found',
      });
    }

    await Dish.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Dish '${sanitizeInput(dish.name)}' deleted successfully`,
    });
  } catch (err) {
    console.error('[DELETE /api/dishes/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete dish',
    });
  }
};

// ─── VALIDATE STOCK ──────────────────────────────────────────────────────
export const validateDishStock = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format',
      });
    }

    const { quantity } = req.body;
    if (!isValidQuantity(quantity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity. Must be between 1 and 999',
      });
    }

    const dish = await Dish.findById(id).lean();
    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found',
      });
    }

    if (dish.stockType === 'product') {
      if (dish.currentStock < quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${sanitizeInput(dish.name)}. Only ${dish.currentStock} left.`,
        });
      }
      return res.json({
        success: true,
        data: {
          available: true,
          currentStock: dish.currentStock,
          required: quantity,
        },
      });
    }

    const insufficientIngredients = [];

    if (dish.variants && dish.variants.length > 0) {
      const variant = dish.variants[0];
      
      if (variant.ingredients && Array.isArray(variant.ingredients)) {
        for (const ing of variant.ingredients) {
          if (ing.ingredientId) {
            const ingredient = await Ingredient.findById(ing.ingredientId);
            const required = ing.quantity * quantity;
            
            if (!ingredient) {
              insufficientIngredients.push({
                name: ing.ingredientName || 'Unknown',
                required,
                available: 0,
                unit: ing.unit || 'unit',
              });
            } else if (ingredient.currentStock < required) {
              insufficientIngredients.push({
                name: ingredient.name || ing.ingredientName,
                required,
                available: ingredient.currentStock,
                unit: ingredient.unit || ing.unit || 'unit',
              });
            }
          }
        }
      }
    }

    if (insufficientIngredients.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient ingredients',
        insufficientIngredients,
      });
    }

    return res.json({
      success: true,
      data: {
        available: true,
        required: quantity,
      },
    });
  } catch (err) {
    console.error('[POST /api/dishes/:id/validate-stock] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate stock',
    });
  }
};

// ─── BULK DELETE ─────────────────────────────────────────────────────────
export const bulkDeleteDishes = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of dish IDs',
      });
    }
    
    if (ids.length > MAX_BULK_DELETE) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_BULK_DELETE} dishes can be deleted at once`,
      });
    }
    
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ID format: ${invalidIds.join(', ')}`,
      });
    }
    
    const result = await Dish.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No dishes found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} dishes deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    console.error('[DELETE /api/dishes/bulk] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete dishes',
    });
  }
};


// ──────────────────────────────────────────────────────────────────────────
// @desc    Check availability for multiple dishes (bulk)
// @route   POST /api/dishes/availability
// @access  Private (Staff/Admin)
// ──────────────────────────────────────────────────────────────────────────

export const checkDishAvailability = async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of items with productId and quantity',
      });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId || !isValidObjectId(item.productId)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Invalid productId`,
        });
      }
      if (!isValidQuantity(item.quantity)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Quantity must be between 1 and 999`,
        });
      }
    }

    const results = [];

    for (const item of items) {
      const dish = await Dish.findById(item.productId).lean();
      if (!dish) {
        results.push({
          productId: item.productId,
          productName: 'Unknown',
          available: false,
          error: 'Dish not found',
        });
        continue;
      }

      // Check if dish is active
      if (dish.isActive === false) {
        results.push({
          productId: dish._id,
          productName: sanitizeInput(dish.name),
          available: false,
          error: 'Dish is inactive',
        });
        continue;
      }

      // If it's a product-type stock (not recipe), check simple stock
      if (dish.stockType === 'product') {
        const available = dish.currentStock >= item.quantity;
        results.push({
          productId: dish._id,
          productName: sanitizeInput(dish.name),
          available,
          currentStock: dish.currentStock,
          required: item.quantity,
          insufficientIngredients: available ? [] : [{ name: 'Stock', required: item.quantity, available: dish.currentStock, unit: 'unit' }],
        });
        continue;
      }

      // Recipe-type: check ingredients
      const insufficientIngredients = [];
      const variant = dish.variants && dish.variants.length > 0 ? dish.variants[0] : null;

      if (variant && variant.ingredients) {
        for (const ing of variant.ingredients) {
          if (ing.ingredientId) {
            const ingredient = await Ingredient.findById(ing.ingredientId);
            const required = ing.quantity * item.quantity;
            if (!ingredient) {
              insufficientIngredients.push({
                name: ing.ingredientName || 'Unknown',
                required,
                available: 0,
                unit: ing.unit || 'unit',
              });
            } else if (ingredient.currentStock < required) {
              insufficientIngredients.push({
                name: ingredient.name || ing.ingredientName,
                required,
                available: ingredient.currentStock,
                unit: ingredient.unit || ing.unit || 'unit',
              });
            }
          }
        }
      }

      const available = insufficientIngredients.length === 0;
      results.push({
        productId: dish._id,
        productName: sanitizeInput(dish.name),
        available,
        insufficientIngredients,
        currentStock: dish.currentStock,
        required: item.quantity,
      });
    }

    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error('[POST /api/dishes/availability] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to check availability',
    });
  }
};
// ─── EXPORTS ──────────────────────────────────────────────────────────────

export default {
  getDishes,
  getDishById,
  createDish,
  updateDish,
  deleteDish,
  validateDishStock,
  bulkDeleteDishes,
};