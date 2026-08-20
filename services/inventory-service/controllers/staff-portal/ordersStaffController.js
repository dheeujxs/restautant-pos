// controllers/staff-portal/ordersStaffController.js - COMPLETE FIXED VERSION

import Order from '../../models/Order.js';
import Dish from '../../models/Dish.js';
import Category from '../../models/Category.js';
import KOT from '../../models/KOT.js';
import Table from '../../models/Table.js';
import Bill from '../../models/Bill.js'; 
import { 
  isValidObjectId, 
  isValidText, 
  isValidPrice, 
  isValidQuantity,
  isValidOrderStatus,
  isValidOrderType,
  isValidPaymentStatus,
  validateOrderItems,
  MAX_ITEMS_PER_ORDER,
  ALLOWED_ORDER_STATUS,
  ALLOWED_ORDER_TYPES,
  ALLOWED_PAYMENT_STATUS,
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';
import crypto from 'crypto';

// ============================================================
//  ─── SECURITY CONSTANTS ─────────────────────────────────────
// ============================================================'



const generateBillNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const count = await Bill.countDocuments() + 1;
  return `BILL-${year}${month}${day}-${count.toString().padStart(4, '0')}`;
};

// ─── Helper: Generate Bill from Order ──────────────────────────────────────
const generateBillFromOrder = async (order, staff) => {
  try {
    // Check if bill already exists
    const existingBill = await Bill.findOne({ orderId: order._id });
    if (existingBill) {
      console.log(`📊 Bill already exists for order ${order.orderNumber}`);
      return existingBill;
    }

    const billNumber = await generateBillNumber();
    
    const billData = {
      billNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType || 'dine-in',
      tableId: order.tableId || null,
      tableNumber: order.tableNumber || '',
      customerName: order.customerName || 'Guest',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      items: order.items || [],
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      taxRate: order.taxRate || 5,
      discount: order.discount || 0,
      discountType: order.discountType || 'fixed',
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: 'pending',
      notes: order.notes || '',
      generatedBy: staff?._id || 'system',
      generatedByName: staff?.name || 'System',
      restaurantId: order.restaurantId || null,
      restaurantName: order.restaurantName || '',
      branchId: order.branchId || null,
      branchName: order.branchName || '',
      isVip: order.isVip || false,
    };

    const bill = await Bill.create(billData);
    console.log(`✅ Bill ${billNumber} generated for order ${order.orderNumber}`);
    return bill;
  } catch (error) {
    console.error('❌ Error generating bill:', error);
    throw error;
  }
};

const MAX_ORDERS_PER_REQUEST = 1000;
const MAX_ITEMS_PER_ORDER_SA = 50;
const ALLOWED_ORDER_STATUSES = ALLOWED_ORDER_STATUS;
const ALLOWED_ORDER_TYPES_SA = ALLOWED_ORDER_TYPES;
const ALLOWED_PAYMENT_STATUSES = ALLOWED_PAYMENT_STATUS;
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 30;
const KITCHEN_ROLES = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'];
const WAITER_ROLES = ['waiter', 'cashier'];
const MANAGER_ROLES = ['manager', 'admin', 'superadmin'];

// ─── In-memory rate limiter ────────────────────────────────
const rateLimiter = new Map();

// ─── Helper Functions ──────────────────────────────────────
const getUserRole = (staff) => {
  if (!staff) return '';
  return staff?.role?.name || staff?.roleName || staff?.primaryRole || '';
};

const isKitchenRole = (role) => {
  if (!role) return false;
  return KITCHEN_ROLES.includes(role.toLowerCase());
};

const isWaiterRole = (role) => {
  if (!role) return false;
  return WAITER_ROLES.includes(role.toLowerCase());
};

const isManagerRole = (role) => {
  if (!role) return false;
  return MANAGER_ROLES.includes(role.toLowerCase());
};

// ─── Security Audit Logger ──────────────────────────────────
const logSecurityEvent = async (eventType, userId, details = {}) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'anonymous',
      details,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
    };
    console.log('🔒 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
    return logEntry;
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
};

// ─── Rate Limiter ──────────────────────────────────────────
const checkRateLimit = (userId, endpoint) => {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  const data = rateLimiter.get(key);
  
  if (now > data.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (data.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  data.count++;
  rateLimiter.set(key, data);
  return true;
};

// ─── Input Validation ──────────────────────────────────────
const validateOrderStatus = (status) => {
  if (!status) return false;
  return ALLOWED_ORDER_STATUSES.includes(status);
};

const validateOrderType = (type) => {
  if (!type) return true;
  return ALLOWED_ORDER_TYPES_SA.includes(type);
};

const validatePaymentStatus = (status) => {
  if (!status) return true;
  return ALLOWED_PAYMENT_STATUSES.includes(status);
};

// ─── SQL Injection Prevention ──────────────────────────────
const containsSQLInjection = (str) => {
  if (!str || typeof str !== 'string') return false;
  
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|MERGE)\b)/gi,
    /(\b(UNION|INTERSECT|EXCEPT|MINUS)\b)/gi,
    /(\b(OR|AND)\s+[=!<>])/gi,
    /['"]\s*(OR|AND)\s*['"]/gi,
    /(--)/g,
    /(\/\*)/g,
    /(\*\/)/g,
    /(;+\s*$)/g,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// ─── XSS Prevention ────────────────────────────────────────
const containsXSS = (str) => {
  if (!str || typeof str !== 'string') return false;
  
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
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// ─── Sanitize order data ──────────────────────────────────
const sanitizeOrderData = (data) => {
  const sanitized = sanitizeObject(data);
  
  if (sanitized.customerName) {
    sanitized.customerName = sanitizeInput(sanitized.customerName);
  }
  if (sanitized.customerPhone) {
    sanitized.customerPhone = sanitizeInput(sanitized.customerPhone);
  }
  if (sanitized.customerEmail) {
    sanitized.customerEmail = sanitizeInput(sanitized.customerEmail);
  }
  if (sanitized.notes) {
    sanitized.notes = sanitizeInput(sanitized.notes);
  }
  if (sanitized.deliveryAddress) {
    sanitized.deliveryAddress = sanitizeInput(sanitized.deliveryAddress);
  }
  
  return sanitized;
};

// ─── Helper: Generate Order Number ──────────────────────────────────────────
// controllers/staff-portal/ordersStaffController.js - Add at the end

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Generate bill for order (manual trigger)
// @route   POST /api/staff/orders/:orderId/generate-bill
// @access  Staff (Waiters, Cashiers, Managers)
// ──────────────────────────────────────────────────────────────────────────

const generateBillForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    console.log(`📊 [STAFF] Generating bill for order: ${orderId}`);
    
    if (!checkRateLimit(staffId, 'generateBill')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }
    
    // Check if order is completed
    if (order.orderStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: `Order must be completed to generate bill. Current status: ${order.orderStatus}`,
      });
    }
    
    // Check if bill already exists
    const existingBill = await Bill.findOne({ orderId: order._id });
    if (existingBill) {
      return res.status(200).json({
        success: true,
        data: {
          bill: existingBill,
          alreadyExists: true,
        },
        message: `Bill ${existingBill.billNumber} already exists for this order`,
      });
    }
    
    // Generate bill
    const bill = await generateBillFromOrder(order, staff);
    
    await logSecurityEvent('BILL_GENERATED', staffId, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      billNumber: bill.billNumber,
      staffName: staff.name,
    });
    
    res.status(201).json({
      success: true,
      data: {
        bill,
        alreadyExists: false,
      },
      message: `Bill ${bill.billNumber} generated successfully for order ${order.orderNumber}`,
    });
  } catch (error) {
    console.error('❌ Error generating bill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate bill: ' + error.message,
    });
  }
};

// ─── Helper: Generate KOT number ──────────────────────────────────────────
const generateKotNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const last = await KOT.findOne({ 
    kotNumber: { $regex: `^KOT-${dateStr}` } 
  }).sort({ createdAt: -1 });
  const seq = last ? parseInt(last.kotNumber.split('-').pop()) + 1 : 1;
  return `KOT-${dateStr}-${seq.toString().padStart(4, '0')}`;
};

// ============================================================
//  ─── CONTROLLER FUNCTIONS ─────────────────────────────────
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get ready orders for staff (waiters)
// @route   GET /api/staff/orders/ready
// @access  Staff (Waiters)
// ──────────────────────────────────────────────────────────────────────────

const getStaffReadyOrders = async (req, res) => {
  try {
    const staff = req.staff;
    console.log('🔍 [STAFF] Getting ready orders for:', staff?.name || 'Unknown');

    if (!staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff authentication required'
      });
    }

    const staffId = staff._id.toString();

    if (!checkRateLimit(staffId, 'getReadyOrders')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    const filter = { orderStatus: 'ready' };

    if (staff.branchId) {
      filter.$or = [
        { branchId: staff.branchId },
        { branchId: null },
        { branchId: { $exists: false } }
      ];
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    console.log(`✅ Found ${orders.length} ready orders`);

    const sanitizedOrders = orders.map(order => ({
      ...order,
      customerName: sanitizeInput(order.customerName || 'Guest'),
      customerPhone: order.customerPhone || '',
      customerAddress: sanitizeInput(order.customerAddress || ''),
      notes: sanitizeInput(order.notes || ''),
      items: order.items?.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName || ''),
        notes: item.notes ? sanitizeInput(item.notes) : '',
      })) || [],
    }));

    return res.json({
      success: true,
      data: {
        orders: sanitizedOrders,
        count: sanitizedOrders.length
      }
    });
  } catch (error) {
    console.error('[GET /staff/orders/ready] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ready orders'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Serve order (mark as completed)
// @route   PATCH /api/staff/orders/:orderId/serve
// @access  Staff (Waiters)
// ──────────────────────────────────────────────────────────────────────────

const serveStaffOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;

    console.log(`🍽️ [STAFF] Serving order: ${orderId} by ${staff?.name || 'Unknown'}`);

    if (!staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff authentication required'
      });
    }

    const staffId = staff._id.toString();

    if (!checkRateLimit(staffId, 'serveOrder')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.orderStatus === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'This order has already been served/completed.',
        orderStatus: order.orderStatus,
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'This order has been cancelled and cannot be served.',
        orderStatus: order.orderStatus,
      });
    }

    if (order.orderStatus !== 'ready') {
      return res.status(400).json({
        success: false,
        error: `Order must be 'ready' before serving. Current status: ${order.orderStatus}`,
      });
    }

    const userRole = getUserRole(staff);
    const isWaiter = isWaiterRole(userRole);
    const isManager = isManagerRole(userRole);

    if (!isWaiter && !isManager) {
      return res.status(403).json({
        success: false,
        error: 'Only waiters or managers can serve orders.',
      });
    }

    order.orderStatus = 'completed';
    order.servedBy = staff._id;
    order.servedByName = staff.name || 'Staff';
    order.servedAt = new Date();
    order.completedBy = 'waiter';
    order.completedAt = new Date();

    await order.save();

    if (order.tableId && order.orderType === 'dine-in') {
      try {
        await Table.findByIdAndUpdate(order.tableId, {
          status: 'available',
          currentOrderId: null,
        });
        console.log(`✅ Table ${order.tableNumber} freed`);
      } catch (tableError) {
        console.warn('Could not free table:', tableError.message);
      }
    }

    try {
      await KOT.updateMany(
        { orderId: order._id, status: { $nin: ['served', 'cancelled'] } },
        { $set: { status: 'served', servedAt: new Date() } }
      );
    } catch (kotError) {
      console.warn('Could not update KOT:', kotError.message);
    }

    await logSecurityEvent('ORDER_SERVED', staffId, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      staffName: staff.name,
    });

    console.log(`✅ Order ${order.orderNumber} served by ${order.servedByName}`);

    return res.json({
      success: true,
      data: order,
      message: `✅ Order ${order.orderNumber} served by ${order.servedByName}!`
    });
  } catch (error) {
    console.error('[PATCH /staff/orders/:id/serve] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to serve order'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Request ready (kitchen)
// @route   POST /api/staff/orders/:orderId/request-ready
// @access  Staff (Kitchen)
// ──────────────────────────────────────────────────────────────────────────

const requestReady = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const staff = req.staff;
    const staffId = staff._id.toString();

    if (!checkRateLimit(staffId, 'requestReady')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.orderStatus !== 'preparing') {
      return res.status(400).json({
        success: false,
        error: `Only orders in "preparing" status can request ready. Current status: ${order.orderStatus}`,
      });
    }

    order.readyRequested = true;
    order.readyRequestedAt = new Date();
    order.readyNotes = notes ? sanitizeInput(notes) : '';
    await order.save();

    res.status(200).json({
      success: true,
      data: order,
      message: '✅ Ready request sent. Waiting for approval.',
    });
  } catch (error) {
    console.error('[POST /staff/orders/:id/request-ready] ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to request ready',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get orders for staff
// @route   GET /api/staff/orders
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

const getStaffOrders = async (req, res) => {
  try {
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    if (!checkRateLimit(staffId, 'getOrders')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    const { limit = 100, status, orderType, search, showAll } = req.query;
    
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a positive number',
      });
    }
    if (parsedLimit > MAX_ORDERS_PER_REQUEST) {
      return res.status(400).json({
        success: false,
        error: `Limit cannot exceed ${MAX_ORDERS_PER_REQUEST}`,
      });
    }
    
    if (search) {
      if (containsSQLInjection(search) || containsXSS(search)) {
        await logSecurityEvent('INJECTION_ATTEMPT', staffId, {
          endpoint: '/orders',
          field: 'search',
          value: search,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid search input',
        });
      }
    }
    
    const filter = {};
    
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      const validStatuses = statuses.filter(s => ALLOWED_ORDER_STATUSES.includes(s));
      if (validStatuses.length > 0) {
        filter.orderStatus = validStatuses.length === 1 ? validStatuses[0] : { $in: validStatuses };
      }
    }
    
    if (orderType) {
      if (!validateOrderType(orderType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid order type. Allowed: ${ALLOWED_ORDER_TYPES_SA.join(', ')}`,
        });
      }
      filter.orderType = orderType;
    }
    
    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        { orderNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { customerName: { $regex: sanitizedSearch, $options: 'i' } },
        { customerPhone: { $regex: sanitizedSearch, $options: 'i' } },
        { 'items.productName': { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
    
    const userRole = getUserRole(staff);
    const isKitchen = isKitchenRole(userRole);
    const isWaiter = isWaiterRole(userRole);
    const isManager = isManagerRole(userRole);
    
    if (isWaiter && !isManager) {
      filter.servedBy = staff._id;
    }
    
    if (isKitchen && !isManager && showAll !== 'true') {
      filter.orderStatus = { $in: ['pending', 'confirmed', 'preparing', 'ready'] };
    }
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .lean();
    
    await logSecurityEvent('ORDERS_FETCHED', staffId, {
      count: orders.length,
      status: status || 'all',
      showAll: showAll || 'false',
    });
    
    res.status(200).json({
      success: true,
      data: {
        orders,
        count: orders.length,
        total: await Order.countDocuments(filter),
        limit: parsedLimit,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching staff orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders: ' + error.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get order details by ID
// @route   GET /api/staff/orders/:orderId
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    if (!checkRateLimit(staffId, 'getOrderDetails')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }
    
    const order = await Order.findById(orderId)
      .populate('tableId', 'tableNumber floorId status')
      .lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }
    
    await logSecurityEvent('ORDER_DETAILS_FETCHED', staffId, {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
    
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order details: ' + error.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Create order from staff POS
// @route   POST /api/staff/orders
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

// controllers/staff-portal/ordersStaffController.js - FIXED createStaffOrder

const createStaffOrder = async (req, res) => {
  try {
    const staff = req.staff;
    const staffId = staff._id.toString();
    const { 
      orderType, 
      items, 
      subtotal, 
      tax, 
      discount, 
      discountType, 
      total, 
      notes, 
      tableId, 
      tableNumber,
      customerName,
      customerPhone,
      createdBy
    } = req.body;

    console.log('📝 Creating staff order:', { orderType, itemsCount: items?.length, total });

    if (!checkRateLimit(staffId, 'createOrder')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (!orderType || !validateOrderType(orderType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order type. Allowed: ${ALLOWED_ORDER_TYPES_SA.join(', ')}`,
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one item is required',
      });
    }

    if (items.length > MAX_ITEMS_PER_ORDER_SA) {
      return res.status(400).json({
        success: false,
        error: `Cannot have more than ${MAX_ITEMS_PER_ORDER_SA} items per order`,
      });
    }

    // ─── VALIDATE AND FETCH DISH DETAILS ──────────────────────────────────
    const validatedItems = [];
    let totalSubtotal = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.productId) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Product ID is required`,
        });
      }

      if (!isValidObjectId(item.productId)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Invalid product ID format`,
        });
      }

      // ✅ FETCH DISH FROM DATABASE
      let dish = null;
      try {
        dish = await Dish.findById(item.productId).populate('categoryId');
      } catch (err) {
        console.error(`Error fetching dish ${item.productId}:`, err);
      }

      if (!dish) {
        return res.status(404).json({
          success: false,
          error: `Item ${i + 1}: Dish not found in database`,
        });
      }

      // ✅ Check if dish is available
      if (dish.isAvailable === false) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: "${dish.name}" is currently not available`,
        });
      }

      // ✅ Determine price (handle variants)
      let unitPrice = item.unitPrice || dish.price || 0;
      let variantName = item.variantName || 'Regular';
      
      // If variant is specified, find it in the dish
      if (item.variantName && dish.variants && dish.variants.length > 0) {
        const variant = dish.variants.find(v => v.name === item.variantName);
        if (variant) {
          unitPrice = variant.price || dish.price || 0;
        }
      }

      // ✅ Use quantity from request or default to 1
      const quantity = Math.max(1, item.quantity || 1);
      const totalPrice = unitPrice * quantity;
      totalSubtotal += totalPrice;

      // ✅ Build validated item with dish data
      validatedItems.push({
        productId: dish._id,
        productName: dish.name,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        notes: item.notes ? sanitizeInput(item.notes) : '',
        prepTimeMinutes: dish.preparationTime || item.prepTimeMinutes || 15,
        variantName: variantName,
        variantPrice: unitPrice,
        roundNumber: 1,
        orderedAt: new Date(),
        // ✅ Include full dish data for reference
        dishData: {
          category: dish.categoryId?.name || 'Uncategorized',
          description: dish.description || '',
          isVeg: dish.dietaryType === 'Veg',
          images: dish.images || [],
          preparationTime: dish.preparationTime || 15,
        },
        restaurantId: staff.restaurantId || null,
        restaurantName: staff.restaurantName || '',
        branchId: staff.branchId || null,
        branchName: staff.branchName || '',
      });

      console.log(`✅ Validated item: ${dish.name} x${quantity} = ₹${totalPrice}`);
    }

    // ─── ORDER TYPE VALIDATION ──────────────────────────────────────────
    if (orderType === 'dine-in' && !tableId) {
      return res.status(400).json({
        success: false,
        error: 'Table selection is required for dine-in orders',
      });
    }

    // ─── GENERATE ORDER NUMBER ──────────────────────────────────────────
    const orderNumber = await generateOrderNumber();

    // ─── GET RESTAURANT AND BRANCH INFO ──────────────────────────────────
    const restaurantId = staff.restaurantId || null;
    const branchId = staff.branchId || null;
    const restaurantName = staff.restaurantName || '';
    const branchName = staff.branchName || '';

    console.log('🏪 Restaurant:', restaurantId, 'Branch:', branchId);

    // ─── CALCULATE TOTALS ──────────────────────────────────────────────────
    const taxRate = 5; // Default tax rate
    const discountAmount = discount || 0;
    const discountTypeFinal = discountType || 'fixed';
    
    let finalSubtotal = subtotal || totalSubtotal;
    if (finalSubtotal === 0 && validatedItems.length > 0) {
      finalSubtotal = validatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    }
    
    const taxAmount = (finalSubtotal * taxRate) / 100;
    let discountValue = discountAmount;
    if (discountTypeFinal === 'percentage') {
      discountValue = (finalSubtotal * discountAmount) / 100;
    }
    const finalTotal = finalSubtotal + taxAmount - discountValue;

    // ─── CREATE ORDER DATA ──────────────────────────────────────────────
    const orderData = {
      orderNumber,
      orderType,
      tableId: tableId || null,
      tableNumber: tableNumber || '',
      customerName: customerName ? sanitizeInput(customerName.trim()) : 'Guest',
      customerPhone: customerPhone || '',
      items: validatedItems,
      subtotal: finalSubtotal,
      tax: taxAmount,
      taxRate: taxRate,
      discount: discountValue,
      discountType: discountTypeFinal,
      total: finalTotal,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      notes: notes ? sanitizeInput(notes.trim()) : '',
      createdBy: createdBy || staffId,
      createdByName: staff.name || 'Staff',
      staffId: staffId,
      userRole: staff.role?.name || staff.roleName || staff.primaryRole || 'staff',
      restaurantId: restaurantId,
      restaurantName: restaurantName,
      branchId: branchId,
      branchName: branchName,
      kitchenAcknowledged: false,
      kotPrinted: false,
      currentRound: 1,
      isVip: false,
      servedBy: staffId,
      servedByName: staff.name,
    };

    console.log('📦 Order data prepared:', orderData.orderNumber);
    console.log('📦 Items:', validatedItems.map(i => `${i.productName} x${i.quantity} = ₹${i.totalPrice}`).join(', '));

    // ─── CREATE ORDER ──────────────────────────────────────────────────
    const order = await Order.create(orderData);
    console.log(`✅ Order ${order.orderNumber} created by staff ${staff.name}`);

    // ─── AUTO-CREATE KOT ──────────────────────────────────────────────
    try {
      const kotNumber = await generateKotNumber();
      
      const kotData = {
        kotNumber,
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        tableId: order.tableId,
        tableNumber: order.tableNumber,
        kotStation: 'Main Kitchen',
        items: order.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          notes: item.notes || '',
          prepTimeMinutes: item.prepTimeMinutes || 15,
          status: 'pending',
          variantName: item.variantName || 'Regular',
        })),
        priority: 'normal',
        priorityScore: 0,
        isVip: false,
        allergyAlerts: [],
        notes: order.notes || '',
        targetReadyAt: new Date(Date.now() + 15 * 60000),
        createdBy: staffId,
        status: 'new',
        createdAt: new Date(),
        restaurantId: restaurantId,
        branchId: branchId,
      };
      
      const kot = await KOT.create(kotData);
      console.log(`✅ KOT ${kot.kotNumber} created for order ${order.orderNumber}`);
    } catch (kotError) {
      console.error('❌ KOT creation failed:', kotError);
    }

    // ─── UPDATE TABLE STATUS ──────────────────────────────────────────
    if (orderType === 'dine-in' && tableId) {
      try {
        await Table.findByIdAndUpdate(tableId, {
          status: 'occupied',
          currentOrderId: order._id,
        });
        console.log(`✅ Table ${tableNumber} marked as occupied`);
      } catch (tableError) {
        console.warn('Could not update table status:', tableError.message);
      }
    }

    // ─── LOG SECURITY EVENT ────────────────────────────────────────────
    await logSecurityEvent('ORDER_CREATED_BY_STAFF', staffId, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      itemCount: order.items.length,
      total: order.total,
      tableNumber: order.tableNumber,
      staffName: staff.name,
    });

    // ─── RESPONSE ──────────────────────────────────────────────────────
    res.status(201).json({
      success: true,
      data: order,
      message: `Order ${order.orderNumber} created successfully! KOT has been generated.`,
      staff: {
        id: staffId,
        name: staff.name,
        role: staff.role?.name || staff.roleName || 'staff'
      }
    });

  } catch (error) {
    console.error('❌ Error creating staff order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order: ' + error.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Update order status
// @route   PATCH /api/staff/orders/:orderId/status
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

// controllers/staff-portal/ordersStaffController.js - COMPLETE FIXED updateOrderStatus

// controllers/staff-portal/ordersStaffController.js - REPLACE updateOrderStatus

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, action, itemId } = req.body;
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    console.log(`📝 [STAFF] updateOrderStatus:`, { orderId, status, action, itemId });
    
    // ─── Rate Limiting ──────────────────────────────────────────────────
    if (!checkRateLimit(staffId, 'updateOrderStatus')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    // ─── Validate Order ID ─────────────────────────────────────────────
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }
    
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }
    
    const userRole = getUserRole(staff);
    const isKitchen = isKitchenRole(userRole);
    const isWaiter = isWaiterRole(userRole);
    const isManager = isManagerRole(userRole);
    
    // ─── Handle Item Actions (for kitchen staff) ──────────────────────
    if ((isKitchen || isManager) && action) {
      console.log(`🔧 [STAFF] Handling action: ${action} for item: ${itemId}`);
      
      // Start a single item
      if (action === 'start_item' && itemId) {
        const item = existingOrder.items.id(itemId);
        if (!item) {
          return res.status(404).json({
            success: false,
            error: 'Item not found in order',
          });
        }
        
        item.status = 'cooking';
        item.cookingStartedAt = new Date();
        await existingOrder.save();
        
        // ✅ Also update KOT item status
        try {
          await KOT.updateOne(
            { orderId: existingOrder._id, 'items._id': itemId },
            { 
              $set: { 
                'items.$.status': 'cooking',
                'items.$.cookingStartedAt': new Date()
              } 
            }
          );
          console.log(`✅ KOT item ${itemId} status updated to cooking`);
        } catch (kotError) {
          console.warn('Could not update KOT item:', kotError.message);
        }
        
        return res.status(200).json({
          success: true,
          data: existingOrder,
          message: `✅ Item "${item.productName}" started cooking`,
        });
      }
      
      // Complete a single item
      if (action === 'complete_item' && itemId) {
        const item = existingOrder.items.id(itemId);
        if (!item) {
          return res.status(404).json({
            success: false,
            error: 'Item not found in order',
          });
        }
        
        item.status = 'done';
        item.doneAt = new Date();
        await existingOrder.save();
        
        // ✅ Also update KOT item status
        try {
          await KOT.updateOne(
            { orderId: existingOrder._id, 'items._id': itemId },
            { 
              $set: { 
                'items.$.status': 'done',
                'items.$.doneAt': new Date()
              } 
            }
          );
          console.log(`✅ KOT item ${itemId} status updated to done`);
        } catch (kotError) {
          console.warn('Could not update KOT item:', kotError.message);
        }
        
        // Check if all items are done
        const allDone = existingOrder.items.every(i => i.status === 'done');
        if (allDone) {
          await KOT.findOneAndUpdate(
            { orderId: existingOrder._id },
            { status: 'ready' }
          );
          console.log(`✅ KOT for order ${existingOrder.orderNumber} marked as ready`);
        }
        
        return res.status(200).json({
          success: true,
          data: existingOrder,
          message: `✅ Item "${item.productName}" completed!`,
        });
      }
      
      // Complete all items
      if (action === 'complete_all') {
        existingOrder.items.forEach(item => {
          item.status = 'done';
          item.doneAt = new Date();
        });
        
        existingOrder.orderStatus = 'ready';
        await existingOrder.save();
        
        await KOT.findOneAndUpdate(
          { orderId: existingOrder._id },
          { status: 'ready' }
        );
        
        return res.status(200).json({
          success: true,
          data: existingOrder,
          message: '✅ All items completed! Order is ready.',
        });
      }
      
      // Unknown action
      return res.status(400).json({
        success: false,
        error: `Unknown action: ${action}. Allowed: start_item, complete_item, complete_all`,
      });
    }
    
    // ─── Regular Status Update ─────────────────────────────────────────
    // Validate Status
    if (!status || !validateOrderStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${ALLOWED_ORDER_STATUSES.join(', ')}`,
      });
    }
    
    // Sanitize notes
    let sanitizedNotes = '';
    if (notes) {
      if (containsSQLInjection(notes) || containsXSS(notes)) {
        await logSecurityEvent('INJECTION_ATTEMPT', staffId, {
          endpoint: `/orders/${orderId}/status`,
          field: 'notes',
          value: notes,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
        });
      }
      sanitizedNotes = sanitizeInput(notes);
    }
    
    // ─── Role-based permission checks ──────────────────────────────────
    if (isWaiter && !isManager) {
      const servedById = existingOrder.servedBy?.toString() || '';
      if (servedById !== staffId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. This order belongs to another waiter.',
        });
      }
      if (!['ready', 'completed', 'cancelled'].includes(status)) {
        return res.status(403).json({
          success: false,
          error: 'Waiters can only mark orders as ready, completed, or cancelled',
        });
      }
    }
    
    if (isKitchen && !isManager) {
      if (status === 'completed') {
        return res.status(403).json({
          success: false,
          error: 'Kitchen staff cannot complete orders.',
        });
      }
      if (!['pending', 'confirmed', 'preparing', 'ready'].includes(status)) {
        return res.status(403).json({
          success: false,
          error: 'Kitchen staff can only update orders to preparing or ready status',
        });
      }
    }
    
    // ─── Prevent invalid status transitions ────────────────────────────
    const currentStatus = existingOrder.orderStatus;
    const allowedTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    
    if (allowedTransitions[currentStatus] && 
        !allowedTransitions[currentStatus].includes(status) && 
        currentStatus !== status) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from ${currentStatus} to ${status}`,
      });
    }
    
    // ─── Update order ──────────────────────────────────────────────────
    const updateData = {
      orderStatus: status,
      updatedAt: new Date(),
      ...(sanitizedNotes ? { notes: sanitizedNotes } : {}),
      ...(status === 'ready' ? { readyAt: new Date() } : {}),
      ...(status === 'completed' ? { 
        completedAt: new Date(),
        completedBy: staff._id,
        completedByName: staff.name,
      } : {}),
      ...(status === 'preparing' ? { prepStartedAt: new Date() } : {}),
      ...(status === 'confirmed' ? { confirmedAt: new Date() } : {}),
    };
    
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
    
    // ─── ✅ GENERATE BILL WHEN ORDER IS COMPLETED ──────────────────────
    let generatedBill = null;
    if (status === 'completed') {
      try {
        generatedBill = await generateBillFromOrder(updatedOrder, staff);
        console.log(`✅ Bill ${generatedBill?.billNumber} generated for completed order ${updatedOrder.orderNumber}`);
      } catch (billError) {
        console.error('❌ Failed to generate bill for completed order:', billError);
        // Don't fail the order update if bill generation fails
      }
    }
    
    await logSecurityEvent('ORDER_STATUS_UPDATED', staffId, {
      orderId,
      oldStatus: currentStatus,
      newStatus: status,
      staffName: staff.name,
      billGenerated: !!generatedBill,
      billNumber: generatedBill?.billNumber || null,
    });
    
    res.status(200).json({
      success: true,
      data: {
        order: updatedOrder,
        bill: generatedBill || null,
      },
      message: `Order ${updatedOrder.orderNumber} status updated to ${status}${generatedBill ? ` and bill ${generatedBill.billNumber} generated` : ''}`,
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status: ' + error.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Request bill for order
// @route   PATCH /api/staff/orders/:orderId/request-bill
// @access  Staff (Waiters, Cashiers, Managers)
// ──────────────────────────────────────────────────────────────────────────

const requestBill = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    if (!checkRateLimit(staffId, 'requestBill')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }
    
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Order is already paid',
      });
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { 
        $set: { 
          paymentStatus: 'pending',
          billRequested: true,
          billRequestedAt: new Date(),
          billRequestedBy: staff._id,
          billRequestedByName: staff.name,
        }
      },
      { new: true }
    ).lean();
    
    await logSecurityEvent('BILL_REQUESTED', staffId, {
      orderId,
      orderNumber: order.orderNumber,
      staffName: staff.name,
    });
    
    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: 'Bill requested successfully.',
    });
  } catch (error) {
    console.error('❌ Error requesting bill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request bill',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get staff menu
// @route   GET /api/staff/menu
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

// controllers/staff-portal/ordersStaffController.js - FIXED getStaffMenu

const getStaffMenu = async (req, res) => {
  try {
    const staff = req.staff;
    const staffId = staff._id.toString();
    const { category, search, limit = 100 } = req.query;
    
    if (!checkRateLimit(staffId, 'getMenu')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    if (search) {
      if (containsSQLInjection(search) || containsXSS(search)) {
        await logSecurityEvent('INJECTION_ATTEMPT', staffId, {
          endpoint: '/menu',
          field: 'search',
          value: search,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid search input',
        });
      }
    }
    
    const filter = { isActive: true };
    
    // Filter by restaurant and branch
    if (staff.restaurantId) {
      filter.$or = [
        { restaurantId: staff.restaurantId },
        { restaurantId: { $exists: false } },
        { restaurantId: null }
      ];
    }
    
    if (staff.branchId) {
      filter.$or = [
        ...(filter.$or || []),
        { branchId: staff.branchId },
        { branchId: { $exists: false } },
        { branchId: null }
      ];
    }
    
    if (category && category !== 'all' && category !== '') {
      if (!isValidObjectId(category)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category ID format',
        });
      }
      filter.categoryId = category;
    }
    
    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        ...(filter.$or || []),
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
    
    const parsedLimit = Math.min(parseInt(limit) || 100, 500);
    
    // ✅ Fetch dishes with full details INCLUDING VARIANTS
    const dishes = await Dish.find(filter)
      .populate('categoryId', 'name')
      .limit(parsedLimit)
      .sort({ name: 1 })
      .lean();
    
    console.log(`📋 Found ${dishes.length} dishes for staff ${staff.name}`);
    
    // ✅ Get categories
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean();
    
    // ✅ Group by category with full dish details INCLUDING VARIANTS
    const grouped = {};
    dishes.forEach(dish => {
      const catName = dish.categoryId?.name || 'Uncategorized';
      if (!grouped[catName]) {
        grouped[catName] = {
          categoryId: dish.categoryId?._id || null,
          name: catName,
          dishes: [],
        };
      }
      
      // ✅ Include ALL dish details including variants
      grouped[catName].dishes.push({
        _id: dish._id,
        name: dish.name,
        description: dish.description || '',
        price: dish.price || 0,
        sellingPrice: dish.price || 0,
        images: dish.images || [],
        image: dish.image || (dish.images && dish.images.length > 0 ? dish.images[0] : ''),
        categoryId: dish.categoryId?._id || null,
        categoryName: catName,
        isAvailable: dish.isAvailable !== false,
        preparationTime: dish.preparationTime || 15,
        prepTimeMinutes: dish.preparationTime || 15,
        isActive: dish.isActive !== false,
        dietaryType: dish.dietaryType || 'Veg',
        isVeg: dish.dietaryType === 'Veg',
        // ✅ CRITICAL: Include variants with full details
        hasVariants: dish.hasVariants || (dish.variants && dish.variants.length > 0) || false,
        variants: dish.variants?.map(v => ({
          name: v.name || 'Regular',
          price: v.price || 0,
          size: v.size || '',
          description: v.description || '',
          isRecommended: v.isRecommended || false,
          isPopular: v.isPopular || false,
          preparationTime: v.preparationTime || dish.preparationTime || 15,
          spiceLevel: v.spiceLevel || '',
          calories: v.calories || 0,
          image: v.image || dish.image || '',
        })) || [],
        stockType: dish.stockType || 'recipe',
        currentStock: dish.currentStock || 0,
        kotStation: dish.kotStation || 'Main Kitchen',
        glassType: dish.glassType || '',
        baseIngredient: dish.baseIngredient || '',
        restaurantId: dish.restaurantId,
        restaurantName: dish.restaurantName,
        branchId: dish.branchId,
        branchName: dish.branchName,
        createdAt: dish.createdAt,
        updatedAt: dish.updatedAt,
      });
    });
    
    const menuData = Object.values(grouped);
    
    console.log(`📤 Sending ${menuData.length} categories with ${dishes.length} total dishes`);
    
    res.status(200).json({
      success: true,
      data: {
        menu: menuData,
        categories: categories.map(c => ({
          _id: c._id,
          name: c.name,
        })),
        total: dishes.length,
        staff: {
          name: staff.name,
          restaurantId: staff.restaurantId,
          branchId: staff.branchId,
        }
      },
    });
  } catch (error) {
    console.error('❌ Error fetching staff menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu: ' + error.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Cancel order
// @route   PATCH /api/staff/orders/:orderId/cancel
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    if (!checkRateLimit(staffId, 'cancelOrder')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }
    
    let sanitizedReason = '';
    if (reason) {
      if (containsSQLInjection(reason) || containsXSS(reason)) {
        await logSecurityEvent('INJECTION_ATTEMPT', staffId, {
          endpoint: `/orders/${orderId}/cancel`,
          field: 'reason',
          value: reason,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
        });
      }
      sanitizedReason = sanitizeInput(reason);
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }
    
    if (order.orderStatus === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel a completed order',
      });
    }
    
    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Order is already cancelled',
      });
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          orderStatus: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: staff._id,
          cancelledByName: staff.name,
          cancellationReason: sanitizedReason || 'Cancelled by staff',
        }
      },
      { new: true }
    ).lean();
    
    if (updatedOrder.tableId) {
      try {
        await Table.findByIdAndUpdate(
          updatedOrder.tableId,
          { 
            status: 'available',
            currentOrderId: null,
          }
        );
      } catch (tableError) {
        console.warn('Could not free table:', tableError.message);
      }
    }
    
    await logSecurityEvent('ORDER_CANCELLED', staffId, {
      orderId,
      orderNumber: order.orderNumber,
      reason: sanitizedReason || 'No reason provided',
      staffName: staff.name,
    });
    
    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: `Order ${order.orderNumber} cancelled successfully`,
    });
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
    });
  }
};


// controllers/staff-portal/ordersStaffController.js - Add this function

// ─── Helper: Generate Order Number ──────────────────────────────────────────
const generateOrderNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const lastOrder = await Order.findOne({ 
    orderNumber: { $regex: `^${dateStr}` } 
  }).sort({ createdAt: -1 });
  
  let seq = 1;
  if (lastOrder && lastOrder.orderNumber) {
    const lastSeq = parseInt(lastOrder.orderNumber.slice(-4));
    seq = lastSeq + 1;
  }
  return `${dateStr}-${seq.toString().padStart(4, '0')}`;
};
// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Kitchen acknowledge order
// @route   PATCH /api/staff/orders/:orderId/kitchen-acknowledge
// @access  Staff (Kitchen staff only)
// ──────────────────────────────────────────────────────────────────────────

const kitchenAcknowledgeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;
    const staffId = staff._id.toString();

    if (!checkRateLimit(staffId, 'kitchenAcknowledge')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const userRole = getUserRole(staff);
    const isKitchen = isKitchenRole(userRole);
    const isManager = isManagerRole(userRole);

    if (!isKitchen && !isManager) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', staffId, {
        endpoint: `/orders/${orderId}/kitchen-acknowledge`,
        reason: 'Not kitchen staff',
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only kitchen staff can acknowledge orders.',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
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

    await logSecurityEvent('ORDER_ACKNOWLEDGED', staffId, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      staffName: staff.name,
    });

    res.status(200).json({
      success: true,
      data: order,
      message: `Order ${order.orderNumber} acknowledged by kitchen.`,
    });
  } catch (error) {
    console.error('❌ Error acknowledging order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge order',
    });
  }
};


// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Clean up rate limiter
// ──────────────────────────────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimiter.entries()) {
    if (now > data.resetAt) {
      rateLimiter.delete(key);
    }
  }
}, 60000);

// ─── ✅ SINGLE EXPORT SECTION ──────────────────────────────────────────
export {
  // Order CRUD
  getStaffOrders,
  getOrderDetails,
  createStaffOrder,
  updateOrderStatus,
  cancelOrder,
  
  // Bill & menu
  requestBill,
  getStaffMenu,
  generateBillForOrder,
  
  // Kitchen operations
  kitchenAcknowledgeOrder,
  requestReady,           // ✅ POST /staff/orders/:id/request-ready
  
  // Waiter operations
  getStaffReadyOrders,    // ✅ GET /staff/orders/ready
  serveStaffOrder,        // ✅ PATCH /staff/orders/:id/serve
};