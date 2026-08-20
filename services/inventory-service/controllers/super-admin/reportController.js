// controllers/super-admin/reportController.js - WITH BRANCH FILTER SUPPORT

import Order from '../../models/Order.js';
import Bill from '../../models/Bill.js';
import Restaurant from '../../models/super-admin/Restaurant.js';
import Branch from '../../models/super-admin/Branch.js';
import Staff from '../../models/Staff.js';
import User from '../../models/User.js';
import Dish from '../../models/Dish.js';
import mongoose from 'mongoose';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';
import {
  isValidObjectId,
  isValidEmail,
  isValidPhone,
} from '../../utils/validators.js';

// ============================================================
//  ─── CONSTANTS ──────────────────────────────────────────────
// ============================================================

const MAX_REPORTS_LIMIT = 500;
const MAX_ORDERS_PER_REPORT = 1000;
const MAX_ITEMS_PER_REPORT = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;
const ALLOWED_PERIODS = ['today', 'week', 'month', 'quarter', 'year', 'custom'];
const ALLOWED_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
const ALLOWED_ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'];
const ALLOWED_SORT_FIELDS = ['revenue', 'orders', 'name', 'createdAt'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

// ─── RATE LIMITER ──────────────────────────────────────────────────────────
const rateLimiter = new Map();

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

// ─── SECURITY AUDIT LOGGER ────────────────────────────────────────────────
const logSecurityEvent = async (eventType, userId, details = {}) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'anonymous',
      details: {
        ...details,
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown',
      },
    };
    console.log('🔒 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
    return logEntry;
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
};

// ─── SQL INJECTION DETECTION ─────────────────────────────────────────────
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

// ─── XSS DETECTION ────────────────────────────────────────────────────────
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

// ─── VALIDATE DATE ──────────────────────────────────────────────────────
const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

// ─── HELPER: Get date range with validation ─────────────────────────────
const getDateRange = (period, customStartDate, customEndDate) => {
  if (!ALLOWED_PERIODS.includes(period)) {
    throw new Error(`Invalid period. Allowed: ${ALLOWED_PERIODS.join(', ')}`);
  }

  const now = new Date();
  const start = new Date();
  const end = new Date();

  if (period === 'custom') {
    if (!customStartDate || !customEndDate) {
      throw new Error('Start date and end date are required for custom period');
    }

    if (!isValidDate(customStartDate) || !isValidDate(customEndDate)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);

    if (startDate > endDate) {
      throw new Error('Start date cannot be after end date');
    }

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 365) {
      throw new Error('Date range cannot exceed 365 days');
    }

    start.setTime(startDate.getTime());
    end.setTime(endDate.getTime());
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);
    
    return { start, end };
  }

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3) * 3;
      start.setMonth(quarter, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  if (diffDays > 365) {
    throw new Error('Date range cannot exceed 365 days');
  }

  return { start, end };
};

// ─── HELPER: Validate and sanitize report query ─────────────────────────
const validateReportQuery = (query) => {
  const { period, restaurantId, branchId, startDate, endDate, limit, page, sortBy, sortOrder } = query;

  const sanitized = {
    period: period ? sanitizeInput(period) : 'month',
    restaurantId: restaurantId ? sanitizeInput(restaurantId) : null,
    branchId: branchId ? sanitizeInput(branchId) : null,  // ✅ Add branchId
    startDate: startDate ? sanitizeInput(startDate) : null,
    endDate: endDate ? sanitizeInput(endDate) : null,
    limit: limit ? parseInt(limit) : 50,
    page: page ? parseInt(page) : 1,
    sortBy: sortBy ? sanitizeInput(sortBy) : 'revenue',
    sortOrder: sortOrder ? sanitizeInput(sortOrder) : 'desc',
  };

  // Check for injection attempts
  if (period && (containsSQLInjection(period) || containsXSS(period))) {
    throw new Error('Invalid input detected in period');
  }

  if (restaurantId && (containsSQLInjection(restaurantId) || containsXSS(restaurantId))) {
    throw new Error('Invalid input detected in restaurant ID');
  }

  if (branchId && (containsSQLInjection(branchId) || containsXSS(branchId))) {
    throw new Error('Invalid input detected in branch ID');
  }

  if (startDate && (containsSQLInjection(startDate) || containsXSS(startDate))) {
    throw new Error('Invalid input detected in start date');
  }

  if (endDate && (containsSQLInjection(endDate) || containsXSS(endDate))) {
    throw new Error('Invalid input detected in end date');
  }

  if (!ALLOWED_PERIODS.includes(sanitized.period)) {
    throw new Error(`Invalid period. Allowed: ${ALLOWED_PERIODS.join(', ')}`);
  }

  if (sanitized.restaurantId && sanitized.restaurantId !== 'all') {
    if (!isValidObjectId(sanitized.restaurantId)) {
      throw new Error('Invalid restaurant ID format');
    }
  }

  if (sanitized.branchId && sanitized.branchId !== 'all') {
    if (!isValidObjectId(sanitized.branchId)) {
      throw new Error('Invalid branch ID format');
    }
  }

  if (sanitized.limit < 1 || sanitized.limit > MAX_REPORTS_LIMIT) {
    throw new Error(`Limit must be between 1 and ${MAX_REPORTS_LIMIT}`);
  }

  if (sanitized.page < 1) {
    throw new Error('Page must be at least 1');
  }

  if (sanitized.sortBy && !ALLOWED_SORT_FIELDS.includes(sanitized.sortBy)) {
    throw new Error(`Invalid sort field. Allowed: ${ALLOWED_SORT_FIELDS.join(', ')}`);
  }

  if (sanitized.sortOrder && !ALLOWED_SORT_ORDERS.includes(sanitized.sortOrder)) {
    throw new Error(`Invalid sort order. Allowed: ${ALLOWED_SORT_ORDERS.join(', ')}`);
  }

  return sanitized;
};

// ─── HELPER: Sanitize order data ────────────────────────────────────────
const sanitizeOrder = (order) => {
  if (!order) return null;
  
  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableNumber: order.tableNumber || null,
    customerName: order.customerName ? sanitizeInput(order.customerName) : null,
    customerPhone: order.customerPhone || null,
    customerEmail: order.customerEmail ? sanitizeInput(order.customerEmail) : null,
    items: order.items ? order.items.map(item => ({
      productId: item.productId,
      productName: sanitizeInput(item.productName),
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || 0,
      notes: item.notes ? sanitizeInput(item.notes) : null,
    })) : [],
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    total: order.total || 0,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod || null,
    restaurantId: order.restaurantId,
    restaurantName: order.restaurantName ? sanitizeInput(order.restaurantName) : null,
    branchId: order.branchId,
    branchName: order.branchName ? sanitizeInput(order.branchName) : null,
    waiterId: order.waiterId,
    waiterName: order.waiterName ? sanitizeInput(order.waiterName) : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

// ─── HELPER: Sanitize report data ──────────────────────────────────────
const sanitizeReportData = (data) => {
  return {
    summary: {
      totalRevenue: data.summary?.totalRevenue || 0,
      totalOrders: data.summary?.totalOrders || 0,
      averageOrderValue: data.summary?.averageOrderValue || 0,
      totalRestaurants: data.summary?.totalRestaurants || 0,
      activeRestaurants: data.summary?.activeRestaurants || 0,
      totalStaff: data.summary?.totalStaff || 0,
      totalCustomers: data.summary?.totalCustomers || 0,
      growth: data.summary?.growth || 0,
      dailyAverage: data.summary?.dailyAverage || 0,
      weeklyAverage: data.summary?.weeklyAverage || 0,
      monthlyAverage: data.summary?.monthlyAverage || 0,
    },
    revenueTrend: data.revenueTrend?.map(d => ({
      date: d.date,
      revenue: d.revenue || 0,
      orders: d.orders || 0,
    })) || [],
    restaurantPerformance: data.restaurantPerformance?.map(r => ({
      _id: r._id,
      name: sanitizeInput(r.name || 'Unknown'),
      revenue: r.revenue || 0,
      orders: r.orders || 0,
      averageOrderValue: r.averageOrderValue || 0,
      staffCount: r.staffCount || 0,
      growth: r.growth || 0,
    })) || [],
    branchPerformance: data.branchPerformance?.map(b => ({
      _id: b._id,
      name: sanitizeInput(b.name || 'Unknown'),
      restaurantId: b.restaurantId || null,
      restaurantName: b.restaurantName ? sanitizeInput(b.restaurantName) : 'Unknown',
      revenue: b.revenue || 0,
      orders: b.orders || 0,
      averageOrderValue: b.averageOrderValue || 0,
      staffCount: b.staffCount || 0,
      growth: b.growth || 0,
    })) || [],
    orderTypeBreakdown: {
      dineIn: {
        revenue: data.orderTypeBreakdown?.dineIn?.revenue || 0,
        orders: data.orderTypeBreakdown?.dineIn?.orders || 0,
        percentage: data.orderTypeBreakdown?.dineIn?.percentage || 0,
      },
      takeaway: {
        revenue: data.orderTypeBreakdown?.takeaway?.revenue || 0,
        orders: data.orderTypeBreakdown?.takeaway?.orders || 0,
        percentage: data.orderTypeBreakdown?.takeaway?.percentage || 0,
      },
      delivery: {
        revenue: data.orderTypeBreakdown?.delivery?.revenue || 0,
        orders: data.orderTypeBreakdown?.delivery?.orders || 0,
        percentage: data.orderTypeBreakdown?.delivery?.percentage || 0,
      },
    },
    paymentMethodBreakdown: data.paymentMethodBreakdown || {},
    topItems: data.topItems?.map(item => ({
      name: sanitizeInput(item.name || 'Unknown'),
      quantity: item.quantity || 0,
      revenue: item.revenue || 0,
      orders: item.orders || 0,
    })) || [],
    hourlyDistribution: data.hourlyDistribution?.map(h => ({
      hour: h.hour || 0,
      orders: h.orders || 0,
      revenue: h.revenue || 0,
    })) || [],
    dailyBreakdown: data.dailyBreakdown?.map(d => ({
      date: d.date,
      revenue: d.revenue || 0,
      orders: d.orders || 0,
      averageOrderValue: d.averageOrderValue || 0,
    })) || [],
    topRestaurants: data.topRestaurants?.map(r => ({
      _id: r._id,
      name: sanitizeInput(r.name || 'Unknown'),
      revenue: r.revenue || 0,
      orders: r.orders || 0,
      growth: r.growth || 0,
    })) || [],
    topBranches: data.topBranches?.map(b => ({
      _id: b._id,
      name: sanitizeInput(b.name || 'Unknown'),
      restaurantName: b.restaurantName ? sanitizeInput(b.restaurantName) : 'Unknown',
      revenue: b.revenue || 0,
      orders: b.orders || 0,
      growth: b.growth || 0,
    })) || [],
    recentOrders: data.recentOrders?.map(o => sanitizeOrder(o)) || [],
  };
};

// ============================================================
//  ─── GET REPORTS WITH BRANCH FILTER ────────────────────────
// ============================================================

export const getReports = async (req, res) => {
  try {
    const userId = req.admin?._id || 'unknown';
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // ─── Rate Limiting ──────────────────────────────────────────────────
    if (!checkRateLimit(userId, 'getReports')) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', userId, {
        endpoint: '/reports',
        method: 'GET',
        ip: clientIp,
      });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    // ─── Validate and sanitize query ───────────────────────────────────
    let validatedQuery;
    try {
      validatedQuery = validateReportQuery(req.query);
    } catch (validationError) {
      await logSecurityEvent('INVALID_INPUT', userId, {
        endpoint: '/reports',
        error: validationError.message,
        query: req.query,
        ip: clientIp,
      });
      return res.status(400).json({
        success: false,
        error: validationError.message,
      });
    }

    const { period, restaurantId, branchId, startDate, endDate, limit, page, sortBy, sortOrder } = validatedQuery;

    console.log('📊 Generating reports for period:', period);
    console.log('📍 Branch filter:', branchId || 'all');

    // ─── Get date range ─────────────────────────────────────────────────
    let start, end;
    try {
      const range = getDateRange(period, startDate, endDate);
      start = range.start;
      end = range.end;
    } catch (dateError) {
      await logSecurityEvent('INVALID_DATE_RANGE', userId, {
        endpoint: '/reports',
        error: dateError.message,
        ip: clientIp,
      });
      return res.status(400).json({
        success: false,
        error: dateError.message,
      });
    }

    console.log(`📅 Date range: ${start.toISOString()} to ${end.toISOString()}`);

    // ─── Verify branch exists ──────────────────────────────────────────
    let targetBranch = null;
    if (branchId && branchId !== 'all') {
      targetBranch = await Branch.findById(branchId).lean();
      if (!targetBranch) {
        await logSecurityEvent('BRANCH_NOT_FOUND', userId, {
          branchId,
          ip: clientIp,
        });
        return res.status(404).json({
          success: false,
          error: 'Branch not found',
        });
      }
    }

    // ─── Build filter ──────────────────────────────────────────────────
    const filter = {
      createdAt: { $gte: start, $lte: end },
    };

    // ✅ Branch filter - only show orders from this branch
    if (branchId && branchId !== 'all') {
      filter.branchId = branchId;
    }

    // Restaurant filter (if no branch filter or as additional filter)
    if (restaurantId && restaurantId !== 'all') {
      filter.restaurantId = restaurantId;
    }

    // ─── Fetch orders with security limits ────────────────────────────
    const orders = await Order.find({
      ...filter,
      orderStatus: { $in: ['completed', 'paid', 'delivered'] },
    })
      .limit(MAX_ORDERS_PER_REPORT)
      .lean();

    await logSecurityEvent('REPORT_DATA_FETCHED', userId, {
      orderCount: orders.length,
      period,
      branchId: branchId || 'all',
      ip: clientIp,
    });

    // ─── Calculate summary ─────────────────────────────────────────────
    const completedOrders = orders.filter(o => 
      o.orderStatus === 'completed' || o.orderStatus === 'paid'
    );

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = completedOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // ─── Get branch breakdown ──────────────────────────────────────────
    const branchIds = [...new Set(orders.map(o => o.branchId).filter(Boolean))];
    const branchMap = {};
    
    for (const id of branchIds) {
      const branch = await Branch.findById(id).populate('restaurantId', 'name').lean();
      if (branch) {
        branchMap[id] = {
          name: branch.name,
          restaurantId: branch.restaurantId?._id || branch.restaurantId,
          restaurantName: branch.restaurantId?.name || 'Unknown',
        };
      }
    }

    // ─── Branch performance ────────────────────────────────────────────
    const branchPerformance = branchIds.map(id => {
      const branchOrders = orders.filter(o => o.branchId === id);
      const revenue = branchOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const info = branchMap[id] || { name: 'Unknown', restaurantName: 'Unknown' };
      return {
        _id: id,
        name: info.name,
        restaurantId: info.restaurantId || null,
        restaurantName: info.restaurantName || 'Unknown',
        revenue,
        orders: branchOrders.length,
        averageOrderValue: branchOrders.length > 0 ? revenue / branchOrders.length : 0,
        staffCount: 0,
        growth: 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // ─── Restaurant breakdown ──────────────────────────────────────────
    const restaurantIds = [...new Set(orders.map(o => o.restaurantId).filter(Boolean))];
    const restaurantNames = {};
    
    for (const id of restaurantIds) {
      const restaurant = await Restaurant.findById(id).select('name').lean();
      if (restaurant) {
        restaurantNames[id] = restaurant.name;
      }
    }

    const restaurantPerformance = restaurantIds.map(id => {
      const restaurantOrders = orders.filter(o => o.restaurantId === id);
      const revenue = restaurantOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        _id: id,
        name: restaurantNames[id] || 'Unknown',
        revenue,
        orders: restaurantOrders.length,
        averageOrderValue: restaurantOrders.length > 0 ? revenue / restaurantOrders.length : 0,
        staffCount: 0,
        growth: 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // ─── Order type breakdown ──────────────────────────────────────────
    const dineInOrders = orders.filter(o => o.orderType === 'dine-in');
    const takeawayOrders = orders.filter(o => o.orderType === 'takeaway');
    const deliveryOrders = orders.filter(o => o.orderType === 'delivery');

    const orderTypeBreakdown = {
      dineIn: {
        revenue: dineInOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        orders: dineInOrders.length,
        percentage: totalOrders > 0 ? (dineInOrders.length / totalOrders) * 100 : 0,
      },
      takeaway: {
        revenue: takeawayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        orders: takeawayOrders.length,
        percentage: totalOrders > 0 ? (takeawayOrders.length / totalOrders) * 100 : 0,
      },
      delivery: {
        revenue: deliveryOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        orders: deliveryOrders.length,
        percentage: totalOrders > 0 ? (deliveryOrders.length / totalOrders) * 100 : 0,
      },
    };

    // ─── Payment method breakdown ──────────────────────────────────────
    const paymentMethodBreakdown = {};
    orders.forEach(o => {
      const method = o.paymentMethod || 'unknown';
      if (!paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method] = { count: 0, total: 0, percentage: 0 };
      }
      paymentMethodBreakdown[method].count += 1;
      paymentMethodBreakdown[method].total += o.total || 0;
    });

    Object.keys(paymentMethodBreakdown).forEach(key => {
      paymentMethodBreakdown[key].percentage = totalRevenue > 0 
        ? (paymentMethodBreakdown[key].total / totalRevenue) * 100 
        : 0;
    });

    // ─── Daily breakdown ──────────────────────────────────────────────
    const dailyMap = {};
    orders.forEach(o => {
      const date = o.createdAt.toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { revenue: 0, orders: 0 };
      }
      dailyMap[date].revenue += o.total || 0;
      dailyMap[date].orders += 1;
    });

    const dailyBreakdown = Object.keys(dailyMap).map(date => ({
      date,
      revenue: dailyMap[date].revenue,
      orders: dailyMap[date].orders,
      averageOrderValue: dailyMap[date].orders > 0 ? dailyMap[date].revenue / dailyMap[date].orders : 0,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // ─── Revenue trend ──────────────────────────────────────────────────
    const revenueTrend = dailyBreakdown.map(d => ({
      date: d.date,
      revenue: d.revenue,
      orders: d.orders,
    }));

    // ─── Top items ──────────────────────────────────────────────────────
    const itemMap = {};
    orders.forEach(o => {
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => {
          const key = item.productId || item.name;
          if (!itemMap[key]) {
            itemMap[key] = {
              name: item.productName || item.name || 'Unknown',
              quantity: 0,
              revenue: 0,
              orders: 0,
            };
          }
          itemMap[key].quantity += item.quantity || 1;
          itemMap[key].revenue += item.totalPrice || (item.quantity * item.unitPrice) || 0;
          itemMap[key].orders += 1;
        });
      }
    });

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, MAX_ITEMS_PER_REPORT);

    // ─── Hourly distribution ───────────────────────────────────────────
    const hourlyMap = Array(24).fill(0).map(() => ({ hour: 0, orders: 0, revenue: 0 }));
    orders.forEach(o => {
      const hour = o.createdAt.getHours();
      hourlyMap[hour].hour = hour;
      hourlyMap[hour].orders += 1;
      hourlyMap[hour].revenue += o.total || 0;
    });

    // ─── Recent orders ──────────────────────────────────────────────────
    const recentOrders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // ─── Summary stats ──────────────────────────────────────────────────
    const [totalRestaurants, activeRestaurants, totalStaff, totalCustomers] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isActive: true, status: 'active' }),
      Staff.countDocuments(),
      User.countDocuments(),
    ]);

    const summary = {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalRestaurants,
      activeRestaurants,
      totalStaff,
      totalCustomers,
      growth: 0,
      dailyAverage: totalOrders > 0 ? totalRevenue / Math.max(1, dailyBreakdown.length) : 0,
      weeklyAverage: 0,
      monthlyAverage: 0,
    };

    // ─── Prepare response ──────────────────────────────────────────────
    const reportData = {
      summary,
      revenueTrend,
      restaurantPerformance,
      branchPerformance, // ✅ Added branch performance
      orderTypeBreakdown,
      paymentMethodBreakdown,
      topItems,
      hourlyDistribution: hourlyMap,
      dailyBreakdown,
      topRestaurants: restaurantPerformance.slice(0, 5),
      topBranches: branchPerformance.slice(0, 5), // ✅ Added top branches
      recentOrders: recentOrders.map(o => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        restaurantName: o.restaurantName || 'Unknown',
        branchName: o.branchName || 'N/A', // ✅ Added branch name
        total: o.total || 0,
        orderStatus: o.orderStatus,
        createdAt: o.createdAt,
      })),
    };

    // ─── Sanitize response ─────────────────────────────────────────────
    const sanitizedData = sanitizeReportData(reportData);

    await logSecurityEvent('REPORT_GENERATED', userId, {
      period,
      branchId: branchId || 'all',
      dataPoints: {
        orders: sanitizedData.revenueTrend.length,
        branches: sanitizedData.branchPerformance.length,
        restaurants: sanitizedData.restaurantPerformance.length,
        items: sanitizedData.topItems.length,
      },
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      data: sanitizedData,
      period: { 
        start: start.toISOString(), 
        end: end.toISOString(), 
        label: period,
        days: Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)),
      },
      pagination: {
        page,
        limit,
        total: orders.length,
        hasMore: orders.length === MAX_ORDERS_PER_REPORT,
      },
    });

  } catch (error) {
    console.error('❌ Error generating reports:', error);
    
    await logSecurityEvent('ERROR', req.admin?._id, {
      error: error.message,
      endpoint: '/reports',
      method: 'GET',
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate reports',
    });
  }
};

// ─── Get Restaurant Reports ────────────────────────────────────────────
export const getRestaurantReports = async (req, res) => {
  try {
    const userId = req.admin?._id || 'unknown';
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    if (!checkRateLimit(userId, 'getRestaurantReports')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    const { period = 'month', restaurantId, branchId, limit = 50 } = req.query;

    if (period && (containsSQLInjection(period) || containsXSS(period))) {
      await logSecurityEvent('INJECTION_ATTEMPT', userId, {
        endpoint: '/reports/restaurants',
        field: 'period',
        value: period,
        ip: clientIp,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid input detected',
      });
    }

    const validatedPeriod = ALLOWED_PERIODS.includes(period) ? period : 'month';
    const validatedLimit = Math.min(parseInt(limit) || 50, MAX_REPORTS_LIMIT);

    const { start, end } = getDateRange(validatedPeriod);

    const filter = {
      createdAt: { $gte: start, $lte: end },
    };

    if (branchId && branchId !== 'all') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      filter.branchId = branchId;
    }

    if (restaurantId && restaurantId !== 'all') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = restaurantId;
    }

    const orders = await Order.find(filter).lean();
    const restaurants = await Restaurant.find({ isActive: true }).limit(validatedLimit).lean();

    const report = restaurants.map(r => {
      const restaurantOrders = orders.filter(o => o.restaurantId === r._id);
      const revenue = restaurantOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        _id: r._id,
        name: sanitizeInput(r.name || 'Unknown'),
        revenue,
        orders: restaurantOrders.length,
        averageOrderValue: restaurantOrders.length > 0 ? revenue / restaurantOrders.length : 0,
        staffCount: 0,
        growth: 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    res.status(200).json({
      success: true,
      data: report,
      count: report.length,
    });

  } catch (error) {
    console.error('❌ Error fetching restaurant reports:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch restaurant reports',
    });
  }
};

// ─── Get Order Reports ─────────────────────────────────────────────────
export const getOrderReports = async (req, res) => {
  try {
    const userId = req.admin?._id || 'unknown';
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    if (!checkRateLimit(userId, 'getOrderReports')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    const { period = 'month', restaurantId, branchId, status, limit = 50, page = 1 } = req.query;

    const queryFields = { period, restaurantId, branchId, status };
    for (const [field, value] of Object.entries(queryFields)) {
      if (value && typeof value === 'string') {
        if (containsSQLInjection(value) || containsXSS(value)) {
          await logSecurityEvent('INJECTION_ATTEMPT', userId, {
            endpoint: '/reports/orders',
            field,
            value,
            ip: clientIp,
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid input detected',
          });
        }
      }
    }

    const validatedPeriod = ALLOWED_PERIODS.includes(period) ? period : 'month';
    const validatedLimit = Math.min(parseInt(limit) || 50, 200);
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const skip = (validatedPage - 1) * validatedLimit;

    const { start, end } = getDateRange(validatedPeriod);

    const filter = {
      createdAt: { $gte: start, $lte: end },
    };

    if (branchId && branchId !== 'all') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      filter.branchId = branchId;
    }

    if (restaurantId && restaurantId !== 'all') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = restaurantId;
    }

    if (status && status !== 'all') {
      if (!ALLOWED_ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Allowed: ${ALLOWED_ORDER_STATUSES.join(', ')}`,
        });
      }
      filter.orderStatus = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validatedLimit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const sanitizedOrders = orders.map(o => sanitizeOrder(o));

    res.status(200).json({
      success: true,
      data: sanitizedOrders,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        pages: Math.ceil(total / validatedLimit),
      },
      count: sanitizedOrders.length,
    });

  } catch (error) {
    console.error('❌ Error fetching order reports:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order reports',
    });
  }
};

// ─── Get Item Reports ──────────────────────────────────────────────────
export const getItemReports = async (req, res) => {
  try {
    const userId = req.admin?._id || 'unknown';
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    if (!checkRateLimit(userId, 'getItemReports')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    const { period = 'month', restaurantId, branchId, limit = 50 } = req.query;

    if (period && (containsSQLInjection(period) || containsXSS(period))) {
      await logSecurityEvent('INJECTION_ATTEMPT', userId, {
        endpoint: '/reports/items',
        field: 'period',
        value: period,
        ip: clientIp,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid input detected',
      });
    }

    const validatedPeriod = ALLOWED_PERIODS.includes(period) ? period : 'month';
    const validatedLimit = Math.min(parseInt(limit) || 50, 200);

    const { start, end } = getDateRange(validatedPeriod);

    const filter = {
      createdAt: { $gte: start, $lte: end },
    };

    if (branchId && branchId !== 'all') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID format',
        });
      }
      filter.branchId = branchId;
    }

    if (restaurantId && restaurantId !== 'all') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID format',
        });
      }
      filter.restaurantId = restaurantId;
    }

    const orders = await Order.find(filter).limit(MAX_ORDERS_PER_REPORT).lean();

    const itemMap = {};
    orders.forEach(o => {
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => {
          const key = item.productId || item.name;
          if (!itemMap[key]) {
            itemMap[key] = {
              name: item.productName || item.name || 'Unknown',
              quantity: 0,
              revenue: 0,
              orders: 0,
            };
          }
          itemMap[key].quantity += item.quantity || 1;
          itemMap[key].revenue += item.totalPrice || (item.quantity * item.unitPrice) || 0;
          itemMap[key].orders += 1;
        });
      }
    });

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, validatedLimit)
      .map(item => ({
        name: sanitizeInput(item.name),
        quantity: item.quantity || 0,
        revenue: item.revenue || 0,
        orders: item.orders || 0,
      }));

    res.status(200).json({
      success: true,
      data: topItems,
      count: topItems.length,
    });

  } catch (error) {
    console.error('❌ Error fetching item reports:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch item reports',
    });
  }
};

// ─── CLEANUP RATE LIMITER ──────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimiter.entries()) {
    if (now > data.resetAt) {
      rateLimiter.delete(key);
    }
  }
}, 60000);