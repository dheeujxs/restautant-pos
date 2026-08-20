// controllers/staff-portal/kotStaffController.js - COMPLETE WITH SECURITY

import KOT from '../../models/KOT.js';
import Order from '../../models/Order.js';
import { 
  isValidObjectId, 
  isValidText,
  isValidQuantity,
  isValidPrice,
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

// ============================================================
//  ─── SECURITY CONSTANTS ─────────────────────────────────────
// ============================================================

const ALLOWED_KOT_STATUSES = ['pending', 'new', 'acknowledged', 'preparing', 'partially_ready', 'ready', 'served', 'cancelled'];
const KITCHEN_ROLES = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'];
const WAITER_ROLES = ['waiter', 'cashier'];
const MANAGER_ROLES = ['manager', 'admin', 'superadmin'];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_QUEUE_LIMIT = 100;
const MAX_NOTES_LENGTH = 500;

// ─── In-memory rate limiter ────────────────────────────────
const rateLimiter = new Map();

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

// ─── Input Validation ──────────────────────────────────────
const isValidKOTStatus = (status) => {
  if (!status) return false;
  return ALLOWED_KOT_STATUSES.includes(status);
};

const isValidPriority = (priority) => {
  if (!priority) return true;
  return ['normal', 'urgent', 'high', 'low'].includes(priority);
};

// ─── Role Check Helpers ────────────────────────────────────
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

// ─── Get user role safely ──────────────────────────────────
const getUserRole = (staff) => {
  if (!staff) return '';
  return staff?.role?.name || staff?.roleName || staff?.primaryRole || '';
};

// ─── Calculate wait time ──────────────────────────────────
const calculateWaitTime = (createdAt) => {
  if (!createdAt) return 0;
  const now = new Date();
  const created = new Date(createdAt);
  return Math.floor((now - created) / 60000); // minutes
};

// ============================================================
//  ─── CONTROLLER FUNCTIONS ─────────────────────────────────
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get KOT stats for staff dashboard
// @route   GET /api/kots/staff/stats
// @access  Staff (Kitchen, Manager, Admin)
// ──────────────────────────────────────────────────────────────────────────

export const getStaffKotStats = async (req, res) => {
  try {
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    // ─── Rate Limiting ──────────────────────────────────────────────────
    if (!checkRateLimit(staffId, 'kotStats')) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', staffId, {
        endpoint: '/staff/stats',
        method: 'GET',
      });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    // ─── Role-based access control ─────────────────────────────────────
    const userRole = getUserRole(staff);
    const isKitchen = isKitchenRole(userRole);
    const isManager = isManagerRole(userRole);
    
    if (!isKitchen && !isManager) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', staffId, {
        endpoint: '/staff/stats',
        reason: 'Not kitchen or manager',
        userRole,
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only kitchen staff and managers can view KOT stats.',
      });
    }
    
    // ─── Build filter based on role ────────────────────────────────────
    const filter = {
      status: { $in: ['pending', 'new', 'acknowledged', 'preparing', 'partially_ready', 'ready'] }
    };
    
    // If kitchen staff, only show their assigned KOTs
    if (isKitchen && !isManager) {
      filter.assignedTo = staff._id;
    }
    
    // ─── Fetch KOTs ────────────────────────────────────────────────────
    const kots = await KOT.find(filter)
      .populate('orderId', 'orderNumber tableNumber isVip')
      .lean();
    
    // ─── Calculate stats ──────────────────────────────────────────────
    const now = new Date();
    const stats = {
      total: kots.length,
      new: kots.filter(k => ['pending', 'new'].includes(k.status)).length,
      preparing: kots.filter(k => ['acknowledged', 'preparing', 'partially_ready'].includes(k.status)).length,
      ready: kots.filter(k => k.status === 'ready').length,
      delayed: 0,
      vipPending: 0,
      averageWaitTime: 0,
    };
    
    let totalWaitTime = 0;
    
    kots.forEach(kot => {
      const waitTime = calculateWaitTime(kot.createdAt);
      totalWaitTime += waitTime;
      
      // Delayed if waiting > 20 minutes and not ready/served/cancelled
      if (waitTime > 20 && !['ready', 'served', 'cancelled'].includes(kot.status)) {
        stats.delayed++;
      }
      
      // VIP pending orders
      if (kot.isVip && ['pending', 'new', 'acknowledged'].includes(kot.status)) {
        stats.vipPending++;
      }
    });
    
    stats.averageWaitTime = kots.length > 0 ? Math.round(totalWaitTime / kots.length) : 0;
    
    // ─── Log event ──────────────────────────────────────────────────────
    await logSecurityEvent('KOT_STATS_FETCHED', staffId, {
      total: stats.total,
      delayed: stats.delayed,
      vipPending: stats.vipPending,
    });
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error fetching KOT stats:', error);
    await logSecurityEvent('ERROR', req.staff?._id, {
      error: error.message,
      endpoint: '/staff/stats',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KOT stats',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get KOT queue for staff
// @route   GET /api/kots/staff/queue
// @access  Staff (Kitchen, Manager, Admin)
// ──────────────────────────────────────────────────────────────────────────

// controllers/staff-portal/kotStaffController.js - FIXED QUEUE FILTER

export const getStaffKotQueue = async (req, res) => {
  try {
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    // ─── Rate Limiting ──────────────────────────────────────────────────
    if (!checkRateLimit(staffId, 'kotQueue')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    // ─── Role-based access control ─────────────────────────────────────
    const userRole = getUserRole(staff);
    const isKitchen = isKitchenRole(userRole);
    const isManager = isManagerRole(userRole);
    
    if (!isKitchen && !isManager) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', staffId, {
        endpoint: '/staff/queue',
        reason: 'Not kitchen or manager',
        userRole,
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only kitchen staff and managers can view KOT queue.',
      });
    }
    
    // ─── Validate and sanitize query params ──────────────────────────
    let { page = 1, limit = 15, status, priority } = req.query;
    
    // Validate page
    const parsedPage = parseInt(page);
    if (isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be a positive number',
      });
    }
    
    // Validate limit
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a positive number',
      });
    }
    if (parsedLimit > MAX_QUEUE_LIMIT) {
      return res.status(400).json({
        success: false,
        error: `Limit cannot exceed ${MAX_QUEUE_LIMIT}`,
      });
    }
    
    // ─── ✅ CRITICAL FIX: Build filter with 'new' status ──────────────────
    const filter = {};
    
    if (status && status !== 'all') {
      const statuses = status.split(',').map(s => s.trim());
      const validStatuses = statuses.filter(s => ALLOWED_KOT_STATUSES.includes(s));
      if (validStatuses.length > 0) {
        filter.status = validStatuses.length === 1 ? validStatuses[0] : { $in: validStatuses };
      }
    } else {
      // ✅ CRITICAL: Include 'new' status in the default filter
      filter.status = { $in: ['new', 'pending', 'acknowledged', 'preparing', 'partially_ready'] };
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    
    // If kitchen staff, only show their assigned KOTs
    if (isKitchen && !isManager) {
      filter.assignedTo = staff._id;
    }
    
    console.log('🔍 KOT Queue Filter:', JSON.stringify(filter, null, 2));
    
    // ─── Fetch KOTs ────────────────────────────────────────────────────
    const skip = (parsedPage - 1) * parsedLimit;
    
    const kots = await KOT.find(filter)
      .populate('orderId', 'orderNumber tableNumber isVip customerName')
      .populate('assignedTo', 'name employeeId')
      .sort({ isVip: -1, priority: -1, createdAt: 1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();
    
    console.log(`📊 Found ${kots.length} KOTs in queue`);
    
    // ─── Format response with sanitization ────────────────────────────
    const queue = kots.map(kot => ({
      _id: kot._id,
      kotId: kot._id,
      kotNumber: kot.kotNumber || `KOT-${kot._id.toString().slice(-6)}`,
      orderNumber: kot.orderId?.orderNumber || kot.orderNumber || 'Unknown',
      tableNumber: kot.orderId?.tableNumber || kot.tableNumber || '',
      customerName: kot.orderId?.customerName ? sanitizeInput(kot.orderId.customerName) : '',
      items: kot.items?.map(item => ({
        productName: sanitizeInput(item.productName || 'Item'),
        quantity: item.quantity || 1,
        price: item.price || 0,
        totalPrice: item.totalPrice || 0,
        notes: item.notes ? sanitizeInput(item.notes) : '',
        prepTimeMinutes: item.prepTimeMinutes || 15,
      })) || [],
      priority: kot.isVip ? 'urgent' : (kot.priority || 'normal'),
      isVip: kot.isVip || false,
      status: kot.status,
      notes: kot.notes ? sanitizeInput(kot.notes) : '',
      createdAt: kot.createdAt,
      waitTimeMinutes: calculateWaitTime(kot.createdAt),
      assignedTo: kot.assignedTo ? {
        name: sanitizeInput(kot.assignedTo.name),
        employeeId: kot.assignedTo.employeeId,
      } : null,
    }));
    
    // ─── Log event ──────────────────────────────────────────────────────
    await logSecurityEvent('KOT_QUEUE_FETCHED', staffId, {
      count: queue.length,
      page: parsedPage,
      status: status || 'all',
      priority: priority || 'all',
    });
    
    res.status(200).json({
      success: true,
      data: {
        queue,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: await KOT.countDocuments(filter),
          hasMore: kots.length === parsedLimit,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching KOT queue:', error);
    await logSecurityEvent('ERROR', req.staff?._id, {
      error: error.message,
      endpoint: '/staff/queue',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KOT queue',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Update KOT status (staff) - FIXED with security
// @route   PUT /api/kots/staff/:kotId/status
// @access  Staff (Kitchen, Manager, Admin)
// ──────────────────────────────────────────────────────────────────────────

export const updateKotStatus = async (req, res) => {
  try {
    const { kotId } = req.params;
    const { status, notes, assignedTo } = req.body;
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    console.log('🔧 updateKotStatus called:', { kotId, status, notes, assignedTo });
    
    // ─── Rate Limiting ──────────────────────────────────────────────────
    if (!checkRateLimit(staffId, 'updateKotStatus')) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', staffId, {
        endpoint: `/staff/${kotId}/status`,
        method: 'PUT',
      });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    // ─── Validate KOT ID ──────────────────────────────────────────────
    if (!kotId) {
      return res.status(400).json({
        success: false,
        error: 'KOT ID is required',
      });
    }
    
    // ✅ FIX: Check if it's a valid ObjectId
    if (!isValidObjectId(kotId)) {
      console.log('❌ Invalid KOT ID format:', kotId);
      await logSecurityEvent('INVALID_INPUT', staffId, {
        endpoint: `/staff/${kotId}/status`,
        field: 'kotId',
        value: kotId,
        reason: 'Invalid ObjectId format',
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid KOT ID format. Please provide a valid 24-character hex string.',
      });
    }
    
    // ─── Validate Status ──────────────────────────────────────────────
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }
    
    if (!isValidKOTStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${ALLOWED_KOT_STATUSES.join(', ')}`,
      });
    }
    
    // ─── Sanitize notes ─────────────────────────────────────────────────
    let sanitizedNotes = '';
    if (notes) {
      // Check for injection attempts
      if (containsSQLInjection(notes) || containsXSS(notes)) {
        await logSecurityEvent('INJECTION_ATTEMPT', staffId, {
          endpoint: `/staff/${kotId}/status`,
          field: 'notes',
          value: notes,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
        });
      }
      if (notes.length > MAX_NOTES_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`,
        });
      }
      sanitizedNotes = sanitizeInput(notes);
    }
    
    // ─── Find KOT ──────────────────────────────────────────────────────
    const kot = await KOT.findById(kotId);
    if (!kot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }
    
    // ─── Role-based access control ─────────────────────────────────────
    const userRole = getUserRole(staff);
    const isKitchen = isKitchenRole(userRole);
    const isWaiter = isWaiterRole(userRole);
    const isManager = isManagerRole(userRole);
    
    // Kitchen cannot mark as served
    if (status === 'served' && isKitchen) {
      await logSecurityEvent('UNAUTHORIZED_ACTION', staffId, {
        endpoint: `/staff/${kotId}/status`,
        action: 'mark_served',
        reason: 'Kitchen staff cannot mark as served',
        userRole,
      });
      return res.status(403).json({
        success: false,
        error: '❌ Kitchen staff cannot mark KOT as served. Only waiters can.',
      });
    }
    
    // Waiters can only mark as served
    if (isWaiter && status !== 'served' && !isManager) {
      return res.status(403).json({
        success: false,
        error: 'Waiters can only mark KOT as served.',
      });
    }
    
    // ─── Prevent invalid status transitions ────────────────────────────
    const currentStatus = kot.status;
    const allowedTransitions = {
      pending: ['new', 'acknowledged', 'cancelled'],
      new: ['acknowledged', 'cancelled'],
      acknowledged: ['preparing', 'cancelled'],
      preparing: ['partially_ready', 'ready', 'cancelled'],
      partially_ready: ['ready', 'cancelled'],
      ready: ['served', 'cancelled'],
      served: [],
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
    
    // ─── Update KOT ────────────────────────────────────────────────────
    const updateData = {
      status,
      updatedAt: new Date(),
      ...(sanitizedNotes ? { notes: sanitizedNotes } : {}),
      ...(status === 'ready' ? { readyAt: new Date() } : {}),
      ...(status === 'served' ? { 
        servedAt: new Date(),
        servedBy: staff._id,
        servedByName: staff.name,
      } : {}),
      ...(status === 'preparing' ? { prepStartedAt: new Date() } : {}),
      ...(status === 'acknowledged' ? { acknowledgedAt: new Date() } : {}),
      ...(status === 'cancelled' ? { 
        cancelledAt: new Date(),
        cancelledBy: staff._id,
        cancelledByName: staff.name,
      } : {}),
      ...(assignedTo && isValidObjectId(assignedTo) ? { assignedTo } : {}),
    };
    
    const updatedKot = await KOT.findByIdAndUpdate(
      kotId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('orderId', 'orderNumber tableNumber isVip');
    
    if (!updatedKot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }
    
    // ─── Sync order status if KOT is ready ────────────────────────────
    if (status === 'ready' && updatedKot.orderId) {
      try {
        const order = await Order.findById(updatedKot.orderId._id);
        if (order && order.orderStatus !== 'ready' && order.orderStatus !== 'completed') {
          order.orderStatus = 'ready';
          order.readyAt = new Date();
          await order.save();
          console.log(`✅ Order ${order.orderNumber} status synced to 'ready'`);
          
          await logSecurityEvent('ORDER_SYNCED', staffId, {
            orderId: order._id,
            orderNumber: order.orderNumber,
            kotId: updatedKot._id,
            kotNumber: updatedKot.kotNumber,
          });
        }
      } catch (syncError) {
        console.error('❌ Error syncing order status:', syncError);
        // Don't fail the request if sync fails
      }
    }
    
    // ─── Log event ──────────────────────────────────────────────────────
    await logSecurityEvent('KOT_STATUS_UPDATED', staffId, {
      kotId: updatedKot._id,
      kotNumber: updatedKot.kotNumber,
      oldStatus: currentStatus,
      newStatus: status,
      userRole,
      staffName: staff.name,
    });
    
    console.log(`✅ KOT ${updatedKot.kotNumber} status updated from ${currentStatus} to ${status}`);
    
    res.status(200).json({
      success: true,
      data: updatedKot,
      message: `KOT ${updatedKot.kotNumber} status updated to ${status}`,
    });
  } catch (error) {
    console.error('❌ Error updating KOT status:', error);
    await logSecurityEvent('ERROR', req.staff?._id, {
      error: error.message,
      endpoint: `/staff/${req.params.kotId}/status`,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update KOT status',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get KOT by ID (with security)
// @route   GET /api/kots/staff/:kotId
// @access  Staff (Kitchen, Manager, Admin)
// ──────────────────────────────────────────────────────────────────────────

export const getKotById = async (req, res) => {
  try {
    const { kotId } = req.params;
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    // ─── Rate Limiting ──────────────────────────────────────────────────
    if (!checkRateLimit(staffId, 'getKotById')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    // ─── Validate KOT ID ──────────────────────────────────────────────
    if (!kotId) {
      return res.status(400).json({
        success: false,
        error: 'KOT ID is required',
      });
    }
    
    if (!isValidObjectId(kotId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid KOT ID format',
      });
    }
    
    // ─── Role-based access control ─────────────────────────────────────
    const userRole = getUserRole(staff);
    const isKitchen = isKitchenRole(userRole);
    const isManager = isManagerRole(userRole);
    
    if (!isKitchen && !isManager) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', staffId, {
        endpoint: `/staff/${kotId}`,
        reason: 'Not kitchen or manager',
        userRole,
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only kitchen staff and managers can view KOT details.',
      });
    }
    
    // ─── Fetch KOT ──────────────────────────────────────────────────────
    const kot = await KOT.findById(kotId)
      .populate('orderId', 'orderNumber tableNumber isVip customerName customerPhone')
      .populate('assignedTo', 'name employeeId')
      .populate('createdBy', 'name employeeId')
      .lean();
    
    if (!kot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }
    
    // ─── Format response with sanitization ────────────────────────────
    const response = {
      ...kot,
      items: kot.items?.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName),
        notes: item.notes ? sanitizeInput(item.notes) : '',
      })) || [],
      notes: kot.notes ? sanitizeInput(kot.notes) : '',
      orderId: kot.orderId ? {
        ...kot.orderId,
        customerName: sanitizeInput(kot.orderId.customerName || ''),
      } : null,
    };
    
    await logSecurityEvent('KOT_FETCHED', staffId, {
      kotId: kot._id,
      kotNumber: kot.kotNumber,
    });
    
    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('❌ Error fetching KOT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KOT details',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Bulk update KOT status (with security)
// @route   PUT /api/kots/staff/bulk/status
// @access  Staff (Manager, Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const bulkUpdateKotStatus = async (req, res) => {
  try {
    const { kotIds, status, notes } = req.body;
    const staff = req.staff;
    const staffId = staff._id.toString();
    
    // ─── Rate Limiting ──────────────────────────────────────────────────
    if (!checkRateLimit(staffId, 'bulkUpdateKotStatus')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }
    
    // ─── Role-based access control ─────────────────────────────────────
    const userRole = getUserRole(staff);
    const isManager = isManagerRole(userRole);
    
    if (!isManager) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', staffId, {
        endpoint: '/bulk/status',
        reason: 'Not manager',
        userRole,
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only managers can perform bulk updates.',
      });
    }
    
    // ─── Validate inputs ──────────────────────────────────────────────
    if (!kotIds || !Array.isArray(kotIds) || kotIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one KOT ID is required',
      });
    }
    
    if (kotIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update more than 50 KOTs at once',
      });
    }
    
    // Validate all KOT IDs
    const invalidIds = kotIds.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid KOT ID(s): ${invalidIds.join(', ')}`,
      });
    }
    
    if (!status || !isValidKOTStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${ALLOWED_KOT_STATUSES.join(', ')}`,
      });
    }
    
    // ─── Sanitize notes ─────────────────────────────────────────────────
    let sanitizedNotes = '';
    if (notes) {
      if (containsSQLInjection(notes) || containsXSS(notes)) {
        await logSecurityEvent('INJECTION_ATTEMPT', staffId, {
          endpoint: '/bulk/status',
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
    
    // ─── Bulk update ──────────────────────────────────────────────────
    const result = await KOT.updateMany(
      { _id: { $in: kotIds } },
      {
        $set: {
          status,
          updatedAt: new Date(),
          ...(sanitizedNotes ? { notes: sanitizedNotes } : {}),
          ...(status === 'ready' ? { readyAt: new Date() } : {}),
          ...(status === 'served' ? { 
            servedAt: new Date(),
            servedBy: staff._id,
            servedByName: staff.name,
          } : {}),
        }
      }
    );
    
    await logSecurityEvent('BULK_KOT_STATUS_UPDATED', staffId, {
      count: result.modifiedCount,
      status,
      kotIds,
    });
    
    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
      message: `Updated ${result.modifiedCount} KOTs to ${status}`,
    });
  } catch (error) {
    console.error('❌ Error bulk updating KOT status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update KOT status',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Clean up rate limiter (maintenance)
// ──────────────────────────────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimiter.entries()) {
    if (now > data.resetAt) {
      rateLimiter.delete(key);
    }
  }
}, 60000); // Clean up every minute