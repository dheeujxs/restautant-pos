// controllers/super-admin/dishController.js - FULL COMBO SUPPORT

import Dish from '../../models/Dish.js';
import Restaurant from '../../models/super-admin/Restaurant.js';
import Branch from '../../models/super-admin/Branch.js';
import Category from '../../models/Category.js';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  isValidPrice,
  isValidQuantity,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

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
    /(--)/g, /(\/\*)/g, /(\*\/)/g, /(;+\s*$)/g,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

const checkForXSSPatterns = (str) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;

  const patterns = [
    /<script>/gi, /javascript:/gi, /onerror\s*=/gi,
    /onload\s*=/gi, /<iframe>/gi, /<object>/gi,
    /<embed>/gi, /eval\s*\(/gi, /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// ============================================================
//  AUDIT LOGGER
// ============================================================

const logSecurityEvent = async (eventType, userId, details = {}) => {
  try {
    console.log('🔒 SECURITY EVENT:', {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'anonymous',
      ...details,
    });
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
};

// ============================================================
//  VALIDATION HELPERS
// ============================================================

const isValidDishName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_DISH_NAME_LENGTH) return false;
  const nameRegex = /^[a-zA-Z0-9\s\-_.,&()'"]+$/;
  return nameRegex.test(trimmed);
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

// ─── COMBO VALIDATION ───────────────────────────────────────────────────
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
  
  // Calculate display price
  let displayPrice = `₹${dish.price || 0}`;
  
  // 🔥 If combo, show combo price
  if (dish.isCombo && dish.comboPrice > 0) {
    displayPrice = `₹${dish.comboPrice.toFixed(2)}`;
  } else if (dish.variants && dish.variants.length > 0) {
    const prices = dish.variants.map(v => v.price).filter(p => p !== undefined && p !== null);
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (minPrice === maxPrice) {
        displayPrice = `₹${minPrice.toFixed(2)}`;
      } else {
        displayPrice = `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
      }
    }
  }
  
  return {
    _id: dish._id,
    id: dish._id,
    restaurantId: dish.restaurantId,
    restaurantName: sanitizeInput(dish.restaurantName || ''),
    branchId: dish.branchId || null,
    branchName: sanitizeInput(dish.branchName || 'Main'),
    name: sanitizeInput(dish.name || ''),
    description: sanitizeInput(dish.description || ''),
    categoryId: dish.categoryId,
    categoryName: sanitizeInput(dish.categoryName || ''),
    image: dish.image || '',
    price: dish.price || 0,
    displayPrice: displayPrice,
    dietaryType: dish.dietaryType || 'Veg',
    kotStation: dish.kotStation || 'Main Kitchen',
    glassType: dish.glassType || '',
    baseIngredient: sanitizeInput(dish.baseIngredient || ''),
    isActive: dish.isActive !== false,
    isDeleted: dish.isDeleted || false,
    hasVariants: dish.hasVariants || false,
    variantCount: dish.variants?.length || 0,
    variants: dish.variants?.map(v => ({
      ...v,
      name: sanitizeInput(v.name || ''),
      ingredients: v.ingredients?.map(ing => ({
        ...ing,
        ingredientName: sanitizeInput(ing.ingredientName || ''),
        unit: sanitizeInput(ing.unit || ''),
      })) || [],
    })) || [],
    stockType: dish.stockType || 'recipe',
    currentStock: dish.currentStock || 0,
    prepTimeMinutes: dish.prepTimeMinutes || 15,
    createdBy: dish.createdBy,
    createdByName: dish.createdByName,
    createdAt: dish.createdAt,
    updatedAt: dish.updatedAt,
    
    // 🔥🔥🔥 COMBO FIELDS 🔥🔥🔥
    isCombo: dish.isCombo === true,
    comboPrice: dish.comboPrice || 0,
    comboVariants: (dish.comboVariants || []).map(cv => ({
      variantIndex: cv.variantIndex || 0,
      variantName: sanitizeInput(cv.variantName || ''),
      variantPrice: cv.variantPrice || 0,
    })),
  };
};

// ============================================================
//  ─── GET ALL DISHES ──────────────────────────────────────────
// ============================================================

export const getDishes = async (req, res) => {
  try {
    console.log('🍽️ Super Admin: Fetching all dishes...');

    const {
      restaurantId,
      branchId,
      categoryId,
      dietaryType,
      kotStation,
      search,
      isActive,
      createdBy,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = { isDeleted: false };

    // ─── RESTAURANT FILTER ──────────────────────────────────────────────
    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = restaurantId;
    }

    // ─── BRANCH FILTER ──────────────────────────────────────────────────
    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      
      filter.$or = [
        { branchId: branchId },
        { branchId: null },
        { branchId: { $exists: false } }
      ];
    }

    // ─── CATEGORY FILTER ──────────────────────────────────────────────
    if (categoryId && categoryId !== 'all') {
      if (!isValidObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category ID format',
        });
      }
      filter.categoryId = categoryId;
    }

    // ─── DIETARY TYPE FILTER ──────────────────────────────────────────
    if (dietaryType && dietaryType !== 'all') {
      if (!ALLOWED_DIETARY_TYPES.includes(dietaryType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid dietary type. Allowed: ${ALLOWED_DIETARY_TYPES.join(', ')}`,
        });
      }
      filter.dietaryType = dietaryType;
    }

    // ─── KOT STATION FILTER ──────────────────────────────────────────
    if (kotStation && kotStation !== 'all') {
      if (!ALLOWED_KOT_STATIONS.includes(kotStation)) {
        return res.status(400).json({
          success: false,
          error: `Invalid KOT station. Allowed: ${ALLOWED_KOT_STATIONS.join(', ')}`,
        });
      }
      filter.kotStation = kotStation;
    }

    // ─── ACTIVE STATUS FILTER ────────────────────────────────────────
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // ─── CREATED BY FILTER ────────────────────────────────────────────
    if (createdBy && createdBy !== 'all') {
      filter.createdByType = createdBy;
    }

    // ─── SEARCH FILTER ──────────────────────────────────────────────────
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      if (checkForSQLInjection(sanitizedSearch) || checkForXSSPatterns(sanitizedSearch)) {
        await logSecurityEvent('SQL_INJECTION_ATTEMPT', req.admin?._id, {
          ip: req.ip,
          search: sanitizedSearch,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid search query',
        });
      }
      filter.$text = { $search: sanitizedSearch };
    }

    // ─── PAGINATION ────────────────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // ─── SORTING ──────────────────────────────────────────────────────
    const sortOptions = {};
    const allowedSortFields = ['name', 'price', 'createdAt', 'updatedAt', 'prepTimeMinutes'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    console.log('🔍 Filter:', JSON.stringify(filter, null, 2));

    // ─── FETCH DISHES ──────────────────────────────────────────────────
    const [dishes, total] = await Promise.all([
      Dish.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Dish.countDocuments(filter),
    ]);

    console.log(`📊 Found ${dishes.length} dishes (total: ${total})`);

    // ─── GET RESTAURANT NAMES ────────────────────────────────────────
    const restaurantIds = [...new Set(dishes.map(d => d.restaurantId).filter(Boolean))];
    const restaurants = await Restaurant.find(
      { _id: { $in: restaurantIds } },
      { _id: 1, name: 1 }
    ).lean();
    const restaurantMap = new Map(restaurants.map(r => [r._id.toString(), r.name]));

    // ─── GET BRANCH NAMES ──────────────────────────────────────────────
    const branchIds = [...new Set(dishes.map(d => d.branchId).filter(Boolean))];
    let branchMap = new Map();
    
    if (branchIds.length > 0) {
      const branches = await Branch.find(
        { _id: { $in: branchIds } },
        { _id: 1, name: 1, restaurantId: 1 }
      ).lean();
      branchMap = new Map(branches.map(b => [b._id.toString(), b.name]));
    }

    // ─── GET CATEGORY NAMES ──────────────────────────────────────────
    const categoryIds = [...new Set(dishes.map(d => d.categoryId).filter(Boolean))];
    const categories = await Category.find(
      { _id: { $in: categoryIds } },
      { _id: 1, name: 1 }
    ).lean();
    const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));

    // ─── SANITIZE RESPONSE ────────────────────────────────────────────
    const sanitizedDishes = dishes.map(dish => {
      const base = sanitizeDish(dish);
      
      let branchName = 'All Branches';
      if (dish.branchId) {
        branchName = branchMap.get(dish.branchId?.toString()) || dish.branchName || 'All Branches';
      }
      
      return {
        ...base,
        restaurantName: restaurantMap.get(dish.restaurantId?.toString()) || dish.restaurantName || 'Unknown',
        branchName: branchName,
        categoryName: categoryMap.get(dish.categoryId?.toString()) || dish.categoryName || 'Unknown',
        createdByName: dish.createdByName || (dish.createdBy ? 'Admin' : 'Super Admin'),
        createdByType: dish.createdBy ? 'admin' : 'superadmin',
        branch: dish.branchId ? {
          id: dish.branchId,
          name: branchName
        } : null,
        variantPrices: dish.variants?.map(v => v.price) || [],
        minPrice: dish.variants?.length > 0 ? Math.min(...dish.variants.map(v => v.price)) : dish.price,
        maxPrice: dish.variants?.length > 0 ? Math.max(...dish.variants.map(v => v.price)) : dish.price,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        dishes: sanitizedDishes,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        count: sanitizedDishes.length,
      },
    });
  } catch (error) {
    console.error('❌ Super Admin Get Dishes Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dishes',
    });
  }
};

// ============================================================
//  ─── GET DISH STATS ──────────────────────────────────────────
// ============================================================

export const getDishStats = async (req, res) => {
  try {
    console.log('📊 Super Admin: Fetching dish stats...');

    const { restaurantId, branchId } = req.query;

    const filter = { isDeleted: false };
    
    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined' && restaurantId !== '') {
      if (isValidObjectId(restaurantId)) {
        filter.restaurantId = restaurantId;
      }
    }
    
    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      if (isValidObjectId(branchId)) {
        filter.$or = [
          { branchId: branchId },
          { branchId: null },
          { branchId: { $exists: false } }
        ];
      }
    }

    const [
      totalDishes,
      activeDishes,
      inactiveDishes,
      vegDishes,
      nonVegDishes,
      byCategory,
      byRestaurant,
      byCreatedBy,
    ] = await Promise.all([
      Dish.countDocuments(filter),
      Dish.countDocuments({ ...filter, isActive: true }),
      Dish.countDocuments({ ...filter, isActive: false }),
      Dish.countDocuments({ ...filter, dietaryType: 'Veg' }),
      Dish.countDocuments({ ...filter, dietaryType: { $in: ['Non-veg', 'Eggetarian'] } }),
      Dish.aggregate([
        { $match: filter },
        { $group: { _id: '$categoryName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Dish.aggregate([
        { $match: filter },
        { $group: { _id: '$restaurantName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Dish.aggregate([
        { $match: filter },
        { 
          $group: { 
            _id: { 
              $cond: [{ $ifNull: ['$createdBy', false] }, 'admin', 'superadmin'] 
            }, 
            count: { $sum: 1 } 
          } 
        },
      ]),
    ]);

    const stats = {
      totalDishes,
      activeDishes,
      inactiveDishes,
      vegDishes,
      nonVegDishes,
      byCategory: byCategory.map(c => ({
        category: c._id || 'Uncategorized',
        count: c.count,
      })),
      byRestaurant: byRestaurant.map(r => ({
        restaurant: r._id || 'Unknown',
        count: r.count,
      })),
      byCreatedBy: {
        superadmin: byCreatedBy.find(c => c._id === 'superadmin')?.count || 0,
        admin: byCreatedBy.find(c => c._id === 'admin')?.count || 0,
      },
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Super Admin Get Dish Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dish stats',
    });
  }
};

// ============================================================
//  ─── GET DISH BY ID ──────────────────────────────────────────
// ============================================================

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

    if (!dish || dish.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found',
      });
    }

    console.log('📤 Dish found:', {
      id: dish._id,
      name: dish.name,
      isCombo: dish.isCombo,
      comboPrice: dish.comboPrice,
      comboVariants: dish.comboVariants?.length || 0,
    });

    res.status(200).json({
      success: true,
      data: sanitizeDish(dish),
    });
  } catch (error) {
    console.error('❌ Super Admin Get Dish Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dish',
    });
  }
};

// ============================================================
//  ─── CREATE DISH ─────────────────────────────────────────────
// ============================================================

export const createDish = async (req, res) => {
  try {
    console.log('📝 Super Admin: Creating dish...');
    
    const adminId = req.admin?._id || req.user?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    const body = sanitizeObject(req.body);

    // ─── VALIDATE REQUIRED FIELDS ─────────────────────────────────────
    const required = ['name', 'restaurantId', 'categoryId', 'dietaryType', 'kotStation'];
    for (const field of required) {
      if (!body[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`,
        });
      }
    }

    // ─── CHECK FOR INJECTION ────────────────────────────────────────────
    const injectionFields = ['name', 'description', 'baseIngredient'];
    for (const field of injectionFields) {
      const value = body[field];
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        await logSecurityEvent('SQL_INJECTION_ATTEMPT', adminId, {
          ip: clientIp,
          field,
          value,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
        });
      }
    }

    // ─── VALIDATE NAME ──────────────────────────────────────────────────
    if (!isValidDishName(body.name)) {
      return res.status(400).json({
        success: false,
        error: `Dish name must be between 1 and ${MAX_DISH_NAME_LENGTH} characters`,
      });
    }

    // ─── VALIDATE RESTAURANT ────────────────────────────────────────────
    const restaurant = await Restaurant.findById(body.restaurantId).lean();
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // ─── VALIDATE BRANCH ──────────────────────────────────────────────
    let branchName = 'All Branches';
    let branchId = body.branchId || null;
    
    if (body.branchId) {
      const branch = await Branch.findOne({ 
        _id: body.branchId, 
        restaurantId: body.restaurantId 
      }).lean();
      
      if (branch) {
        branchName = branch.name || 'Main';
        branchId = branch._id;
      } else {
        branchId = null;
        branchName = 'All Branches';
      }
    }

    // ─── VALIDATE CATEGORY ──────────────────────────────────────────────
    const category = await Category.findById(body.categoryId).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // ─── VALIDATE DIETARY TYPE ──────────────────────────────────────────
    if (!ALLOWED_DIETARY_TYPES.includes(body.dietaryType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid dietary type. Allowed: ${ALLOWED_DIETARY_TYPES.join(', ')}`,
      });
    }

    // ─── VALIDATE KOT STATION ────────────────────────────────────────────
    if (!ALLOWED_KOT_STATIONS.includes(body.kotStation)) {
      return res.status(400).json({
        success: false,
        error: `Invalid KOT station. Allowed: ${ALLOWED_KOT_STATIONS.join(', ')}`,
      });
    }

    // ─── DETERMINE DISH TYPE ──────────────────────────────────────────
    const isCombo = body.isCombo === true;
    const hasVariants = body.hasVariants === true;

    // 🔥 If combo, validate combo data
    if (isCombo) {
      const comboValidation = validateCombo(isCombo, body.comboPrice, body.comboVariants);
      if (!comboValidation.valid) {
        return res.status(400).json({
          success: false,
          error: comboValidation.error,
        });
      }
    }

    // 🔥 If regular dish, validate variants
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

    // ─── CHECK DUPLICATE ──────────────────────────────────────────────────
    const existingDish = await Dish.findOne({
      name: { $regex: new RegExp(`^${sanitizeInput(body.name.trim())}$`, 'i') },
      restaurantId: body.restaurantId,
      isDeleted: false,
    });
    
    if (existingDish) {
      return res.status(409).json({
        success: false,
        error: `Dish '${body.name}' already exists in this restaurant`,
      });
    }

    // ─── CREATE DISH DATA ─────────────────────────────────────────────
    const dishData = {
      restaurantId: body.restaurantId,
      restaurantName: sanitizeInput(restaurant.name),
      branchId: branchId,
      branchName: sanitizeInput(branchName),
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
      prepTimeMinutes: body.prepTimeMinutes || 15,
      createdBy: null,
      createdByName: req.admin?.firstName || 'Super Admin',
      createdByType: 'superadmin',
      updatedBy: adminId,
      
      // 🔥🔥🔥 COMBO FIELDS 🔥🔥🔥
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
      comboPrice: dishData.comboPrice,
    }, null, 2));

    const dish = await Dish.create(dishData);

    await logSecurityEvent('DISH_CREATED', adminId, {
      dishId: dish._id,
      dishName: dish.name,
      restaurantId: dish.restaurantId,
      branchId: dish.branchId,
      isCombo: dish.isCombo,
      ip: clientIp,
    });

    console.log(`✅ Super Admin: Dish created: ${dish.name}`);
    if (dish.isCombo) {
      console.log(`🎁 Combo created with ${dish.comboVariants?.length} items at ₹${dish.comboPrice}`);
    }

    res.status(201).json({
      success: true,
      data: sanitizeDish(dish),
      message: 'Dish created successfully by Super Admin',
    });
  } catch (error) {
    console.error('❌ Super Admin Create Dish Error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A dish with this name already exists in this restaurant',
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create dish',
    });
  }
};

// ============================================================
//  ─── UPDATE DISH ─────────────────────────────────────────────
// ============================================================

export const updateDish = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin?._id || req.user?._id;
    const clientIp = req.ip || req.connection.remoteAddress;
    const body = sanitizeObject(req.body);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format',
      });
    }

    const dish = await Dish.findById(id);
    if (!dish || dish.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found',
      });
    }

    console.log('📝 Updating dish:', {
      id: id,
      name: dish.name,
      currentIsCombo: dish.isCombo,
      newIsCombo: body.isCombo,
    });

    // ─── CHECK FOR INJECTION ────────────────────────────────────────────
    const injectionFields = ['name', 'description', 'baseIngredient'];
    for (const field of injectionFields) {
      const value = body[field];
      if (value && (checkForSQLInjection(value) || checkForXSSPatterns(value))) {
        await logSecurityEvent('SQL_INJECTION_ATTEMPT', adminId, {
          ip: clientIp,
          field,
          value,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
        });
      }
    }

    // ─── UPDATE DATA ──────────────────────────────────────────────────────
    const updateData = { updatedBy: adminId };

    // ─── NAME ────────────────────────────────────────────────────────────
    if (body.name) {
      if (!isValidDishName(body.name)) {
        return res.status(400).json({
          success: false,
          error: `Dish name must be between 1 and ${MAX_DISH_NAME_LENGTH} characters`,
        });
      }
      updateData.name = sanitizeInput(body.name.trim());
    }

    // ─── DESCRIPTION ────────────────────────────────────────────────────
    if (body.description !== undefined) {
      updateData.description = body.description ? sanitizeInput(body.description.trim()) : '';
    }

    // ─── CATEGORY ──────────────────────────────────────────────────────
    if (body.categoryId) {
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

    // ─── IMAGE ──────────────────────────────────────────────────────────
    if (body.image !== undefined) {
      updateData.image = body.image || '';
    }

    // ─── PRICE ──────────────────────────────────────────────────────────
    if (body.price !== undefined) {
      updateData.price = body.price;
    }

    // ─── DIETARY TYPE ──────────────────────────────────────────────────
    if (body.dietaryType) {
      if (!ALLOWED_DIETARY_TYPES.includes(body.dietaryType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid dietary type. Allowed: ${ALLOWED_DIETARY_TYPES.join(', ')}`,
        });
      }
      updateData.dietaryType = body.dietaryType;
    }

    // ─── KOT STATION ──────────────────────────────────────────────────
    if (body.kotStation) {
      if (!ALLOWED_KOT_STATIONS.includes(body.kotStation)) {
        return res.status(400).json({
          success: false,
          error: `Invalid KOT station. Allowed: ${ALLOWED_KOT_STATIONS.join(', ')}`,
        });
      }
      updateData.kotStation = body.kotStation;
    }

    // ─── IS ACTIVE ──────────────────────────────────────────────────────
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    // ─── STOCK TYPE ────────────────────────────────────────────────────
    if (body.stockType) {
      updateData.stockType = body.stockType;
    }

    // ─── CURRENT STOCK ──────────────────────────────────────────────────
    if (body.currentStock !== undefined) {
      updateData.currentStock = body.currentStock;
    }

    // ─── PREP TIME ──────────────────────────────────────────────────────
    if (body.prepTimeMinutes !== undefined) {
      updateData.prepTimeMinutes = body.prepTimeMinutes;
    }

    // ─── GLASS TYPE ────────────────────────────────────────────────────
    if (body.glassType !== undefined) {
      updateData.glassType = body.glassType || '';
    }

    // ─── BASE INGREDIENT ──────────────────────────────────────────────
    if (body.baseIngredient !== undefined) {
      updateData.baseIngredient = body.baseIngredient ? sanitizeInput(body.baseIngredient) : '';
    }

    // ─── 🔥🔥🔥 COMBO HANDLING 🔥🔥🔥 ────────────────────────────────────
    if (body.isCombo !== undefined) {
      const isCombo = body.isCombo === true;
      updateData.isCombo = isCombo;
      
      if (isCombo) {
        // 🔥 Converting to COMBO: Validate combo data
        const comboValidation = validateCombo(isCombo, body.comboPrice, body.comboVariants);
        if (!comboValidation.valid) {
          return res.status(400).json({
            success: false,
            error: comboValidation.error,
          });
        }
        
        // Clear variants, set combo data
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
        
        console.log('🎁 Converting dish to COMBO:', {
          comboPrice: updateData.comboPrice,
          comboVariants: updateData.comboVariants.length,
        });
      } else {
        // 🔥 Converting to REGULAR: Clear combo data
        updateData.comboPrice = 0;
        updateData.comboVariants = [];
        updateData.hasVariants = true;
        updateData.price = 0;
        updateData.basePrice = 0;
        
        console.log('🍽️ Converting combo to REGULAR dish');
      }
    }

    // ─── VARIANTS (only for regular dishes, not combo) ────────────────
    if (body.variants !== undefined && body.isCombo !== true) {
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

    // ─── BRANCH UPDATE ──────────────────────────────────────────────────
    if (body.branchId !== undefined) {
      updateData.branchId = body.branchId || null;
      updateData.branchName = body.branchName || 'All Branches';
    }

    console.log('📝 Update data:', JSON.stringify(updateData, null, 2));

    const updated = await Dish.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    await logSecurityEvent('DISH_UPDATED', adminId, {
      dishId: updated._id,
      dishName: updated.name,
      isCombo: updated.isCombo,
      ip: clientIp,
    });

    console.log(`✅ Super Admin: Dish updated: ${updated.name}`);
    if (updated.isCombo) {
      console.log(`🎁 Combo has ${updated.comboVariants?.length} items at ₹${updated.comboPrice}`);
    }

    res.status(200).json({
      success: true,
      data: sanitizeDish(updated),
      message: 'Dish updated successfully',
    });
  } catch (error) {
    console.error('❌ Super Admin Update Dish Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update dish',
    });
  }
};

// ============================================================
//  ─── DELETE DISH ─────────────────────────────────────────────
// ============================================================

export const deleteDish = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin?._id || req.user?._id;
    const clientIp = req.ip || req.connection.remoteAddress;

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

    // Soft delete
    dish.isDeleted = true;
    dish.updatedBy = adminId;
    await dish.save();

    await logSecurityEvent('DISH_DELETED', adminId, {
      dishId: dish._id,
      dishName: dish.name,
      ip: clientIp,
    });

    console.log(`🗑️ Super Admin: Dish deleted: ${dish.name}`);

    res.status(200).json({
      success: true,
      message: `Dish '${dish.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('❌ Super Admin Delete Dish Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete dish',
    });
  }
};

// ============================================================
//  ─── BULK DELETE DISHES ─────────────────────────────────────
// ============================================================

export const bulkDeleteDishes = async (req, res) => {
  try {
    const { ids } = req.body;
    const adminId = req.admin?._id || req.user?._id;

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

    const result = await Dish.updateMany(
      { _id: { $in: ids }, isDeleted: false },
      { 
        $set: { 
          isDeleted: true,
          updatedBy: adminId,
        } 
      }
    );

    await logSecurityEvent('BULK_DISH_DELETED', adminId, {
      count: result.modifiedCount,
      ids: ids,
    });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} dishes deleted successfully`,
    });
  } catch (error) {
    console.error('❌ Super Admin Bulk Delete Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete dishes',
    });
  }
};

// ─── EXPORTS ──────────────────────────────────────────────────────────────

export default {
  getDishes,
  getDishById,
  getDishStats,
  createDish,
  updateDish,
  deleteDish,
  bulkDeleteDishes,
};