// controllers/orderController.js - COMPLETE FIXED VERSION

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import Branch from '../models/super-admin/Branch.js';
import Restaurant from '../models/super-admin/Restaurant.js';
import KOT from '../models/KOT.js';
import Dish from '../models/Dish.js';
import jwt from 'jsonwebtoken';
import Ingredient from '../models/Ingredient.js';
import Bill from '../models/Bill.js';
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
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const MAX_ITEMS_PER_ORDER = 50;
const MAX_ORDER_AMOUNT = 1000000;
const MIN_ORDER_AMOUNT = 0;
const MAX_ROUNDS = 20;
const ALLOWED_ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'];
const ALLOWED_ORDER_STATUS = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
const ALLOWED_PAYMENT_METHODS = ['cash', 'card', 'upi', 'online'];
const ALLOWED_PAYMENT_STATUS = ['pending', 'paid', 'refunded'];
const ALLOWED_DISCOUNT_TYPES = ['percentage', 'fixed'];
const MAX_DISCOUNT_PERCENTAGE = 100;
const MAX_DISCOUNT_FIXED = 5000;
const MAX_NOTES_LENGTH_ORDER = 500;
const MAX_CUSTOMER_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 500;
const MAX_LANDMARK_LENGTH = 200;
const MAX_DELIVERY_INSTRUCTIONS_LENGTH = 500;
const MAX_RESTAURANT_NAME_LENGTH = 100;
const MAX_RESTAURANT_ADDRESS_LENGTH = 500;
const MAX_RESTAURANT_PHONE_LENGTH = 15;
const MAX_DISTANCE = 100;
const MAX_ESTIMATED_TIME = 240;
const MAX_VIP_NOTES_LENGTH = 200;
const MAX_CANCELLATION_REASON_LENGTH = 500;
const MAX_REFUND_REASON_LENGTH = 500;
const MAX_READY_NOTES_LENGTH = 500;
const MAX_REJECTION_REASON_LENGTH = 500;

// ============================================================
//  LOGIN ATTEMPTS (Security)
// ============================================================

const loginAttempts = new Map();

const checkLoginAttempts = (userId) => {
  const key = `order_login_${userId}`;
  const now = Date.now();
  
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, { count: 1, lockUntil: null });
    return true;
  }
  
  const data = loginAttempts.get(key);
  
  if (data.lockUntil && now < data.lockUntil) {
    return false;
  }
  
  if (data.lockUntil && now >= data.lockUntil) {
    loginAttempts.set(key, { count: 1, lockUntil: null });
    return true;
  }
  
  if (data.count >= MAX_LOGIN_ATTEMPTS) {
    data.lockUntil = now + LOCKOUT_DURATION;
    loginAttempts.set(key, data);
    return false;
  }
  
  data.count++;
  loginAttempts.set(key, data);
  return true;
};

const resetLoginAttempts = (userId) => {
  const key = `order_login_${userId}`;
  loginAttempts.delete(key);
};

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
const isValidCustomerName = (name) => {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed.length < 1) return true;
  if (trimmed.length > MAX_CUSTOMER_NAME_LENGTH) return false;
  const nameRegex = /^[a-zA-Z0-9\s\-_.,&()'"]+$/;
  return nameRegex.test(trimmed);
};
const isValidAddress = (address) => {
  if (!address) return true;
  const trimmed = address.trim();
  if (trimmed.length > MAX_ADDRESS_LENGTH) return false;
  return true;
};
const isValidLandmark = (landmark) => {
  if (!landmark) return true;
  const trimmed = landmark.trim();
  if (trimmed.length > MAX_LANDMARK_LENGTH) return false;
  return true;
};
const isValidDeliveryInstructions = (instructions) => {
  if (!instructions) return true;
  const trimmed = instructions.trim();
  if (trimmed.length > MAX_DELIVERY_INSTRUCTIONS_LENGTH) return false;
  return true;
};
const isValidRestaurantName = (name) => {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed.length < 1) return true;
  if (trimmed.length > MAX_RESTAURANT_NAME_LENGTH) return false;
  return true;
};
const isValidRestaurantAddress = (address) => {
  if (!address) return true;
  const trimmed = address.trim();
  if (trimmed.length > MAX_RESTAURANT_ADDRESS_LENGTH) return false;
  return true;
};
const isValidRestaurantPhone = (phone) => {
  if (!phone) return true;
  const trimmed = phone.trim();
  if (trimmed.length > MAX_RESTAURANT_PHONE_LENGTH) return false;
  return /^[0-9+\-() ]+$/.test(trimmed);
};
const isValidDistance = (distance) => {
  if (distance === undefined || distance === null) return true;
  if (typeof distance !== 'number' || distance < 0) return false;
  if (distance > MAX_DISTANCE) return false;
  return true;
};
const isValidEstimatedTime = (time) => {
  if (time === undefined || time === null) return true;
  if (typeof time !== 'number' || time < 0) return false;
  if (time > MAX_ESTIMATED_TIME) return false;
  return true;
};
const isValidVipNotes = (notes) => {
  if (!notes) return true;
  const trimmed = notes.trim();
  if (trimmed.length > MAX_VIP_NOTES_LENGTH) return false;
  return true;
};
const isValidCancellationReason = (reason) => {
  if (!reason) return true;
  const trimmed = reason.trim();
  if (trimmed.length > MAX_CANCELLATION_REASON_LENGTH) return false;
  return true;
};
const isValidRefundReason = (reason) => {
  if (!reason) return true;
  const trimmed = reason.trim();
  if (trimmed.length > MAX_REFUND_REASON_LENGTH) return false;
  return true;
};
const isValidReadyNotes = (notes) => {
  if (!notes) return true;
  const trimmed = notes.trim();
  if (trimmed.length > MAX_READY_NOTES_LENGTH) return false;
  return true;
};
const isValidRejectionReason = (reason) => {
  if (!reason) return true;
  const trimmed = reason.trim();
  if (trimmed.length > MAX_REJECTION_REASON_LENGTH) return false;
  return true;
};

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

const isKitchenRole = (role) => {
  const kitchenRoles = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'];
  return kitchenRoles.includes(role?.toLowerCase());
};

const generateOrderNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const lastOrder = await Order.findOne().sort({ createdAt: -1 });
  let seq = 1;
  if (lastOrder && lastOrder.orderNumber && lastOrder.orderNumber.startsWith(dateStr)) {
    const lastSeq = parseInt(lastOrder.orderNumber.slice(-4));
    seq = lastSeq + 1;
  }
  return `${dateStr}-${seq.toString().padStart(4, '0')}`;
};

const calculateTotals = (items, taxRate, discount, discountType) => {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const tax = (subtotal * taxRate) / 100;
  let discountAmount = discount;
  if (discountType === 'percentage') {
    discountAmount = (subtotal * discount) / 100;
  }
  const total = subtotal + tax - discountAmount;
  return { subtotal, tax, total };
};

const generateBillNumber = async () => {
  const Bill = await import('../models/Bill.js').then(m => m.default);
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const count = await Bill.countDocuments() + 1;
  return `BILL-${year}${month}-${count.toString().padStart(4, '0')}`;
};

const generateBillForOrder = async (order, generatedBy = 'system') => {
  const existing = await Bill.findOne({ orderId: order._id });
  if (existing) return existing;

  const billNumber = await generateBillNumber();
  const billItems = order.items.map(item => ({
    productId: item.productId,
    productName: sanitizeInput(item.productName),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    notes: item.notes ? sanitizeInput(item.notes) : '',
    roundNumber: item.roundNumber || 1,
    personName: item.personName ? sanitizeInput(item.personName) : '',
    seatNumber: item.seatNumber || 0,
    restaurantId: order.restaurantId || null,
    restaurantName: order.restaurantName || '',
    branchId: order.branchId || null,
    branchName: order.branchName || '',
  }));

  const bill = await Bill.create({
    billNumber,
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableId: order.tableId || null,
    tableNumber: order.tableNumber || '',
    customerName: sanitizeInput(order.customerName || 'Guest'),
    customerPhone: order.customerPhone || '',
    customerAddress: sanitizeInput(order.customerAddress || ''),
    items: billItems,
    subtotal: order.subtotal,
    tax: order.tax,
    taxRate: order.taxRate || 5,
    discount: order.discount || 0,
    discountType: order.discountType || 'fixed',
    total: order.total,
    paymentMethod: order.paymentMethod || 'cash',
    paymentStatus: 'pending',
    notes: order.notes ? sanitizeInput(order.notes) : '',
    generatedBy,
    restaurantId: order.restaurantId || null,
    restaurantName: order.restaurantName || '',
    branchId: order.branchId || null,
    branchName: order.branchName || '',
  });

  console.log(`✅ Bill ${billNumber} generated for order ${order.orderNumber}`);
  return bill;
};

// ============================================================
//  STOCK MANAGEMENT
// ============================================================

const checkIngredientsAvailability = async (items) => {
  const insufficientIngredients = [];
  for (const item of items) {
    const dish = await Dish.findById(item.productId);
    if (!dish) {
      insufficientIngredients.push({
        productName: sanitizeInput(item.productName),
        error: 'Dish not found'
      });
      continue;
    }
    if (dish.variants && dish.variants.length > 0) {
      const variant = dish.variants[0];
      for (const ing of variant.ingredients) {
        if (ing.ingredientId) {
          const ingredient = await Ingredient.findById(ing.ingredientId);
          const requiredQty = ing.quantity * item.quantity;
          if (!ingredient) {
            insufficientIngredients.push({
              name: sanitizeInput(ing.ingredientName),
              required: requiredQty,
              available: 0,
              unit: ing.unit,
              productName: sanitizeInput(item.productName)
            });
          } else if (ingredient.currentStock < requiredQty) {
            insufficientIngredients.push({
              name: sanitizeInput(ingredient.name),
              required: requiredQty,
              available: ingredient.currentStock,
              unit: ingredient.unit,
              productName: sanitizeInput(item.productName)
            });
          }
        }
      }
    }
  }
  return {
    available: insufficientIngredients.length === 0,
    insufficientIngredients
  };
};

const deductIngredientsStock = async (items, orderId, orderNumber) => {
  const deductions = [];
  const errors = [];
  console.log(`[STOCK DEDUCT] Starting for order ${orderNumber}`);
  for (const item of items) {
    const dish = await Dish.findById(item.productId);
    if (!dish) {
      errors.push({ productName: sanitizeInput(item.productName), error: 'Dish not found' });
      continue;
    }
    if (dish.variants && dish.variants.length > 0) {
      const variant = dish.variants[0];
      for (const ing of variant.ingredients) {
        if (ing.ingredientId) {
          const requiredQty = ing.quantity * item.quantity;
          try {
            const ingredient = await Ingredient.findById(ing.ingredientId);
            if (!ingredient) {
              errors.push({
                ingredientName: sanitizeInput(ing.ingredientName),
                requiredQty,
                error: 'Ingredient not found'
              });
              continue;
            }
            if (ingredient.currentStock < requiredQty) {
              errors.push({
                ingredientName: sanitizeInput(ingredient.name),
                requiredQty,
                available: ingredient.currentStock,
                unit: ingredient.unit,
                productName: sanitizeInput(item.productName)
              });
              continue;
            }
            const previousStock = ingredient.currentStock;
            ingredient.currentStock -= requiredQty;
            await ingredient.save();
            deductions.push({
              ingredientId: ing.ingredientId,
              ingredientName: sanitizeInput(ingredient.name),
              quantity: requiredQty,
              unit: ingredient.unit,
              productName: sanitizeInput(item.productName),
              previousStock,
              newStock: ingredient.currentStock
            });
            console.log(`[STOCK DEDUCT] ✅ ${ingredient.name}: ${previousStock} → ${ingredient.currentStock} (${requiredQty} ${ingredient.unit} deducted)`);
          } catch (err) {
            errors.push({
              ingredientName: sanitizeInput(ing.ingredientName),
              requiredQty,
              error: err.message
            });
          }
        }
      }
    }
  }
  console.log(`[STOCK DEDUCT] Complete: ${deductions.length} deductions, ${errors.length} errors`);
  return { deductions, errors };
};





const restoreIngredientsStock = async (items, orderId, orderNumber) => {
  const restorations = [];
  for (const item of items) {
    const dish = await Dish.findById(item.productId);
    if (!dish) continue;
    if (dish.variants && dish.variants.length > 0) {
      const variant = dish.variants[0];
      for (const ing of variant.ingredients) {
        if (ing.ingredientId) {
          const restoredQty = ing.quantity * item.quantity;
          await Ingredient.findByIdAndUpdate(
            ing.ingredientId,
            { $inc: { currentStock: restoredQty } }
          );
          restorations.push({
            ingredientId: ing.ingredientId,
            quantity: restoredQty,
            productName: sanitizeInput(item.productName)
          });
          console.log(`[STOCK RESTORE] Restored ${restoredQty} of ${ing.ingredientName} for cancelled order ${orderNumber}`);
        }
      }
    }
  }
  return restorations;
};

// ============================================================
//  KOT HELPERS
// ============================================================

const generateKotNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const last = await KOT.findOne({ kotNumber: new RegExp(`^KOT-${dateStr}-`) }).sort({ createdAt: -1 });
  const seq = last ? parseInt(last.kotNumber.split('-').pop()) + 1 : 1;
  return `KOT-${dateStr}-${seq.toString().padStart(4, '0')}`;
};

const autoCreateKOT = async (order, items, kotStation = 'Main Kitchen') => {
  try {
    const existingKOT = await KOT.findOne({ orderId: order._id });
    if (existingKOT) {
      console.log(`✅ KOT already exists for order: ${order.orderNumber}`);
      return existingKOT;
    }

    if (!items || items.length === 0) {
      console.warn(`⚠️ No items to create KOT for order: ${order.orderNumber}`);
      return null;
    }

    const maxPrepTime = Math.max(...items.map(item => Math.min(item.prepTimeMinutes || 15, 240)), 15);
    const kotNumber = await generateKotNumber();

    const kotData = {
      kotNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType || 'dine-in',
      tableId: order.tableId || null,
      tableNumber: order.tableNumber || '',
      floorName: order.floorName || '',
      kotStation: kotStation || 'Main Kitchen',
      items: items.map(item => ({
        productId: item.productId,
        productName: sanitizeInput(item.productName || ''),
        quantity: item.quantity || 1,
        notes: item.notes ? sanitizeInput(item.notes) : '',
        prepTimeMinutes: Math.min(item.prepTimeMinutes || 15, 240),
        status: 'pending'
      })),
      priority: order.orderPriority === 'vip' ? 'urgent' : 'normal',
      priorityScore: order.isVip ? 100 : (order.orderPriority === 'vip' ? 80 : 0),
      isVip: order.isVip || false,
      allergyAlerts: order.allergyAlerts || [],
      notes: order.notes ? sanitizeInput(order.notes) : '',
      targetReadyAt: new Date(Date.now() + maxPrepTime * 60000),
      createdBy: order.createdBy || 'system',
      status: 'new',
      createdAt: new Date(),
    };
    
    const kot = await KOT.create(kotData);
    console.log(`✅✅✅ KOT CREATED: ${kot.kotNumber} | Order: ${order.orderNumber} | Status: ${kot.status}`);
    return kot;
  } catch (err) {
    console.error('❌ KOT creation failed for order:', order?.orderNumber, err.message);
    return null;
  }
};

export const syncOrderStatusFromKOT = async (kot) => {
  if (!kot) {
    console.warn('⚠️ syncOrderStatusFromKOT called with null/undefined KOT');
    return;
  }

  if (kot.status !== 'ready') {
    console.log(`⏭️ Sync skipped: KOT ${kot.kotNumber} status is ${kot.status}, not 'ready'`);
    return;
  }

  try {
    const order = await Order.findById(kot.orderId);
    if (!order) {
      console.warn(`⚠️ Order ${kot.orderId} not found for KOT ${kot.kotNumber}`);
      return;
    }

    if (['completed', 'cancelled'].includes(order.orderStatus)) {
      console.log(`⏭️ Order ${order.orderNumber} is already ${order.orderStatus}. Skipping sync.`);
      return;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      kot.orderId,
      { orderStatus: 'ready' },
      { new: true }
    );
    console.log(`✅ Order ${updatedOrder.orderNumber} status updated to 'ready'`);
    
    if (order.orderType === 'delivery') {
      await Order.findByIdAndUpdate(order._id, {
        deliveryStatus: 'ready_for_pickup'
      });
      console.log(`✅ Delivery order ${order.orderNumber} is ready for pickup`);
    }
  } catch (err) {
    console.error(`❌ Failed to sync order status:`, err.message);
  }
};

// ============================================================
//  ORDER CRUD OPERATIONS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all orders (Unified - Admin/Staff/Customer)
// @route   GET /api/orders
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const getOrdersUnified = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { orderStatus, orderType, search, showAll, branchId, restaurantId } = req.query;

    let statusFilter = {};
    if (orderStatus) {
      const statuses = orderStatus.split(',').map(s => s.trim());
      const validStatuses = statuses.filter(s => ALLOWED_ORDER_STATUS.includes(s));
      if (validStatuses.length > 0) {
        statusFilter.orderStatus = validStatuses.length === 1 
          ? validStatuses[0] 
          : { $in: validStatuses };
      }
    }

    if (orderType && !ALLOWED_ORDER_TYPES.includes(orderType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order type. Allowed: ${ALLOWED_ORDER_TYPES.join(', ')}`,
      });
    }

    const filter = {};

    if (statusFilter.orderStatus) {
      filter.orderStatus = statusFilter.orderStatus;
    }

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
    } else if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined' && restaurantId !== '') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.$or = [
        { restaurantId: restaurantId },
        { branchId: null },
        { branchId: { $exists: false } }
      ];
    }

    if (req.user && req.user.isAdmin) {
      // Admin - use filter as is
    } else if (req.staff) {
      if (showAll === 'true') {
        // Show all
      } else if (orderStatus) {
        // Use the filter we already set
      } else {
        filter.orderStatus = { $in: ['pending', 'confirmed', 'preparing', 'ready'] };
      }
    } else if (req.user) {
      filter.userId = req.user._id;
      if (orderStatus) {
        // Use the filter we already set
      }
      if (orderType) filter.orderType = orderType;
    } else {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (orderType) filter.orderType = orderType;

    if (search && (req.staff || (req.user && req.user.isAdmin))) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        ...(filter.$or || []),
        { orderNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { customerName: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const sanitizedOrders = orders.map(order => ({
      ...order,
      customerName: sanitizeInput(order.customerName || ''),
      customerAddress: sanitizeInput(order.customerAddress || ''),
      customerLandmark: sanitizeInput(order.customerLandmark || ''),
      notes: sanitizeInput(order.notes || ''),
      vipNotes: sanitizeInput(order.vipNotes || ''),
      deliveryInstructions: sanitizeInput(order.deliveryInstructions || ''),
      items: order.items?.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName),
        notes: item.notes ? sanitizeInput(item.notes) : '',
        personName: item.personName ? sanitizeInput(item.personName) : '',
      })) || [],
    }));

    return res.json({
      success: true,
      data: {
        orders: sanitizedOrders,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        userType: req.staff ? 'Staff' : 'Customer'
      }
    });
  } catch (err) {
    console.error('[GET /api/orders] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get orders (Admin)
// @route   GET /api/orders/admin
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

export const getOrders = async (req, res) => {
  try {
    console.log('📊 [getOrders] Starting...');
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search ? req.query.search.trim() : '';
    const orderStatus = req.query.orderStatus;
    const orderType = req.query.orderType;
    const branchId = req.query.branchId;
    const restaurantId = req.query.restaurantId;

    console.log('📊 [getOrders] Query params:', { page, limit, orderStatus, orderType, branchId, restaurantId, search });

    // ─── VALIDATION ──────────────────────────────────────────────────────
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

    // ─── BUILD FILTER ────────────────────────────────────────────────────
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

    // ─── BRANCH FILTER ──────────────────────────────────────────────────
    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    } 
    // ─── RESTAURANT FILTER ──────────────────────────────────────────────
    else if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined' && restaurantId !== '') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }

    console.log('📊 [getOrders] Filter:', JSON.stringify(filter, null, 2));

    // ─── FETCH ORDERS ────────────────────────────────────────────────────
    const total = await Order.countDocuments(filter);
    console.log(`📊 [getOrders] Total orders: ${total}`);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log(`📊 [getOrders] Found ${orders.length} orders`);

    // ─── GET RESTAURANT AND BRANCH NAMES ──────────────────────────────
    // Collect all restaurant and branch IDs from orders
    const restaurantIds = [...new Set(orders.map(o => o.restaurantId?.toString()).filter(Boolean))];
    const branchIds = [...new Set(orders.map(o => o.branchId?.toString()).filter(Boolean))];

    // Fetch restaurant details
    let restaurantMap = new Map();
    if (restaurantIds.length > 0) {
      try {
        const restaurants = await Restaurant.find({ 
          _id: { $in: restaurantIds.map(id => new mongoose.Types.ObjectId(id)) } 
        }).lean();
        restaurantMap = new Map(restaurants.map(r => [r._id.toString(), r.name]));
        console.log(`📊 [getOrders] Found ${restaurants.length} restaurants`);
      } catch (err) {
        console.log('⚠️ Could not fetch restaurants:', err.message);
      }
    }

    // Fetch branch details
    let branchMap = new Map();
    if (branchIds.length > 0) {
      try {
        const branches = await Branch.find({ 
          _id: { $in: branchIds.map(id => new mongoose.Types.ObjectId(id)) } 
        }).lean();
        branchMap = new Map(branches.map(b => [b._id.toString(), b.name]));
        console.log(`📊 [getOrders] Found ${branches.length} branches`);
      } catch (err) {
        console.log('⚠️ Could not fetch branches:', err.message);
      }
    }

    // ─── MAP ORDERS WITH RESTAURANT/BRANCH NAMES ──────────────────────
    const sanitizedOrders = orders.map(order => {
      // ✅ Use stored restaurant name if available
      let restaurantName = order.restaurantName || 'Unknown';
      let branchName = order.branchName || 'Unknown';
      
      // ✅ Only try to fetch from database if stored name is default or empty
      if (restaurantName === 'Unknown' || restaurantName === 'Restaurant' || !restaurantName || restaurantName === '') {
        const restaurantIdStr = order.restaurantId?.toString();
        if (restaurantIdStr && restaurantMap.has(restaurantIdStr)) {
          restaurantName = restaurantMap.get(restaurantIdStr);
        }
      }
      
      if (branchName === 'Unknown' || branchName === 'Main Branch' || !branchName || branchName === '') {
        const branchIdStr = order.branchId?.toString();
        if (branchIdStr && branchMap.has(branchIdStr)) {
          branchName = branchMap.get(branchIdStr);
        }
      }

      return {
        ...order,
        customerName: sanitizeInput(order.customerName || ''),
        customerAddress: sanitizeInput(order.customerAddress || ''),
        notes: sanitizeInput(order.notes || ''),
        restaurantId: order.restaurantId || null,
        restaurantName: restaurantName,
        branchId: order.branchId || null,
        branchName: branchName,
        items: order.items?.map(item => ({
          ...item,
          productName: sanitizeInput(item.productName || ''),
          notes: item.notes ? sanitizeInput(item.notes) : '',
        })) || [],
      };
    });

    console.log(`📊 [getOrders] Returning ${sanitizedOrders.length} orders`);
    if (sanitizedOrders.length > 0) {
      console.log('📋 Sample order:', {
        orderNumber: sanitizedOrders[0].orderNumber,
        restaurantName: sanitizedOrders[0].restaurantName,
        branchName: sanitizedOrders[0].branchName,
        restaurantId: sanitizedOrders[0].restaurantId,
        branchId: sanitizedOrders[0].branchId,
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
        }
      }
    });
    
  } catch (err) {
    console.error('❌ [GET /api/orders/admin] ERROR:', err.message);
    console.error('❌ [GET /api/orders/admin] STACK:', err.stack);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch orders',
      details: err.message 
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
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

    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

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
      data: sanitizedOrder,
    });
  } catch (err) {
    console.error('[GET /api/orders/:id] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create order
// @route   POST /api/orders
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

// controllers/orderController.js - COMPLETE FIXED createOrder with proper branch handling

// controllers/orderController.js - COMPLETE FIXED createOrder with proper branch handling

// controllers/orderController.js - COMPLETE FIXED createOrder

// controllers/orderController.js - FIXED createOrder with better fallback

// controllers/orderController.js - UPDATED createOrder with stock check

export const createOrder = async (req, res) => {
  try {
    const body = sanitizeObject(req.body);
    
    console.log('📦 Order request body:', JSON.stringify({
      restaurantId: body.restaurantId,
      branchId: body.branchId,
      restaurantName: body.restaurantName,
      branchName: body.branchName,
      itemsCount: body.items?.length || 0
    }, null, 2));
    
    // ─── DETERMINE WHO IS CREATING THE ORDER ────────────────────────────
    let createdBy = 'system';
    let createdByName = 'System';
    let staffId = null;
    let userRole = null;
    
    if (req.staff) {
      createdBy = req.staff._id || 'system';
      createdByName = req.staff.name || 'Staff';
      staffId = req.staff._id;
      userRole = req.staff.role?.name || req.staff.roleName || req.staff.primaryRole || 'staff';
      console.log(`👤 Staff creating order: ${createdByName} (${userRole})`);
    } else if (req.user) {
      createdBy = req.user._id || 'system';
      createdByName = req.user.firstName || req.user.email || 'User';
      console.log(`👤 User creating order: ${createdByName}`);
    }

    // ─── GET RESTAURANT AND BRANCH INFO ──────────────────────────────────
    let restaurantId = null;
    let restaurantName = '';
    let branchId = null;
    let branchName = '';
    
    // ✅ STEP 1: Get restaurant from request body
    if (body.restaurantId) {
      if (typeof body.restaurantId === 'string' && isValidObjectId(body.restaurantId)) {
        restaurantId = new mongoose.Types.ObjectId(body.restaurantId);
      } else if (body.restaurantId._id) {
        restaurantId = body.restaurantId._id;
      } else {
        restaurantId = body.restaurantId;
      }
      
      try {
        const restaurant = await Restaurant.findById(restaurantId).lean();
        if (restaurant) {
          restaurantName = restaurant.name;
          console.log(`📍 Fetched restaurant name from DB: ${restaurantName}`);
        }
      } catch (err) {
        console.log('⚠️ Could not fetch restaurant name:', err.message);
      }
    }
    
    // ✅ STEP 2: Get branch from request body
    if (body.branchId) {
      let branchObjectId = null;
      if (typeof body.branchId === 'string' && isValidObjectId(body.branchId)) {
        branchObjectId = new mongoose.Types.ObjectId(body.branchId);
      } else if (body.branchId._id) {
        branchObjectId = body.branchId._id;
      } else {
        branchObjectId = body.branchId;
      }
      
      console.log(`🔍 Looking for branch with ID: ${branchObjectId}`);
      
      try {
        const branch = await Branch.findById(branchObjectId).lean();
        if (branch) {
          branchId = branch._id;
          branchName = branch.name;
          console.log(`📍 Fetched branch from DB: ${branchName} (${branchId})`);
          
          if (!restaurantId && branch.restaurantId) {
            restaurantId = branch.restaurantId;
            const restaurant = await Restaurant.findById(restaurantId).lean();
            if (restaurant) {
              restaurantName = restaurant.name;
            }
          }
        } else {
          console.log(`❌ Branch NOT found in DB for ID: ${branchObjectId}`);
        }
      } catch (err) {
        console.log('❌ Could not fetch branch from DB:', err.message);
      }
    }
    
    // ✅ STEP 3: If no branchId from request, try to get from user or restaurant
    if (!branchId) {
      if (req.user?.branchId) {
        try {
          const branch = await Branch.findById(req.user.branchId).lean();
          if (branch) {
            branchId = branch._id;
            branchName = branch.name;
            console.log(`📍 Using branch from user: ${branchName} (${branchId})`);
          }
        } catch (err) {
          console.log('⚠️ Could not fetch branch from user:', err.message);
        }
      }
      
      if (!branchId && restaurantId) {
        try {
          const branch = await Branch.findOne({ 
            restaurantId: restaurantId,
            isActive: true 
          }).lean();
          if (branch) {
            branchId = branch._id;
            branchName = branch.name;
            console.log(`📍 Using fallback branch: ${branchName} (${branchId})`);
          }
        } catch (err) {
          console.log('⚠️ Could not fetch fallback branch:', err.message);
        }
      }
    }
    
    // ✅ STEP 4: If still no restaurantId, try to get from branch
    if (!restaurantId && branchId) {
      try {
        const branch = await Branch.findById(branchId).lean();
        if (branch && branch.restaurantId) {
          restaurantId = branch.restaurantId;
          const restaurant = await Restaurant.findById(restaurantId).lean();
          if (restaurant) {
            restaurantName = restaurant.name;
          }
        }
      } catch (err) {
        console.log('⚠️ Could not fetch restaurant from branch:', err.message);
      }
    }
    
    // ✅ STEP 5: Final fallback - get first available restaurant
    if (!restaurantId) {
      try {
        const restaurant = await Restaurant.findOne({}).lean();
        if (restaurant) {
          restaurantId = restaurant._id;
          restaurantName = restaurant.name;
          console.log(`📍 Using first available restaurant: ${restaurantName} (${restaurantId})`);
        }
      } catch (err) {
        console.log('⚠️ Could not fetch first restaurant:', err.message);
      }
    }
    
    // ✅ STEP 6: If still no branchId, get first branch for the restaurant
    if (!branchId && restaurantId) {
      try {
        const branch = await Branch.findOne({ 
          restaurantId: restaurantId,
          isActive: true 
        }).lean();
        if (branch) {
          branchId = branch._id;
          branchName = branch.name;
          console.log(`📍 Using first available branch: ${branchName} (${branchId})`);
        }
      } catch (err) {
        console.log('⚠️ Could not fetch first branch:', err.message);
      }
    }
    
    // ✅ Final fallback
    if (!branchName || branchName === '') {
      branchName = restaurantName ? `${restaurantName} - Main` : 'Main Branch';
    }
    if (!restaurantName || restaurantName === '') {
      restaurantName = 'Restaurant';
    }
    
    console.log(`📋 Creating order with: Restaurant: ${restaurantName} (${restaurantId}), Branch: ${branchName} (${branchId})`);

    // ─── VALIDATION ──────────────────────────────────────────────────────
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one item is required',
      });
    }

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (!item.productId) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Product ID is required`,
        });
      }
      if (!item.productName || item.productName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Product name is required`,
        });
      }
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Quantity must be at least 1`,
        });
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Unit price must be greater than 0`,
        });
      }
    }

    // ─── ✅ NEW: CHECK INGREDIENT AVAILABILITY BEFORE ORDER CREATION ────
    const stockCheck = await checkIngredientsAvailability(body.items);
    if (!stockCheck.available) {
      // Build a readable error message for the frontend
      const missingItems = stockCheck.insufficientIngredients.map(issue => {
        if (issue.error) {
          return `${issue.productName || 'Item'} - ${issue.error}`;
        }
        return `${issue.name} - need ${issue.required} ${issue.unit}, have ${issue.available}`;
      });
      
      return res.status(400).json({
        success: false,
        error: 'Insufficient ingredients for one or more items',
        insufficientIngredients: stockCheck.insufficientIngredients,
        message: `Cannot create order: ${missingItems.join('; ')}`
      });
    }

    // ─── GENERATE ORDER NUMBER ───────────────────────────────────────────
    const orderNumber = await generateOrderNumber();
    const taxRate = Math.min(Math.max(body.taxRate || 5, 0), 100);
    const discount = body.discount || 0;
    const discountTypeFinal = body.discountType || 'fixed';
    const { subtotal, tax, total } = calculateTotals(body.items, taxRate, discount, discountTypeFinal);

    // ─── CREATE ORDER ─────────────────────────────────────────────────────
    const orderData = {
      orderNumber,
      orderType: body.orderType || 'dine-in',
      tableId: body.tableId || null,
      tableNumber: body.tableNumber || '',
      customerName: body.customerName ? sanitizeInput(body.customerName.trim()) : (body.orderType === 'takeaway' ? 'Walk-in' : ''),
      customerPhone: body.customerPhone || '',
      customerAddress: body.customerAddress ? sanitizeInput(body.customerAddress.trim()) : '',
      customerLandmark: body.customerLandmark ? sanitizeInput(body.customerLandmark.trim()) : '',
      items: body.items.map(item => ({
        ...item,
        roundNumber: 1,
        orderedAt: new Date(),
        productName: sanitizeInput(item.productName),
        notes: item.notes ? sanitizeInput(item.notes) : '',
        personName: item.personName ? sanitizeInput(item.personName) : '',
        restaurantId: restaurantId ? restaurantId.toString() : null,
        restaurantName: restaurantName,
        branchId: branchId ? branchId.toString() : null,
        branchName: branchName,
      })),
      subtotal,
      tax,
      taxRate,
      discount,
      discountType: discountTypeFinal,
      total,
      paymentMethod: body.paymentMethod || 'cash',
      paymentStatus: body.paymentStatus || 'pending',
      notes: body.notes ? sanitizeInput(body.notes.trim()) : '',
      createdBy: createdBy,
      createdByName: createdByName,
      staffId: staffId,
      userRole: userRole,
      currentRound: 1,
      isVip: body.isVip || false,
      vipNotes: body.vipNotes ? sanitizeInput(body.vipNotes.trim()) : '',
      orderPriority: body.isVip ? 'vip' : (body.orderPriority || 'normal'),
      restaurantId: restaurantId,
      restaurantName: restaurantName,
      branchId: branchId,
      branchName: branchName,
      kotPrinted: false,
      kitchenAcknowledged: false,
      deliveryStatus: body.orderType === 'delivery' ? 'pending' : undefined,
    };

    console.log('📋 Order data before save:', {
      restaurantName: orderData.restaurantName,
      branchName: orderData.branchName,
      restaurantId: orderData.restaurantId,
      branchId: orderData.branchId,
    });

    const order = await Order.create(orderData);
    console.log(`✅ Order ${order.orderNumber} created by ${createdByName}`);
    console.log(`   Branch: ${branchName} (${branchId})`);
    console.log(`   Restaurant: ${restaurantName} (${restaurantId})`);

    // ─── ✅ NEW: DEDUCT INGREDIENT STOCK AFTER ORDER CREATION ──────────
    try {
      const deductionResult = await deductIngredientsStock(body.items, order._id, order.orderNumber);
      if (deductionResult.errors && deductionResult.errors.length > 0) {
        // Log errors but continue – stock may be partially deducted, but we already passed the check
        console.error('⚠️ Stock deduction errors:', deductionResult.errors);
      }
    } catch (deductError) {
      console.error('❌ Stock deduction failed:', deductError);
      // We don't roll back the order because the check passed, but we log the error
    }

    // ─── AUTO-CREATE KOT ──────────────────────────────────────────────────
    try {
      const kotStation = body.kotStation || 'Main Kitchen';
      await autoCreateKOT(order, body.items, kotStation);
    } catch (kotError) {
      console.error('❌ KOT creation error:', kotError);
    }

    // ─── UPDATE TABLE STATUS ─────────────────────────────────────────────
    if (order.tableId && order.orderType === 'dine-in') {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'occupied',
        currentOrderId: order._id,
      });
    }

    // ─── RESPONSE ─────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      data: order,
      message: `Order ${order.orderNumber} created successfully!`,
      stockDeducted: true,
      kotGenerated: true,
      createdBy: {
        id: createdBy,
        name: createdByName,
        role: userRole || 'customer'
      },
      branch: {
        id: branchId,
        name: branchName
      },
      restaurant: {
        id: restaurantId,
        name: restaurantName
      }
    });
  } catch (err) {
    console.error('[POST /api/orders] ERROR:', err.message);
    console.error('[POST /api/orders] STACK:', err.stack);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create order',
      details: err.message 
    });
  }
};
// ──────────────────────────────────────────────────────────────────────────
// @desc    Add items to existing order
// @route   PATCH /api/orders/:id/add-items
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const addItemsToOrder = async (req, res) => {
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

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Order is already paid. Cannot add more items.',
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Order is cancelled',
      });
    }

    if (order.currentRound >= MAX_ROUNDS) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_ROUNDS} rounds reached.`,
      });
    }

    const { items, personName, seatNumber } = sanitizeObject(req.body);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one item is required',
      });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId || !isValidObjectId(item.productId)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Invalid product ID`,
        });
      }
      if (!item.productName || item.productName.length > 100) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Invalid product name`,
        });
      }
      if (!isValidQuantity(item.quantity)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Quantity must be between 1 and 999`,
        });
      }
      if (!isValidPrice(item.unitPrice)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Invalid unit price`,
        });
      }
      if (item.totalPrice !== item.quantity * item.unitPrice) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Total price does not match quantity × unit price`,
        });
      }
    }

    const stockCheck = await checkIngredientsAvailability(items);
    if (!stockCheck.available) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient ingredients',
        insufficientIngredients: stockCheck.insufficientIngredients
      });
    }

    const newRound = (order.currentRound || 1) + 1;
    const newItems = items.map(item => ({
      ...item,
      roundNumber: newRound,
      seatNumber: seatNumber || 0,
      personName: personName ? sanitizeInput(personName) : '',
      orderedAt: new Date(),
      productName: sanitizeInput(item.productName),
      notes: item.notes ? sanitizeInput(item.notes) : '',
    }));

    await deductIngredientsStock(items, order._id, order.orderNumber);
    order.items.push(...newItems);
    order.currentRound = newRound;

    const { subtotal, tax, total } = calculateTotals(
      order.items, order.taxRate, order.discount, order.discountType
    );
    order.subtotal = subtotal;
    order.tax = tax;
    order.total = total;

    if (order.orderStatus === 'completed') {
      order.orderStatus = 'preparing';
      order.billRequested = false;
      order.billRequestedAt = null;
    } else if (order.orderStatus === 'ready') {
      order.orderStatus = 'preparing';
    }

    await order.save();
    await autoCreateKOT(order, newItems, 'Main Kitchen');

    return res.json({
      success: true,
      data: order,
      message: `Round ${newRound} added successfully!`,
      stockDeducted: true
    });
  } catch (err) {
    console.error('[PATCH /api/orders/:id/add-items] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add items' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Cancel order
// @route   DELETE /api/orders/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const cancelOrder = async (req, res) => {
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

    if (order.orderStatus === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed order',
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Order is already paid. Please process refund instead.',
      });
    }

    await restoreIngredientsStock(order.items, order._id, order.orderNumber);
    order.orderStatus = 'cancelled';
    order.paymentStatus = 'refunded';
    await order.save();

    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'available',
        currentOrderId: null,
      });
    }

    await KOT.updateMany(
      { orderId: order._id, status: { $nin: ['served', 'cancelled'] } },
      { $set: { status: 'cancelled', notes: 'Order cancelled' } }
    );

    return res.json({
      success: true,
      data: order,
      message: 'Order cancelled and stock restored'
    });
  } catch (err) {
    console.error('[DELETE /api/orders/:id] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update order status (Role-based)
// @route   PATCH /api/orders/:id/status
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const { orderStatus, kotPrinted } = req.body;
    if (!orderStatus || !isValidOrderStatus(orderStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order status. Allowed: ${ALLOWED_ORDER_STATUS.join(', ')}`,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const userRole = req.staff?.role?.name || req.staff?.roleName || req.user?.role || '';
    const isKitchen = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'].includes(userRole?.toLowerCase());
    const isWaiter = userRole?.toLowerCase() === 'waiter';
    const isDelivery = ['delivery_boy', 'rider', 'driver'].includes(userRole?.toLowerCase());
    const isManager = ['manager', 'admin'].includes(userRole?.toLowerCase());

    console.log(`👤 User: ${req.staff?.name || req.user?.firstName || 'Unknown'}`);
    console.log(`🎭 Role: ${userRole}`);
    console.log(`📦 Order: ${order.orderNumber}, Status: ${order.orderStatus} → ${orderStatus}`);

    // ─── BLOCK: Kitchen cannot mark as 'completed' ──────────────────────
    if (orderStatus === 'completed' && isKitchen) {
      return res.status(403).json({
        success: false,
        error: '❌ Kitchen staff cannot complete orders. Only waiters or delivery boys can.',
        requiresAction: order.orderType === 'delivery' ? 'delivery_boy' : 'waiter',
      });
    }

    // ─── WAITER: Can complete dine-in/takeaway orders ──────────────────
    if (orderStatus === 'completed' && (isWaiter || isManager)) {
      if (!['dine-in', 'takeaway'].includes(order.orderType)) {
        return res.status(400).json({
          success: false,
          error: `Waiter cannot complete ${order.orderType} orders. Only delivery boys can.`,
        });
      }

      if (order.orderStatus !== 'ready') {
        return res.status(400).json({
          success: false,
          error: `Order must be 'ready' before serving. Current status: ${order.orderStatus}`,
        });
      }

      order.orderStatus = 'completed';
      order.servedBy = req.staff?._id || req.user?._id;
      order.servedByName = req.staff?.name || req.user?.firstName || 'Waiter';
      order.servedAt = new Date();
      order.completedBy = 'waiter';

      if (order.tableId && order.paymentStatus === 'paid') {
        await Table.findByIdAndUpdate(order.tableId, {
          status: 'available',
          currentOrderId: null,
        });
      }

      await KOT.updateMany(
        { orderId: order._id, status: { $nin: ['served', 'cancelled'] } },
        { $set: { status: 'served', servedAt: new Date() } }
      );

      const generatedBy = req.staff?._id || req.user?._id || 'system';
      await generateBillForOrder(order, generatedBy);

      await order.save();

      return res.json({
        success: true,
        data: order,
        message: `✅ Order served by ${order.servedByName}!`,
        servedBy: order.servedByName,
        servedAt: order.servedAt,
      });
    }

    // ─── DELIVERY BOY: Can complete delivery orders ────────────────────
    if (orderStatus === 'completed' && (isDelivery || isManager)) {
      if (order.orderType !== 'delivery') {
        return res.status(400).json({
          success: false,
          error: 'Delivery boy can only complete delivery orders.',
        });
      }

      if (order.orderStatus !== 'ready') {
        return res.status(400).json({
          success: false,
          error: `Order must be 'ready' before delivery. Current status: ${order.orderStatus}`,
        });
      }

      order.orderStatus = 'completed';
      order.deliveredBy = req.staff?._id || req.user?._id;
      order.deliveredByName = req.staff?.name || req.user?.firstName || 'Delivery Boy';
      order.deliveredAt = new Date();
      order.completedBy = 'delivery_boy';
      order.deliveryStatus = 'delivered';

      await KOT.updateMany(
        { orderId: order._id, status: { $nin: ['served', 'cancelled'] } },
        { $set: { status: 'served', servedAt: new Date() } }
      );

      const generatedBy = req.staff?._id || req.user?._id || 'system';
      await generateBillForOrder(order, generatedBy);

      await order.save();

      return res.json({
        success: true,
        data: order,
        message: `✅ Order delivered by ${order.deliveredByName}!`,
        deliveredBy: order.deliveredByName,
        deliveredAt: order.deliveredAt,
      });
    }

    // ─── KITCHEN: Can mark as 'ready' only ─────────────────────────────
    if (isKitchen) {
      if (orderStatus === 'completed') {
        return res.status(403).json({
          success: false,
          error: '❌ Kitchen staff cannot complete orders.',
          requiresAction: order.orderType === 'delivery' ? 'delivery_boy' : 'waiter',
        });
      }

      if (orderStatus === 'ready') {
        const kot = await KOT.findOne({ orderId: order._id });
        if (!kot) {
          return res.status(400).json({
            success: false,
            error: 'No KOT found for this order. Please create KOT first.',
          });
        }
        if (kot.status !== 'ready') {
          return res.status(400).json({
            success: false,
            error: `Cannot mark order ready because KOT is not ready (current status: ${kot.status}).`,
          });
        }

        order.orderStatus = 'ready';
        await order.save();

        return res.json({
          success: true,
          data: order,
          message: '✅ Order marked as ready!',
          requiresAction: order.orderType === 'delivery' ? 'delivery_boy' : 'waiter',
        });
      }

      if (['confirmed', 'preparing'].includes(orderStatus)) {
        order.orderStatus = orderStatus;
        if (orderStatus === 'preparing') {
          order.prepStartedAt = new Date();
        }
        await order.save();

        return res.json({
          success: true,
          data: order,
          message: `Order ${orderStatus} successfully`,
        });
      }

      return res.status(400).json({
        success: false,
        error: `Kitchen cannot set status to '${orderStatus}'. Allowed: confirmed, preparing, ready`,
      });
    }

    // ─── OTHER STATUS UPDATES ──────────────────────────────────────────
    order.orderStatus = orderStatus;
    if (kotPrinted !== undefined) order.kotPrinted = kotPrinted;
    await order.save();

    return res.json({
      success: true,
      data: order,
      message: `Order ${orderStatus} successfully`,
    });
  } catch (err) {
    console.error('[PATCH /api/orders/:id/status] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Kitchen acknowledge order
// @route   PATCH /api/orders/:id/kitchen-acknowledge
// @access  Private (Kitchen Staff)
// ──────────────────────────────────────────────────────────────────────────

export const kitchenAcknowledgeOrder = async (req, res) => {
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

    if (order.orderStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Order must be pending to acknowledge. Current status: ${order.orderStatus}`,
      });
    }

    if (order.kitchenAcknowledged) {
      return res.status(409).json({
        success: false,
        error: 'Order already acknowledged by kitchen',
      });
    }

    order.kitchenAcknowledged = true;
    order.kitchenAcknowledgedAt = new Date();
    order.orderStatus = 'confirmed';
    await order.save();

    return res.json({
      success: true,
      data: order,
      message: 'Order acknowledged by kitchen. Ready to start cooking.'
    });
  } catch (err) {
    console.error('[PATCH /api/orders/:id/kitchen-acknowledge] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to acknowledge order' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Request bill
// @route   PATCH /api/orders/:id/request-bill
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const requestBill = async (req, res) => {
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

    if (order.orderStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: `Order must be completed before requesting bill. Current status: ${order.orderStatus}`,
      });
    }

    order.billRequested = true;
    order.billRequestedAt = new Date();
    await order.save();

    const generatedBy = req.staff?._id || req.user?._id || 'system';
    await generateBillForOrder(order, generatedBy);

    return res.json({
      success: true,
      data: order,
      message: 'Bill requested and generated successfully'
    });
  } catch (err) {
    console.error('[PATCH /api/orders/:id/request-bill] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to request bill' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Cancel order with bill
// @route   POST /api/orders/:id/cancel-with-bill
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const cancelOrderWithBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const { reason, applyCancellationCharge } = req.body;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.orderStatus === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed order',
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Order is already paid. Please process refund instead.',
      });
    }

    if (reason && !isValidCancellationReason(reason)) {
      return res.status(400).json({
        success: false,
        error: `Reason cannot exceed ${MAX_CANCELLATION_REASON_LENGTH} characters`,
      });
    }

    let cancellationCharge = 0;
    let bill = null;

    if (applyCancellationCharge && ['confirmed', 'preparing', 'ready'].includes(order.orderStatus)) {
      cancellationCharge = order.total * 0.1;
      const Bill = await import('../models/Bill.js').then(m => m.default);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const lastBill = await Bill.findOne({ billNumber: { $regex: `^BILL-${dateStr}-` } }).sort({ billNumber: -1 });
      const seq = lastBill ? parseInt(lastBill.billNumber.split('-').pop()) + 1 : 1;
      const billNumber = `BILL-${dateStr}-${seq.toString().padStart(4, '0')}`;
      const billItems = order.items.map(item => ({
        productId: item.productId,
        productName: sanitizeInput(item.productName),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes ? sanitizeInput(item.notes) : '',
        roundNumber: item.roundNumber || 1,
        personName: item.personName ? sanitizeInput(item.personName) : '',
        seatNumber: item.seatNumber || 0,
      }));
      bill = await Bill.create({
        billNumber,
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        tableId: order.tableId || null,
        tableNumber: order.tableNumber || '',
        customerName: sanitizeInput(order.customerName || 'Guest'),
        customerPhone: order.customerPhone || '',
        customerAddress: sanitizeInput(order.customerAddress || ''),
        items: billItems,
        subtotal: cancellationCharge,
        tax: 0,
        taxRate: 0,
        total: cancellationCharge,
        discount: 0,
        discountType: 'fixed',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        notes: `Cancellation charge for order ${order.orderNumber}. Reason: ${reason || 'Not specified'}`,
        generatedBy: req.user?._id || 'system'
      });
      console.log(`✅ Cancellation bill created: ${billNumber} for ₹${cancellationCharge}`);
    }

    await restoreIngredientsStock(order.items, order._id, order.orderNumber);
    order.orderStatus = 'cancelled';

    if (cancellationCharge > 0) {
      order.notes = `${order.notes || ''} [CANCELLED - Charge: ₹${cancellationCharge}] Reason: ${reason || 'Not specified'}`;
    } else {
      order.notes = `${order.notes || ''} [CANCELLED] Reason: ${reason || 'Not specified'}`;
    }

    await order.save();

    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'available',
        currentOrderId: null,
      });
    }

    await KOT.updateMany(
      { orderId: order._id, status: { $nin: ['served', 'cancelled'] } },
      { $set: { status: 'cancelled', notes: `Order cancelled${reason ? ': ' + reason : ''}` } }
    );

    return res.json({
      success: true,
      message: cancellationCharge > 0 ? 'Order cancelled. Cancellation charge applies.' : 'Order cancelled successfully',
      billId: bill?._id,
      cancellationCharge
    });
  } catch (err) {
    console.error('[POST /api/orders/:id/cancel-with-bill] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Process refund
// @route   POST /api/orders/:id/refund
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const { reason } = req.body;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.orderStatus !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Only cancelled orders can be refunded',
      });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Order is not paid',
      });
    }

    if (reason && !isValidRefundReason(reason)) {
      return res.status(400).json({
        success: false,
        error: `Reason cannot exceed ${MAX_REFUND_REASON_LENGTH} characters`,
      });
    }

    order.orderStatus = 'refunded';
    order.paymentStatus = 'refunded';
    order.notes = `${order.notes || ''} [REFUNDED] Reason: ${reason || 'Customer requested'}`;
    await order.save();

    const Bill = await import('../models/Bill.js').then(m => m.default);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const lastBill = await Bill.findOne({ billNumber: { $regex: `^BILL-${dateStr}-` } }).sort({ billNumber: -1 });
    const seq = lastBill ? parseInt(lastBill.billNumber.split('-').pop()) + 1 : 1;
    const billNumber = `BILL-${dateStr}-${seq.toString().padStart(4, '0')}`;
    const billItems = order.items.map(item => ({
      productId: item.productId,
      productName: sanitizeInput(item.productName),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: -item.totalPrice,
      notes: item.notes ? sanitizeInput(item.notes) : '',
      roundNumber: item.roundNumber || 1,
      personName: item.personName ? sanitizeInput(item.personName) : '',
      seatNumber: item.seatNumber || 0,
    }));

    const refundBill = await Bill.create({
      billNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableId: order.tableId || null,
      tableNumber: order.tableNumber || '',
      customerName: sanitizeInput(order.customerName || 'Guest'),
      customerPhone: order.customerPhone || '',
      customerAddress: sanitizeInput(order.customerAddress || ''),
      items: billItems,
      subtotal: -order.subtotal,
      tax: -order.tax,
      taxRate: order.taxRate,
      total: -order.total,
      discount: order.discount,
      discountType: order.discountType,
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: 'refunded',
      notes: `Refund for cancelled order ${order.orderNumber}. Reason: ${reason || 'Customer requested'}`,
      generatedBy: req.user?._id || 'system'
    });

    return res.json({
      success: true,
      message: 'Refund processed successfully',
      billId: refundBill._id
    });
  } catch (err) {
    console.error('[POST /api/orders/:id/refund] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to process refund' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Change order table
// @route   PATCH /api/orders/:id/table
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const changeOrderTable = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const { tableId, tableNumber } = req.body;
    if (!tableId || !isValidObjectId(tableId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID format',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.orderType !== 'dine-in') {
      return res.status(400).json({
        success: false,
        error: 'Only dine-in orders can change table',
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot change table for paid order',
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot change table for cancelled order',
      });
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    if (table.status !== 'available') {
      return res.status(400).json({
        success: false,
        error: `Table is currently ${table.status}`,
      });
    }

    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'available',
        currentOrderId: null,
      });
    }

    await Table.findByIdAndUpdate(tableId, {
      status: 'occupied',
      currentOrderId: order._id,
    });

    order.tableId = tableId;
    order.tableNumber = table.number || tableNumber;
    await order.save();

    await KOT.updateMany(
      { orderId: order._id },
      { $set: { tableId, tableNumber: order.tableNumber } }
    );

    return res.json({
      success: true,
      data: order,
      message: `Order moved to Table ${order.tableNumber}`
    });
  } catch (err) {
    console.error('[PATCH /api/orders/:id/table] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to change table' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Request ready
// @route   POST /api/orders/:id/request-ready
// @access  Private (Kitchen Staff)
// ──────────────────────────────────────────────────────────────────────────

export const requestReady = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const { notes } = req.body;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.orderStatus !== 'preparing') {
      return res.status(400).json({
        success: false,
        error: `Only orders in "preparing" status can request ready. Current status: ${order.orderStatus}`,
      });
    }

    if (order.readyRequested) {
      return res.status(400).json({
        success: false,
        error: 'Ready already requested for this order. Waiting for manager approval.',
      });
    }

    if (notes && !isValidReadyNotes(notes)) {
      return res.status(400).json({
        success: false,
        error: `Ready notes cannot exceed ${MAX_READY_NOTES_LENGTH} characters`,
      });
    }

    order.readyRequested = true;
    order.readyRequestedAt = new Date();
    order.readyNotes = notes ? sanitizeInput(notes) : '';
    await order.save();

    return res.json({
      success: true,
      data: order,
      message: '✅ Ready request sent. Waiting for manager approval.'
    });
  } catch (err) {
    console.error('[POST /api/orders/:id/request-ready] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to request ready' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Approve ready
// @route   POST /api/orders/:id/approve-ready
// @access  Private (Manager)
// ──────────────────────────────────────────────────────────────────────────

export const approveReady = async (req, res) => {
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

    if (!order.readyRequested) {
      return res.status(400).json({
        success: false,
        error: 'No ready request found for this order',
      });
    }

    order.orderStatus = 'ready';
    order.readyRequested = false;
    order.approvedAt = new Date();
    order.approvedBy = req.user?._id || req.staff?._id;
    await order.save();

    return res.json({
      success: true,
      data: order,
      message: '✅ Order approved and marked as ready to serve!'
    });
  } catch (err) {
    console.error('[POST /api/orders/:id/approve-ready] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to approve ready' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Reject ready
// @route   POST /api/orders/:id/reject-ready
// @access  Private (Manager)
// ──────────────────────────────────────────────────────────────────────────

export const rejectReady = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const { reason } = req.body;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (!order.readyRequested) {
      return res.status(400).json({
        success: false,
        error: 'No ready request found for this order',
      });
    }

    if (reason && !isValidRejectionReason(reason)) {
      return res.status(400).json({
        success: false,
        error: `Rejection reason cannot exceed ${MAX_REJECTION_REASON_LENGTH} characters`,
      });
    }

    order.readyRequested = false;
    order.readyRejectedAt = new Date();
    order.readyRejectionReason = reason ? sanitizeInput(reason) : 'No reason provided';
    await order.save();

    return res.json({
      success: true,
      data: order,
      message: '❌ Ready request rejected. Please check the order again.'
    });
  } catch (err) {
    console.error('[POST /api/orders/:id/reject-ready] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to reject ready' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update payment
// @route   PATCH /api/orders/:id/payment
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const { paymentMethod, paymentStatus } = req.body;

    if (paymentMethod && !isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      });
    }

    if (!paymentStatus || !isValidPaymentStatus(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUS.join(', ')}`,
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { paymentMethod, paymentStatus } },
      { new: true }
    ).lean();

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (paymentStatus === 'paid' && order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'available',
        currentOrderId: null,
      });
    }

    return res.json({
      success: true,
      data: order,
      message: 'Payment updated'
    });
  } catch (err) {
    console.error('[PATCH /api/orders/:id/payment] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update payment' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get VIP orders
// @route   GET /api/orders/vip
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const getVIPOrders = async (req, res) => {
  try {
    const vipOrders = await Order.find({
      isVip: true,
      paymentStatus: { $ne: 'paid' },
      orderStatus: { $nin: ['cancelled', 'completed'] }
    }).sort({ createdAt: 1 }).lean();

    const sanitizedOrders = vipOrders.map(order => ({
      ...order,
      customerName: sanitizeInput(order.customerName || ''),
      customerAddress: sanitizeInput(order.customerAddress || ''),
      vipNotes: sanitizeInput(order.vipNotes || ''),
    }));

    return res.json({
      success: true,
      data: sanitizedOrders
    });
  } catch (err) {
    console.error('[GET /api/orders/vip] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch VIP orders' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update VIP status
// @route   PATCH /api/orders/:id/vip
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const updateVIPStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const { isVip, vipNotes } = req.body;

    if (isVip !== undefined && typeof isVip !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isVip must be a boolean',
      });
    }

    if (vipNotes && !isValidVipNotes(vipNotes)) {
      return res.status(400).json({
        success: false,
        error: `VIP notes cannot exceed ${MAX_VIP_NOTES_LENGTH} characters`,
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          isVip,
          vipNotes: vipNotes ? sanitizeInput(vipNotes) : '',
          orderPriority: isVip ? 'vip' : 'normal'
        }
      },
      { new: true }
    ).lean();

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await KOT.updateMany(
      { orderId: order._id },
      { $set: { isVip, priority: isVip ? 'urgent' : 'normal' } }
    );

    return res.json({
      success: true,
      data: order,
      message: isVip ? 'Order marked as VIP' : 'VIP status removed'
    });
  } catch (err) {
    console.error('[PATCH /api/orders/:id/vip] ERROR:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update VIP status' });
  }
};

// ─── EXPORTS ──────────────────────────────────────────────────────────────

export default {
  getOrdersUnified,
  getOrders,
  getOrderById,
  createOrder,
  addItemsToOrder,
  cancelOrder,
  updateOrderStatus,
  kitchenAcknowledgeOrder,
  requestBill,
  cancelOrderWithBill,
  processRefund,
  changeOrderTable,
  requestReady,
  approveReady,
  rejectReady,
  updatePayment,
  getVIPOrders,
  updateVIPStatus,
  syncOrderStatusFromKOT,
};