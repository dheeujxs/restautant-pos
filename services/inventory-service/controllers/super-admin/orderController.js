// controllers/super-admin/orderController.js - COMPLETE FIXED VERSION

import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Table from '../../models/Table.js';
import Branch from '../../models/super-admin/Branch.js';
import Restaurant from '../../models/super-admin/Restaurant.js';
import KOT from '../../models/KOT.js';
import Dish from '../../models/Dish.js';
import Ingredient from '../../models/Ingredient.js';
import Bill from '../../models/Bill.js';
import { 
  isValidObjectId, 
  isValidEmail, 
  isValidPhone, 
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

const MAX_BULK_DELETE = 50;
const MAX_ITEMS_PER_ORDER = 50;
const MAX_ORDER_AMOUNT = 1000000;
const MIN_ORDER_AMOUNT = 0;
const MAX_ROUNDS = 20;
const ALLOWED_ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'];
const ALLOWED_ORDER_STATUS = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded'];
const ALLOWED_PAYMENT_METHODS = ['cash', 'card', 'upi', 'online'];
const ALLOWED_PAYMENT_STATUS = ['pending', 'paid', 'refunded'];
const ALLOWED_DISCOUNT_TYPES = ['percentage', 'fixed'];
const MAX_DISCOUNT_PERCENTAGE = 100;
const MAX_DISCOUNT_FIXED = 5000;

// ============================================================
//  VALIDATION HELPERS
// ============================================================

const isValidOrderType = (type) => ALLOWED_ORDER_TYPES.includes(type);
const isValidOrderStatus = (status) => ALLOWED_ORDER_STATUS.includes(status);
const isValidPaymentMethod = (method) => ALLOWED_PAYMENT_METHODS.includes(method);
const isValidPaymentStatus = (status) => ALLOWED_PAYMENT_STATUS.includes(status);
const isValidDiscountType = (type) => ALLOWED_DISCOUNT_TYPES.includes(type);

const isValidDiscount = (discount, type) => {
  if (discount === undefined || discount === null) return true;
  if (typeof discount !== 'number' || discount < 0) return false;
  if (type === 'percentage' && discount > MAX_DISCOUNT_PERCENTAGE) return false;
  if (type === 'fixed' && discount > MAX_DISCOUNT_FIXED) return false;
  return true;
};

// ============================================================
//  HELPERS FOR BRANCH AND RESTAURANT FETCHING
// ============================================================

// ─── CACHE FOR BRANCHES AND RESTAURANTS ────────────────────────────────
let branchCache = new Map();
let restaurantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cacheTimestamps = new Map();

const isCacheValid = (key) => {
  if (!cacheTimestamps.has(key)) return false;
  return (Date.now() - cacheTimestamps.get(key)) < CACHE_TTL;
};

const getCachedBranch = async (branchId) => {
  if (!branchId) return null;
  const key = branchId.toString();
  
  if (branchCache.has(key) && isCacheValid(key)) {
    return branchCache.get(key);
  }
  
  try {
    const branch = await Branch.findById(branchId)
      .populate('restaurantId', 'name email phone')
      .lean();
    
    if (branch) {
      const result = {
        id: branch._id,
        name: branch.name || 'Unknown Branch',
        code: branch.code || '',
        restaurantId: branch.restaurantId?._id || branch.restaurantId,
        restaurantName: branch.restaurantId?.name || 'Unknown Restaurant',
        email: branch.email || '',
        phone: branch.phone || '',
        address: branch.address || {},
        status: branch.status || 'active',
        isActive: branch.isActive !== false,
      };
      
      branchCache.set(key, result);
      cacheTimestamps.set(key, Date.now());
      return result;
    }
    return null;
  } catch (error) {
    console.error(`❌ Error fetching branch ${branchId}:`, error);
    return null;
  }
};

const getCachedRestaurant = async (restaurantId) => {
  if (!restaurantId) return null;
  const key = restaurantId.toString();
  
  if (restaurantCache.has(key) && isCacheValid(key)) {
    return restaurantCache.get(key);
  }
  
  try {
    const restaurant = await Restaurant.findById(restaurantId).lean();
    
    if (restaurant) {
      const result = {
        id: restaurant._id,
        name: restaurant.name || 'Unknown Restaurant',
        email: restaurant.email || '',
        phone: restaurant.phone || '',
        status: restaurant.status || 'pending',
      };
      
      restaurantCache.set(key, result);
      cacheTimestamps.set(key, Date.now());
      return result;
    }
    return null;
  } catch (error) {
    console.error(`❌ Error fetching restaurant ${restaurantId}:`, error);
    return null;
  }
};

// ─── GET BRANCH FROM ORDER ITEMS (PRIORITY SOURCE) ──────────────────────
const getBranchFromItems = (order) => {
  if (!order || !order.items || order.items.length === 0) return null;
  
  // Find the first item that has branch data
  for (const item of order.items) {
    if (item.branchId) {
      return {
        branchId: item.branchId,
        branchName: item.branchName || 'Unknown Branch',
        restaurantId: item.restaurantId || order.restaurantId,
        restaurantName: item.restaurantName || order.restaurantName,
        itemProductName: item.productName,
      };
    }
  }
  return null;
};

// ─── ENRICH SINGLE ORDER WITH BRANCH DATA ───────────────────────────────
// ─── ENRICH SINGLE ORDER WITH BRANCH DATA ───────────────────────────────
const enrichOrderWithBranchData = async (order) => {
    if (!order) return order;
  
    const enrichedOrder = { ...order };
    
    // ─── STEP 1: ALWAYS get branch from items first ──────────────────────
    const itemBranch = getBranchFromItems(order);
    
    if (itemBranch) {
      console.log(`📍 Found branch from items: ${itemBranch.branchName} (${itemBranch.branchId}) for product ${itemBranch.itemProductName}`);
      
      // ✅ OVERRIDE root level branch with item branch data
      enrichedOrder.branchId = itemBranch.branchId;
      enrichedOrder.branchName = itemBranch.branchName;
      
      // Also update restaurant data from items
      if (itemBranch.restaurantId && itemBranch.restaurantName) {
        enrichedOrder.restaurantId = itemBranch.restaurantId;
        enrichedOrder.restaurantName = itemBranch.restaurantName;
      }
      
      // ✅ TRY to get full branch details from database, but KEEP the item name if not found
      try {
        const branchData = await getCachedBranch(itemBranch.branchId);
        if (branchData) {
          // Use the database name which should be the correct one
          enrichedOrder.branchName = branchData.name;
          enrichedOrder.branchCode = branchData.code;
          enrichedOrder.branchDetails = branchData;
          
          if (branchData.restaurantName && !enrichedOrder.restaurantName) {
            enrichedOrder.restaurantName = branchData.restaurantName;
          }
          if (branchData.restaurantId && !enrichedOrder.restaurantId) {
            enrichedOrder.restaurantId = branchData.restaurantId;
          }
        } else {
          // ✅ Branch not found in DB - KEEP the name from items
          console.log(`⚠️ Branch ${itemBranch.branchId} not found in DB, keeping name from items: ${itemBranch.branchName}`);
          enrichedOrder.branchName = itemBranch.branchName;
        }
      } catch (error) {
        console.error(`❌ Error fetching branch ${itemBranch.branchId}:`, error);
        // ✅ On error, KEEP the name from items
        enrichedOrder.branchName = itemBranch.branchName;
      }
      
      console.log(`✅ Updated order ${order.orderNumber} branch from '${order.branchName}' to '${enrichedOrder.branchName}'`);
      
      return enrichedOrder;
    }
  
    // ─── STEP 2: If no branch in items, try root level ────────────────────
    if (order.branchId) {
      try {
        const branchData = await getCachedBranch(order.branchId);
        if (branchData) {
          enrichedOrder.branchName = branchData.name;
          enrichedOrder.branchCode = branchData.code;
          enrichedOrder.branchDetails = branchData;
          
          if (branchData.restaurantName && !enrichedOrder.restaurantName) {
            enrichedOrder.restaurantName = branchData.restaurantName;
          }
          if (branchData.restaurantId && !enrichedOrder.restaurantId) {
            enrichedOrder.restaurantId = branchData.restaurantId;
          }
        } else {
          if (order.branchName && order.branchName !== 'Unknown Branch') {
            enrichedOrder.branchName = order.branchName;
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching branch ${order.branchId}:`, error);
        if (order.branchName && order.branchName !== 'Unknown Branch') {
          enrichedOrder.branchName = order.branchName;
        }
      }
    }
  
    // ─── STEP 3: Try to get restaurant from restaurantId ──────────────────
    if (!enrichedOrder.restaurantName || enrichedOrder.restaurantName === 'Unknown Restaurant') {
      if (order.restaurantId) {
        try {
          const restaurantData = await getCachedRestaurant(order.restaurantId);
          if (restaurantData) {
            enrichedOrder.restaurantName = restaurantData.name;
          }
        } catch (error) {
          console.error(`❌ Error fetching restaurant ${order.restaurantId}:`, error);
        }
      }
    }
  
    // ─── STEP 4: FINAL FALLBACKS ──────────────────────────────────────────
    if (!enrichedOrder.branchName || enrichedOrder.branchName === 'Unknown Branch') {
      if (order.branchName && order.branchName !== 'Unknown Branch' && order.branchName !== '') {
        enrichedOrder.branchName = order.branchName;
      } else if (enrichedOrder.restaurantName && enrichedOrder.restaurantName !== 'Unknown Restaurant') {
        enrichedOrder.branchName = `${enrichedOrder.restaurantName} - Main`;
      } else {
        enrichedOrder.branchName = 'Main Branch';
      }
    }
  
    if (!enrichedOrder.restaurantName || enrichedOrder.restaurantName === 'Unknown Restaurant') {
      if (order.restaurantName && order.restaurantName !== 'Unknown Restaurant' && order.restaurantName !== '') {
        enrichedOrder.restaurantName = order.restaurantName;
      } else {
        enrichedOrder.restaurantName = 'Restaurant';
      }
    }
  
    console.log(`📋 Enriched order ${order.orderNumber}: Branch=${enrichedOrder.branchName}, Restaurant=${enrichedOrder.restaurantName}`);
    
    return enrichedOrder;
  };

// ─── BATCH ENRICH ORDERS ──────────────────────────────────────────────────
// ─── BATCH ENRICH ORDERS ──────────────────────────────────────────────────
const enrichOrdersWithBranchData = async (orders) => {
    if (!orders || orders.length === 0) return orders;
  
    // ─── STEP 1: Collect branch IDs from items FIRST ──────────────────────
    const branchIds = new Set();
    const restaurantIds = new Set();
    
    for (const order of orders) {
      // ALWAYS check items first for branch data
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.branchId) {
            branchIds.add(item.branchId.toString());
          }
          if (item.restaurantId) {
            restaurantIds.add(item.restaurantId.toString());
          }
        }
      }
      
      // Fallback: root level
      if (order.branchId) {
        branchIds.add(order.branchId.toString());
      }
      if (order.restaurantId) {
        restaurantIds.add(order.restaurantId.toString());
      }
    }
  
    console.log(`📊 Found ${branchIds.size} unique branch IDs and ${restaurantIds.size} restaurant IDs`);
  
    // ─── STEP 2: Fetch all branches ────────────────────────────────────────
    let branchMap = new Map();
    if (branchIds.size > 0) {
      try {
        const branches = await Branch.find({
          _id: { $in: Array.from(branchIds).map(id => new mongoose.Types.ObjectId(id)) }
        })
        .populate('restaurantId', 'name email phone')
        .lean();
        
        branchMap = new Map(branches.map(b => [
          b._id.toString(),
          {
            id: b._id,
            name: b.name || 'Unknown Branch',
            code: b.code || '',
            restaurantId: b.restaurantId?._id || b.restaurantId,
            restaurantName: b.restaurantId?.name || 'Unknown Restaurant',
            email: b.email || '',
            phone: b.phone || '',
            address: b.address || {},
            status: b.status || 'active',
            isActive: b.isActive !== false,
          }
        ]));
        
        branches.forEach(b => {
          const key = b._id.toString();
          const value = branchMap.get(key);
          branchCache.set(key, value);
          cacheTimestamps.set(key, Date.now());
        });
        
        console.log(`📊 Fetched ${branches.length} branches from database`);
      } catch (error) {
        console.error('❌ Error fetching branches:', error);
      }
    }
  
    // ─── STEP 3: Fetch all restaurants ──────────────────────────────────────
    let restaurantMap = new Map();
    if (restaurantIds.size > 0) {
      try {
        const restaurants = await Restaurant.find({
          _id: { $in: Array.from(restaurantIds).map(id => new mongoose.Types.ObjectId(id)) }
        }).lean();
        
        restaurantMap = new Map(restaurants.map(r => [
          r._id.toString(),
          {
            id: r._id,
            name: r.name || 'Unknown Restaurant',
            email: r.email || '',
            phone: r.phone || '',
            status: r.status || 'pending',
          }
        ]));
        
        restaurants.forEach(r => {
          const key = r._id.toString();
          const value = restaurantMap.get(key);
          restaurantCache.set(key, value);
          cacheTimestamps.set(key, Date.now());
        });
        
        console.log(`📊 Fetched ${restaurants.length} restaurants from database`);
      } catch (error) {
        console.error('❌ Error fetching restaurants:', error);
      }
    }
  
    // ─── STEP 4: Enrich each order ─────────────────────────────────────────
    const enrichedOrders = orders.map(order => {
      const enriched = { ...order };
      
      // ─── Get branch from items (PRIORITY) ──────────────────────────────
      let bestBranchId = null;
      let bestBranchName = null;
      let bestRestaurantId = null;
      let bestRestaurantName = null;
      
      // ✅ FIRST: Check items for branch data (MOST RELIABLE)
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.branchId) {
            bestBranchId = item.branchId;
            bestBranchName = item.branchName || 'Unknown Branch';
            bestRestaurantId = item.restaurantId || order.restaurantId;
            bestRestaurantName = item.restaurantName || order.restaurantName;
            break; // Use first valid item
          }
        }
      }
      
      // ✅ SECOND: If no branch from items, use root level
      if (!bestBranchId && order.branchId) {
        bestBranchId = order.branchId;
        bestBranchName = order.branchName || 'Unknown Branch';
        bestRestaurantId = order.restaurantId;
        bestRestaurantName = order.restaurantName;
      }
  
      // ─── Apply branch data from map ─────────────────────────────────────
      if (bestBranchId) {
        const branchIdStr = bestBranchId.toString();
        if (branchMap.has(branchIdStr)) {
          const branch = branchMap.get(branchIdStr);
          enriched.branchId = branch.id;
          enriched.branchName = branch.name; // Use database name
          enriched.branchCode = branch.code;
          enriched.branchDetails = branch;
          
          if (branch.restaurantName && !enriched.restaurantName) {
            enriched.restaurantName = branch.restaurantName;
          }
          if (branch.restaurantId && !enriched.restaurantId) {
            enriched.restaurantId = branch.restaurantId;
          }
        } else {
          // ✅ Branch not in DB - KEEP the name from items
          if (bestBranchName && bestBranchName !== 'Unknown Branch') {
            enriched.branchName = bestBranchName;
            enriched.branchId = bestBranchId;
          }
        }
      }
  
      // ─── Apply restaurant data from map ──────────────────────────────────
      if (enriched.restaurantId) {
        const restaurantIdStr = enriched.restaurantId.toString();
        if (restaurantMap.has(restaurantIdStr)) {
          const restaurant = restaurantMap.get(restaurantIdStr);
          if (!enriched.restaurantName || enriched.restaurantName === 'Unknown Restaurant') {
            enriched.restaurantName = restaurant.name;
          }
        }
      }
  
      // ─── FINAL FALLBACKS ──────────────────────────────────────────────────
      if (!enriched.branchName || enriched.branchName === 'Unknown Branch') {
        if (bestBranchName && bestBranchName !== 'Unknown Branch') {
          enriched.branchName = bestBranchName;
        } else if (enriched.restaurantName && enriched.restaurantName !== 'Unknown Restaurant') {
          enriched.branchName = `${enriched.restaurantName} - Main`;
        } else {
          enriched.branchName = 'Main Branch';
        }
      }
  
      if (!enriched.restaurantName || enriched.restaurantName === 'Unknown Restaurant') {
        if (bestRestaurantName && bestRestaurantName !== 'Unknown Restaurant') {
          enriched.restaurantName = bestRestaurantName;
        } else if (order.restaurantName && order.restaurantName !== 'Unknown Restaurant') {
          enriched.restaurantName = order.restaurantName;
        } else {
          enriched.restaurantName = 'Restaurant';
        }
      }
  
      // ─── Log changes ─────────────────────────────────────────────────────
      if (enriched.branchName !== order.branchName) {
        console.log(`🔄 Updated branch name: '${order.branchName}' → '${enriched.branchName}' for order ${order.orderNumber}`);
      }
  
      return enriched;
    });
  
    return enrichedOrders;
  };

// ============================================================
//  ─── CONTROLLER FUNCTIONS ────────────────────────────────────
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all orders across all restaurants/branches (Super Admin)
// @route   GET /api/super-admin/orders
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getAllOrders = async (req, res) => {
  try {
    console.log('📊 [Super Admin] Fetching all orders...');
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search ? req.query.search.trim() : '';
    const orderStatus = req.query.orderStatus;
    const orderType = req.query.orderType;
    const restaurantId = req.query.restaurantId;
    const branchId = req.query.branchId;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const paymentStatus = req.query.paymentStatus;
    const isVip = req.query.isVip;

    if (orderStatus && !isValidOrderStatus(orderStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order status. Allowed: ${ALLOWED_ORDER_STATUS.join(', ')}`,
      });
    }

    if (orderType && !isValidOrderType(orderType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order type. Allowed: ${ALLOWED_ORDER_TYPES.join(', ')}`,
      });
    }

    if (paymentStatus && !isValidPaymentStatus(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUS.join(', ')}`,
      });
    }

    const filter = {};
    
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { orderNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { tableNumber: searchRegex },
        { branchName: searchRegex },
        { restaurantName: searchRegex },
      ];
    }
    
    if (orderStatus) {
      filter.orderStatus = orderStatus;
    }
    
    if (orderType) {
      filter.orderType = orderType;
    }
    
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
    
    if (isVip !== undefined && isVip !== '') {
      filter.isVip = isVip === 'true';
    }

    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined' && restaurantId !== '') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    console.log('📊 [Super Admin] Filter:', JSON.stringify(filter, null, 2));

    const total = await Order.countDocuments(filter);
    console.log(`📊 [Super Admin] Total orders: ${total}`);

    let orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log(`📊 [Super Admin] Found ${orders.length} orders before enrichment`);

    orders = await enrichOrdersWithBranchData(orders);

    console.log(`📊 [Super Admin] Enriched ${orders.length} orders with branch data`);

    const sanitizedOrders = orders.map(order => ({
      ...order,
      customerName: sanitizeInput(order.customerName || ''),
      customerAddress: sanitizeInput(order.customerAddress || ''),
      notes: sanitizeInput(order.notes || ''),
      vipNotes: sanitizeInput(order.vipNotes || ''),
      deliveryInstructions: sanitizeInput(order.deliveryInstructions || ''),
      items: order.items?.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName || ''),
        notes: item.notes ? sanitizeInput(item.notes) : '',
        personName: item.personName ? sanitizeInput(item.personName) : '',
      })) || [],
    }));

    const stats = {
      totalOrders: total,
      totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      pendingOrders: await Order.countDocuments({ orderStatus: 'pending' }),
      preparingOrders: await Order.countDocuments({ orderStatus: 'preparing' }),
      completedOrders: await Order.countDocuments({ orderStatus: 'completed' }),
      cancelledOrders: await Order.countDocuments({ orderStatus: 'cancelled' }),
      todayOrders: await Order.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      todayRevenue: await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            orderStatus: { $in: ['completed', 'paid'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).then(result => result[0]?.total || 0),
    };

    if (sanitizedOrders.length > 0) {
      console.log('📋 Sample enriched order:', {
        orderNumber: sanitizedOrders[0].orderNumber,
        restaurantName: sanitizedOrders[0].restaurantName,
        branchName: sanitizedOrders[0].branchName,
        branchId: sanitizedOrders[0].branchId,
        restaurantId: sanitizedOrders[0].restaurantId,
        itemsBranchName: sanitizedOrders[0].items?.[0]?.branchName,
        itemsBranchId: sanitizedOrders[0].items?.[0]?.branchId,
      });
    }

    return res.json({
      success: true,
      data: {
        orders: sanitizedOrders,
        pagination: { 
          total, 
          page, 
          limit, 
          pages: Math.ceil(total / limit) 
        },
        stats: stats
      }
    });
    
  } catch (err) {
    console.error('❌ [Super Admin GET /api/super-admin/orders] ERROR:', err.message);
    console.error('❌ Stack trace:', err.stack);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch orders',
      details: err.message 
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get order by ID (Super Admin)
// @route   GET /api/super-admin/orders/:id
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    let order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order = await enrichOrderWithBranchData(order);

    const kots = await KOT.find({ orderId: order._id }).lean();
    const bills = await Bill.find({ orderId: order._id }).lean();

    const sanitizedOrder = {
      ...order,
      customerName: sanitizeInput(order.customerName || ''),
      customerAddress: sanitizeInput(order.customerAddress || ''),
      notes: sanitizeInput(order.notes || ''),
      vipNotes: sanitizeInput(order.vipNotes || ''),
      deliveryInstructions: sanitizeInput(order.deliveryInstructions || ''),
      items: order.items?.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName),
        notes: item.notes ? sanitizeInput(item.notes) : '',
        personName: item.personName ? sanitizeInput(item.personName) : '',
      })) || [],
    };

    return res.json({
      success: true,
      data: {
        order: sanitizedOrder,
        kots: kots,
        bills: bills,
      }
    });
  } catch (err) {
    console.error('[Super Admin GET /api/super-admin/orders/:id] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get order by order number (Super Admin)
// @route   GET /api/super-admin/orders/number/:orderNumber
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    if (!orderNumber || orderNumber.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order number is required',
      });
    }

    let order = await Order.findOne({ orderNumber: orderNumber.trim() }).lean();
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: `Order ${orderNumber} not found` 
      });
    }

    order = await enrichOrderWithBranchData(order);

    const [kots, bills] = await Promise.all([
      KOT.find({ orderId: order._id }).lean(),
      Bill.find({ orderId: order._id }).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        ...order,
        customerName: sanitizeInput(order.customerName || ''),
        notes: sanitizeInput(order.notes || ''),
        kots: kots,
        bills: bills,
      }
    });
  } catch (err) {
    console.error('[Super Admin GET /api/super-admin/orders/number/:orderNumber] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get order statistics (Super Admin)
// @route   GET /api/super-admin/orders/stats
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getOrderStats = async (req, res) => {
  try {
    const { restaurantId, branchId, dateFrom, dateTo } = req.query;

    const filter = {};
    
    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined' && restaurantId !== '') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const [
      totalOrders,
      totalRevenue,
      statusCounts,
      typeCounts,
      paymentStatusCounts,
      dailyRevenue,
      monthlyRevenue,
      topDishes,
      vipOrders
    ] = await Promise.all([
      Order.countDocuments(filter),
      
      Order.aggregate([
        { $match: { ...filter, orderStatus: { $in: ['completed', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).then(result => result[0]?.total || 0),
      
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]).then(result => result.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})),
      
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$orderType', count: { $sum: 1 } } }
      ]).then(result => result.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})),
      
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
      ]).then(result => result.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})),
      
      Order.aggregate([
        { 
          $match: { 
            ...filter, 
            orderStatus: { $in: ['completed', 'paid'] },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      Order.aggregate([
        { 
          $match: { 
            ...filter, 
            orderStatus: { $in: ['completed', 'paid'] },
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      Order.aggregate([
        { $match: filter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.productName' },
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]),
      
      Order.countDocuments({ ...filter, isVip: true })
    ]);

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        statusCounts,
        typeCounts,
        paymentStatusCounts,
        dailyRevenue,
        monthlyRevenue,
        topDishes,
        vipOrders,
        period: {
          from: dateFrom || 'All time',
          to: dateTo || 'All time'
        }
      }
    });
  } catch (err) {
    console.error('[Super Admin GET /api/super-admin/orders/stats] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch order statistics' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update order (Super Admin)
// @route   PATCH /api/super-admin/orders/:id
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const body = sanitizeObject(req.body);
    const updateData = {};

    if (body.orderStatus !== undefined) {
      if (!isValidOrderStatus(body.orderStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid order status. Allowed: ${ALLOWED_ORDER_STATUS.join(', ')}`,
        });
      }
      updateData.orderStatus = body.orderStatus;
    }

    if (body.paymentStatus !== undefined) {
      if (!isValidPaymentStatus(body.paymentStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUS.join(', ')}`,
        });
      }
      updateData.paymentStatus = body.paymentStatus;
    }

    if (body.paymentMethod !== undefined) {
      if (!isValidPaymentMethod(body.paymentMethod)) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
        });
      }
      updateData.paymentMethod = body.paymentMethod;
    }

    if (body.isVip !== undefined) {
      if (typeof body.isVip !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isVip must be a boolean',
        });
      }
      updateData.isVip = body.isVip;
      updateData.orderPriority = body.isVip ? 'vip' : 'normal';
      
      if (body.vipNotes !== undefined) {
        updateData.vipNotes = sanitizeInput(body.vipNotes || '');
      }
    }

    if (body.customerName !== undefined) {
      updateData.customerName = sanitizeInput(body.customerName.trim());
    }

    if (body.customerPhone !== undefined) {
      updateData.customerPhone = body.customerPhone.trim();
    }

    if (body.customerAddress !== undefined) {
      updateData.customerAddress = sanitizeInput(body.customerAddress.trim());
    }

    if (body.notes !== undefined) {
      updateData.notes = sanitizeInput(body.notes.trim());
    }

    if (body.discount !== undefined) {
      const discountType = body.discountType || order.discountType || 'fixed';
      if (!isValidDiscount(body.discount, discountType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid discount. ${discountType === 'percentage' ? `Max ${MAX_DISCOUNT_PERCENTAGE}%` : `Max ₹${MAX_DISCOUNT_FIXED}`}`,
        });
      }
      updateData.discount = body.discount;
      
      if (body.discountType !== undefined) {
        if (!isValidDiscountType(body.discountType)) {
          return res.status(400).json({
            success: false,
            error: `Invalid discount type. Allowed: ${ALLOWED_DISCOUNT_TYPES.join(', ')}`,
          });
        }
        updateData.discountType = body.discountType;
      }

      const items = body.items || order.items;
      const taxRate = body.taxRate || order.taxRate || 5;
      const { subtotal, tax, total } = calculateTotals(
        items,
        taxRate,
        updateData.discount,
        updateData.discountType || order.discountType || 'fixed'
      );
      updateData.subtotal = subtotal;
      updateData.tax = tax;
      updateData.total = total;
    }

    if (body.items !== undefined && Array.isArray(body.items)) {
      if (body.items.length > MAX_ITEMS_PER_ORDER) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_ITEMS_PER_ORDER} items per order`,
        });
      }

      const sanitizedItems = body.items.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName),
        notes: item.notes ? sanitizeInput(item.notes) : '',
        personName: item.personName ? sanitizeInput(item.personName) : '',
      }));

      updateData.items = sanitizedItems;

      const taxRate = body.taxRate || order.taxRate || 5;
      const discount = body.discount !== undefined ? body.discount : order.discount;
      const discountType = body.discountType || order.discountType || 'fixed';
      const { subtotal, tax, total } = calculateTotals(
        sanitizedItems,
        taxRate,
        discount,
        discountType
      );
      updateData.subtotal = subtotal;
      updateData.tax = tax;
      updateData.total = total;
    }

    if (body.tableId !== undefined) {
      if (body.tableId && !isValidObjectId(body.tableId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid table ID format',
        });
      }
      
      if (body.tableId) {
        const table = await Table.findById(body.tableId);
        if (!table) {
          return res.status(404).json({
            success: false,
            error: 'Table not found',
          });
        }
        if (table.status === 'occupied' && table.currentOrderId?.toString() !== id) {
          return res.status(400).json({
            success: false,
            error: 'Table is already occupied',
          });
        }
      }

      if (order.tableId && order.tableId.toString() !== body.tableId) {
        await Table.findByIdAndUpdate(order.tableId, {
          status: 'available',
          currentOrderId: null,
        });
      }

      if (body.tableId) {
        await Table.findByIdAndUpdate(body.tableId, {
          status: 'occupied',
          currentOrderId: order._id,
        });
        const table = await Table.findById(body.tableId);
        updateData.tableNumber = table.number || table.name || '';
      } else {
        updateData.tableNumber = '';
      }

      updateData.tableId = body.tableId;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (updateData.orderStatus) {
      await KOT.updateMany(
        { orderId: order._id },
        { 
          $set: { 
            status: updateData.orderStatus === 'ready' ? 'ready' : 
                    updateData.orderStatus === 'completed' ? 'served' : 
                    updateData.orderStatus === 'cancelled' ? 'cancelled' : 'pending' 
          } 
        }
      );
    }

    if (updateData.paymentStatus) {
      await Bill.updateMany(
        { orderId: order._id },
        { $set: { paymentStatus: updateData.paymentStatus } }
      );
    }

    console.log(`✅ [Super Admin] Order ${order.orderNumber} updated by ${req.admin?.email || 'Super Admin'}`);
    console.log(`   Updates:`, Object.keys(updateData));

    return res.json({
      success: true,
      data: {
        ...updatedOrder,
        customerName: sanitizeInput(updatedOrder.customerName || ''),
        notes: sanitizeInput(updatedOrder.notes || ''),
        items: updatedOrder.items?.map(item => ({
          ...item,
          productName: sanitizeInput(item.productName),
          notes: item.notes ? sanitizeInput(item.notes) : '',
        })) || [],
      },
      message: 'Order updated successfully'
    });
  } catch (err) {
    console.error('[Super Admin PATCH /api/super-admin/orders/:id] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update order' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete orders (Super Admin)
// @route   DELETE /api/super-admin/orders/bulk
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteOrders = async (req, res) => {
  try {
    const { ids, restaurantId, branchId, dateFrom, dateTo } = req.body;

    let deleteFilter = {};

    if (ids && Array.isArray(ids) && ids.length > 0) {
      if (ids.length > MAX_BULK_DELETE) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_BULK_DELETE} orders can be deleted at once`,
        });
      }

      const invalidIds = ids.filter(id => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid ID format: ${invalidIds.join(', ')}`,
        });
      }

      deleteFilter._id = { $in: ids };
    } else {
      if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined' && restaurantId !== '') {
        if (!isValidObjectId(restaurantId)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid restaurant ID format',
          });
        }
        deleteFilter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      }

      if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
        if (!isValidObjectId(branchId)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid branch ID format',
          });
        }
        deleteFilter.branchId = new mongoose.Types.ObjectId(branchId);
      }

      if (dateFrom || dateTo) {
        deleteFilter.createdAt = {};
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          deleteFilter.createdAt.$gte = fromDate;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          deleteFilter.createdAt.$lte = toDate;
        }
      }

      if (!deleteFilter.orderStatus) {
        deleteFilter.orderStatus = 'completed';
      }
    }

    const ordersToDelete = await Order.find(deleteFilter).lean();
    if (ordersToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No orders found to delete',
      });
    }

    const orderIds = ordersToDelete.map(o => o._id);

    await KOT.deleteMany({ orderId: { $in: orderIds } });
    await Bill.deleteMany({ orderId: { $in: orderIds } });

    const result = await Order.deleteMany(deleteFilter);

    for (const order of ordersToDelete) {
      if (order.tableId) {
        await Table.findByIdAndUpdate(order.tableId, {
          status: 'available',
          currentOrderId: null,
        });
      }
    }

    console.log(`✅ [Super Admin] Deleted ${result.deletedCount} orders`);
    console.log(`   Deleted KOTs and Bills associated with these orders`);

    return res.json({
      success: true,
      message: `${result.deletedCount} orders deleted successfully`,
      data: {
        deletedCount: result.deletedCount,
        deletedOrderIds: orderIds.map(id => id.toString()),
      }
    });
  } catch (err) {
    console.error('[Super Admin DELETE /api/super-admin/orders/bulk] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete orders' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Export orders (Super Admin)
// @route   GET /api/super-admin/orders/export
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const exportOrders = async (req, res) => {
  try {
    const { restaurantId, branchId, dateFrom, dateTo, orderStatus, orderType } = req.query;

    const filter = {};
    
    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined' && restaurantId !== '') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    if (orderStatus && isValidOrderStatus(orderStatus)) {
      filter.orderStatus = orderStatus;
    }

    if (orderType && isValidOrderType(orderType)) {
      filter.orderType = orderType;
    }

    let orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    orders = await enrichOrdersWithBranchData(orders);

    const exportData = orders.map(order => ({
      'Order Number': order.orderNumber,
      'Order Type': order.orderType,
      'Status': order.orderStatus,
      'Customer Name': order.customerName || '',
      'Customer Phone': order.customerPhone || '',
      'Customer Address': order.customerAddress || '',
      'Table Number': order.tableNumber || '',
      'Restaurant': order.restaurantName || '',
      'Branch': order.branchName || '',
      'Branch Code': order.branchCode || '',
      'Items': order.items?.map(i => `${i.productName} x${i.quantity}`).join(', ') || '',
      'Subtotal': order.subtotal || 0,
      'Tax': order.tax || 0,
      'Discount': order.discount || 0,
      'Total': order.total || 0,
      'Payment Method': order.paymentMethod || '',
      'Payment Status': order.paymentStatus || '',
      'Created At': order.createdAt ? new Date(order.createdAt).toLocaleString() : '',
      'VIP': order.isVip ? 'Yes' : 'No',
      'Notes': order.notes || '',
    }));

    return res.json({
      success: true,
      data: {
        orders: exportData,
        count: exportData.length,
        generatedAt: new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error('[Super Admin GET /api/super-admin/orders/export] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to export orders' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get restaurant order summary (Super Admin)
// @route   GET /api/super-admin/orders/restaurant-summary
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getRestaurantOrderSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        dateFilter.createdAt.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = toDate;
      }
    }

    const restaurants = await Restaurant.find().lean();

    const summary = await Promise.all(
      restaurants.map(async (restaurant) => {
        const restaurantFilter = {
          restaurantId: restaurant._id,
          ...dateFilter
        };

        const [
          totalOrders,
          totalRevenue,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          todayOrders
        ] = await Promise.all([
          Order.countDocuments(restaurantFilter),
          Order.aggregate([
            { $match: { ...restaurantFilter, orderStatus: { $in: ['completed', 'paid'] } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]).then(result => result[0]?.total || 0),
          Order.countDocuments({ ...restaurantFilter, orderStatus: 'pending' }),
          Order.countDocuments({ ...restaurantFilter, orderStatus: 'completed' }),
          Order.countDocuments({ ...restaurantFilter, orderStatus: 'cancelled' }),
          Order.countDocuments({
            ...restaurantFilter,
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          })
        ]);

        const branches = await Branch.find({ restaurantId: restaurant._id }).lean();
        const branchSummary = await Promise.all(
          branches.map(async (branch) => {
            const branchFilter = {
              branchId: branch._id,
              ...dateFilter
            };

            const branchTotalOrders = await Order.countDocuments(branchFilter);
            const branchRevenue = await Order.aggregate([
              { $match: { ...branchFilter, orderStatus: { $in: ['completed', 'paid'] } } },
              { $group: { _id: null, total: { $sum: '$total' } } }
            ]).then(result => result[0]?.total || 0);

            return {
              branchId: branch._id,
              branchName: branch.name,
              totalOrders: branchTotalOrders,
              revenue: branchRevenue,
            };
          })
        );

        return {
          restaurantId: restaurant._id,
          restaurantName: restaurant.name,
          totalOrders,
          totalRevenue,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          todayOrders,
          branches: branchSummary,
        };
      })
    );

    const totals = summary.reduce((acc, item) => ({
      totalOrders: acc.totalOrders + item.totalOrders,
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      pendingOrders: acc.pendingOrders + item.pendingOrders,
      completedOrders: acc.completedOrders + item.completedOrders,
      cancelledOrders: acc.cancelledOrders + item.cancelledOrders,
      todayOrders: acc.todayOrders + item.todayOrders,
    }), {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      todayOrders: 0,
    });

    return res.json({
      success: true,
      data: {
        restaurants: summary,
        totals: totals,
        period: {
          from: dateFrom || 'All time',
          to: dateTo || 'All time'
        }
      }
    });
  } catch (err) {
    console.error('[Super Admin GET /api/super-admin/orders/restaurant-summary] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get restaurant summary' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get live dashboard data (Super Admin)
// @route   GET /api/super-admin/orders/live-dashboard
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getLiveDashboard = async (req, res) => {
  try {
    let pendingOrders = await Order.find({ 
      orderStatus: { $in: ['pending', 'confirmed'] } 
    })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

    let preparingOrders = await Order.find({ 
      orderStatus: 'preparing' 
    })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

    let readyOrders = await Order.find({ 
      orderStatus: 'ready' 
    })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

    pendingOrders = await enrichOrdersWithBranchData(pendingOrders);
    preparingOrders = await enrichOrdersWithBranchData(preparingOrders);
    readyOrders = await enrichOrdersWithBranchData(readyOrders);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { 
            $sum: { 
              $cond: [
                { $in: ['$orderStatus', ['completed', 'paid']] },
                '$total',
                0
              ]
            } 
          },
          pendingCount: {
            $sum: { 
              $cond: [
                { $in: ['$orderStatus', ['pending', 'confirmed']] },
                1,
                0
              ]
            }
          },
          completedCount: {
            $sum: { 
              $cond: [
                { $eq: ['$orderStatus', 'completed'] },
                1,
                0
              ]
            }
          },
        }
      }
    ]);

    const todayData = todayStats[0] || { totalOrders: 0, totalRevenue: 0, pendingCount: 0, completedCount: 0 };

    let vipOrders = await Order.find({
      isVip: true,
      orderStatus: { $nin: ['completed', 'cancelled'] }
    })
    .sort({ createdAt: 1 })
    .limit(10)
    .lean();

    vipOrders = await enrichOrdersWithBranchData(vipOrders);

    const lowStockIngredients = await Ingredient.find({
      currentStock: { $lte: 10 }
    })
    .limit(10)
    .lean();

    return res.json({
      success: true,
      data: {
        pendingOrders: pendingOrders.map(o => ({
          ...o,
          customerName: sanitizeInput(o.customerName || ''),
        })),
        preparingOrders: preparingOrders.map(o => ({
          ...o,
          customerName: sanitizeInput(o.customerName || ''),
        })),
        readyOrders: readyOrders.map(o => ({
          ...o,
          customerName: sanitizeInput(o.customerName || ''),
        })),
        todayStats: {
          totalOrders: todayData.totalOrders,
          totalRevenue: todayData.totalRevenue,
          pendingOrders: todayData.pendingCount,
          completedOrders: todayData.completedCount,
        },
        vipOrders: vipOrders.map(o => ({
          ...o,
          customerName: sanitizeInput(o.customerName || ''),
          vipNotes: sanitizeInput(o.vipNotes || ''),
        })),
        lowStockIngredients: lowStockIngredients.map(i => ({
          name: sanitizeInput(i.name),
          currentStock: i.currentStock,
          unit: i.unit,
        })),
        lastUpdated: new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error('[Super Admin GET /api/super-admin/orders/live-dashboard] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to get live dashboard data' });
  }
};

// ─── CLEAR CACHE ENDPOINT HANDLER ──────────────────────────────────────
export const clearCache = async (req, res) => {
  try {
    branchCache.clear();
    restaurantCache.clear();
    cacheTimestamps.clear();
    console.log('🗑️ Cache cleared manually by Super Admin');
    
    return res.json({
      success: true,
      message: 'Branch and Restaurant cache cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
};

// ============================================================
//  ─── DEFAULT EXPORT ──────────────────────────────────────────
// ============================================================

export default {
  getAllOrders,
  getOrderById,
  getOrderStats,
  updateOrder,
  bulkDeleteOrders,
  exportOrders,
  getRestaurantOrderSummary,
  getLiveDashboard,
  getOrderByNumber,
  clearCache,
};