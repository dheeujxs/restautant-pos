// controllers/super-admin/paymentController.js - COMPLETE FIXED VERSION

import Bill from '../../models/Bill.js';
import Restaurant from '../../models/super-admin/Restaurant.js';
import Order from '../../models/Order.js'; 
import Branch from '../../models/super-admin/Branch.js';
import mongoose from 'mongoose';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';
import { 
  isValidObjectId, 
  isValidEmail, 
  isValidPhone, 
  isValidName,
} from '../../utils/validators.js';

// ─── Custom validation for amount ──────────────────────────────────────
const isValidAmount = (amount) => {
  if (amount === undefined || amount === null) return true;
  if (typeof amount !== 'number') return false;
  if (isNaN(amount)) return false;
  if (amount < 0) return false;
  if (amount > 1000000000) return false; // Max 1 billion
  return true;
};

// ─── Custom validation for date ──────────────────────────────────────
const isValidDate = (dateString) => {
  if (!dateString) return true;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

// ─── Custom validation for payment status ──────────────────────────────
const validatePaymentStatus = (status) => {
  if (!status) return true;
  if (status === 'all') return true;
  const ALLOWED = ['pending', 'paid', 'refunded'];
  return ALLOWED.includes(status);
};

// ─── Custom validation for payment method ──────────────────────────────
const validatePaymentMethod = (method) => {
  if (!method) return true;
  if (method === 'all') return true;
  const ALLOWED = ['cash', 'card', 'upi', 'online'];
  return ALLOWED.includes(method);
};

// ============================================================
//  ─── SECURITY CONSTANTS ────────────────────────────────────
// ============================================================

const MAX_PAYMENTS_PER_REQUEST = 1000;
const MAX_EXPORT_LIMIT = 10000;
const ALLOWED_PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];
const ALLOWED_PAYMENT_METHODS = ['cash', 'card', 'upi', 'online'];
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 30;
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|MERGE)\b)/gi,
  /(\b(UNION|INTERSECT|EXCEPT|MINUS)\b)/gi,
  /(\b(OR|AND)\s+[=!<>])/gi,
  /['"]\s*(OR|AND)\s*['"]/gi,
  /(--)/g, /(\/\*)/g, /(\*\/)/g, /(;+\s*$)/g,
];
const XSS_PATTERNS = [
  /<script>/gi, /javascript:/gi, /onerror\s*=/gi,
  /onload\s*=/gi, /<iframe>/gi, /<object>/gi,
  /<embed>/gi, /eval\s*\(/gi, /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
];

// ─── In-memory rate limiter ────────────────────────────────
const rateLimiter = new Map();

// ============================================================
//  ─── SECURITY HELPER FUNCTIONS ────────────────────────────
// ============================================================

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

// ─── SQL Injection Detection ──────────────────────────────
const containsSQLInjection = (str) => {
  if (!str || typeof str !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(str));
};

// ─── XSS Detection ────────────────────────────────────────
const containsXSS = (str) => {
  if (!str || typeof str !== 'string') return false;
  return XSS_PATTERNS.some((pattern) => pattern.test(str));
};

// ─── Security Audit Logger ──────────────────────────────────
const logSecurityEvent = async (eventType, userId, details = {}) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'anonymous',
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      ...details,
    };
    console.log('🔒 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
    return logEntry;
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
};

// ─── Validate Payment ID ──────────────────────────────────
const validatePaymentId = (id) => {
  if (!id || !isValidObjectId(id)) {
    return { valid: false, error: 'Invalid payment ID format' };
  }
  return { valid: true };
};

// ─── Validate Date Range ──────────────────────────────────
const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Start date and end date are required' };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  if (start > end) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  
  return { valid: true, start, end };
};

// ─── GET BRANCH FROM ORDER ITEMS ──────────────────────────────────────
const getBranchFromItems = (order) => {
  if (!order || !order.items || order.items.length === 0) return null;
  
  for (const item of order.items) {
    if (item.branchId) {
      return {
        branchId: item.branchId,
        branchName: item.branchName || 'Unknown Branch',
        restaurantId: item.restaurantId || order.restaurantId,
        restaurantName: item.restaurantName || order.restaurantName,
      };
    }
  }
  return null;
};

// ─── ENRICH PAYMENT WITH BRANCH DATA ──────────────────────────────────
const enrichPaymentWithBranchData = async (payment) => {
  if (!payment) return payment;
  
  // If branch is already set and not "Main Branch", return as is
  if (payment.branchName && payment.branchName !== 'Main Branch' && payment.branchName !== 'Unknown Branch') {
    return payment;
  }
  
  // Try to get branch from items
  if (payment.items && payment.items.length > 0) {
    const firstItem = payment.items[0];
    if (firstItem.branchName && firstItem.branchName !== 'Main Branch' && firstItem.branchName !== 'Unknown Branch') {
      console.log(`🔄 Updating payment ${payment.billNumber} branch: ${payment.branchName} → ${firstItem.branchName}`);
      return {
        ...payment,
        branchName: firstItem.branchName,
        branchId: firstItem.branchId || payment.branchId,
        restaurantName: firstItem.restaurantName || payment.restaurantName,
        restaurantId: firstItem.restaurantId || payment.restaurantId,
      };
    }
  }
  
  // If still no branch, try to get from order
  if (payment.orderId) {
    try {
      const order = await Order.findById(payment.orderId).lean();
      if (order) {
        const itemBranch = getBranchFromItems(order);
        if (itemBranch) {
          console.log(`🔄 Updating payment ${payment.billNumber} from order items: ${payment.branchName} → ${itemBranch.branchName}`);
          return {
            ...payment,
            branchName: itemBranch.branchName,
            branchId: itemBranch.branchId || payment.branchId,
            restaurantName: itemBranch.restaurantName || payment.restaurantName,
            restaurantId: itemBranch.restaurantId || payment.restaurantId,
          };
        }
      }
    } catch (err) {
      console.log(`⚠️ Could not fetch order ${payment.orderId}:`, err.message);
    }
  }
  
  return payment;
};

// ─── ENRICH MULTIPLE PAYMENTS ──────────────────────────────────────────
const enrichPaymentsWithBranchData = async (payments) => {
  if (!payments || payments.length === 0) return payments;
  
  const enrichedPayments = [];
  
  for (const payment of payments) {
    const enriched = await enrichPaymentWithBranchData(payment);
    enrichedPayments.push(enriched);
  }
  
  return enrichedPayments;
};

// ─── Sanitize Payment Data ──────────────────────────────────
const sanitizePayment = (payment) => {
  if (!payment) return null;
  
  return {
    _id: payment._id,
    billNumber: payment.billNumber,
    orderId: payment.orderId,
    orderNumber: payment.orderNumber,
    orderType: payment.orderType,
    tableId: payment.tableId || null,
    tableNumber: payment.tableNumber || '',
    customerName: sanitizeInput(payment.customerName || ''),
    customerPhone: payment.customerPhone || '',
    customerAddress: sanitizeInput(payment.customerAddress || ''),
    items: payment.items?.map(item => ({
      productId: item.productId,
      productName: sanitizeInput(item.productName || ''),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      notes: item.notes ? sanitizeInput(item.notes) : '',
      branchName: item.branchName || payment.branchName,
      branchId: item.branchId || payment.branchId,
      restaurantName: item.restaurantName || payment.restaurantName,
      restaurantId: item.restaurantId || payment.restaurantId,
    })) || [],
    subtotal: payment.subtotal || 0,
    tax: payment.tax || 0,
    taxRate: payment.taxRate || 5,
    discount: payment.discount || 0,
    discountType: payment.discountType || 'fixed',
    total: payment.total || 0,
    paymentMethod: payment.paymentMethod || 'cash',
    paymentStatus: payment.paymentStatus || 'pending',
    paidAt: payment.paidAt || null,
    notes: payment.notes ? sanitizeInput(payment.notes) : '',
    generatedBy: payment.generatedBy,
    generatedByName: sanitizeInput(payment.generatedByName || 'system'),
    restaurantId: payment.restaurantId || null,
    restaurantName: sanitizeInput(payment.restaurantName || ''),
    branchId: payment.branchId || null,
    branchName: sanitizeInput(payment.branchName || ''),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
};

// ============================================================
//  ─── CONTROLLER FUNCTIONS ──────────────────────────────────
// ============================================================

// ─── GET REVENUE ANALYTICS (WITH BRANCH FILTER) ──────────────────────
export const getRevenueAnalytics = async (req, res) => {
  try {
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;
    const { period = 'month', groupBy = 'day', branchId } = req.query;

    if (!checkRateLimit(userId, 'getRevenueAnalytics')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    const now = new Date();
    let startDate = new Date();
    let previousStartDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        previousStartDate.setDate(now.getDate() - 1);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate.setDate(now.getDate() - 14);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    let filter = {
      paymentStatus: 'paid',
      createdAt: {
        $gte: startDate,
        $lte: now
      }
    };

    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      filter.branchId = branchId;
      console.log(`📍 Filtering analytics by branch: ${branchId}`);
    }

    let previousFilter = {
      paymentStatus: 'paid',
      createdAt: {
        $gte: previousStartDate,
        $lt: startDate
      }
    };

    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      previousFilter.branchId = branchId;
    }

    let payments = await Bill.find(filter).select('total items orderType customerPhone createdAt').lean();
    let previousPayments = await Bill.find(previousFilter).select('total').lean();

    // ✅ Enrich payments with branch data from items
    payments = await enrichPaymentsWithBranchData(payments);
    previousPayments = await enrichPaymentsWithBranchData(previousPayments);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalOrders = payments.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const previousRevenue = previousPayments.reduce((sum, p) => sum + (p.total || 0), 0);
    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : totalRevenue > 0 ? 100 : 0;

    const timelineMap = new Map();
    const groupFormat = groupBy === 'week' ? 'week' : 'day';
    
    payments.forEach(p => {
      let key;
      if (groupFormat === 'week') {
        const date = new Date(p.createdAt);
        const weekNumber = getWeekNumber(date);
        key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      } else {
        key = new Date(p.createdAt).toISOString().split('T')[0];
      }
      
      if (!timelineMap.has(key)) {
        timelineMap.set(key, { date: key, revenue: 0, orders: 0 });
      }
      const day = timelineMap.get(key);
      day.revenue += p.total || 0;
      day.orders += 1;
    });

    const timeline = Array.from(timelineMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    const hourlyMap = new Map();
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, { hour: i, orders: 0, revenue: 0 });
    }
    
    payments.forEach(p => {
      const hour = new Date(p.createdAt).getHours();
      const data = hourlyMap.get(hour);
      data.orders += 1;
      data.revenue += p.total || 0;
    });

    const hourlyData = Array.from(hourlyMap.values());

    const itemMap = new Map();
    payments.forEach(p => {
      if (p.items && Array.isArray(p.items)) {
        p.items.forEach(item => {
          const key = item.productId || item.productName || 'unknown';
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              name: item.productName || 'Unknown Item',
              quantity: 0,
              revenue: 0,
              orders: 0
            });
          }
          const data = itemMap.get(key);
          data.quantity += item.quantity || 0;
          data.revenue += item.totalPrice || 0;
          data.orders += 1;
        });
      }
    });

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const customerMap = new Map();
    payments.forEach(p => {
      const phone = p.customerPhone || 'anonymous';
      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          phone,
          orders: 0,
          revenue: 0,
          avgOrderValue: 0
        });
      }
      const customer = customerMap.get(phone);
      customer.orders += 1;
      customer.revenue += p.total || 0;
    });

    const customerSegments = {
      vip: { orders: 0, revenue: 0, averageOrderValue: 0 },
      regular: { orders: 0, revenue: 0, averageOrderValue: 0 }
    };

    const customerList = Array.from(customerMap.values()).map(c => {
      c.avgOrderValue = c.orders > 0 ? c.revenue / c.orders : 0;
      return c;
    });

    customerList.forEach(c => {
      if (c.orders >= 5 && c.revenue > 5000) {
        customerSegments.vip.orders += c.orders;
        customerSegments.vip.revenue += c.revenue;
      } else if (c.orders >= 2) {
        customerSegments.regular.orders += c.orders;
        customerSegments.regular.revenue += c.revenue;
      }
    });

    customerSegments.vip.averageOrderValue = customerSegments.vip.orders > 0 
      ? customerSegments.vip.revenue / customerSegments.vip.orders 
      : 0;
    customerSegments.regular.averageOrderValue = customerSegments.regular.orders > 0 
      ? customerSegments.regular.revenue / customerSegments.regular.orders 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          revenueGrowth,
          averageOrderValue,
        },
        timeline,
        hourlyData,
        topItems,
        customerSegments,
        filterInfo: {
          period,
          branchId: branchId || 'all',
          totalBillsInPeriod: payments.length,
          dateRange: { start: startDate, end: now }
        }
      }
    });

  } catch (error) {
    console.error('[GET /super-admin/revenue/analytics] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics'
    });
  }
};

// ─── Helper: Get week number ──────────────────────────────────────────
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ─── GET REVENUE OVERVIEW (WITH BRANCH FILTER) ──────────────────────
export const getRevenueOverview = async (req, res) => {
  try {
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;
    const { period = 'month', branchId } = req.query;

    if (!checkRateLimit(userId, 'getRevenueOverview')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    let filter = {
      paymentStatus: 'paid',
      createdAt: {
        $gte: startDate,
        $lte: now
      }
    };

    let targetBranch = null;
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      targetBranch = await Branch.findById(branchId).lean();
      if (targetBranch) {
        filter.branchId = branchId;
        console.log(`📍 Filtering revenue overview by branch: ${branchId} (${targetBranch.name})`);
      } else {
        console.log(`⚠️ Branch ${branchId} not found`);
        return res.status(400).json({
          success: false,
          error: 'Branch not found',
        });
      }
    }

    let payments = await Bill.find(filter)
      .select('total paymentStatus paymentMethod orderType branchName restaurantName branchId items')
      .lean();

    console.log(`📊 Found ${payments.length} payments for period`);

    // ✅ Enrich payments with branch data from items
    payments = await enrichPaymentsWithBranchData(payments);

    // ─── Calculate summary stats ────────────────────────────────────────
    const totalRevenue = payments.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalOrders = payments.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const platformCommission = totalRevenue * 0.1;

    // ─── Order type breakdown ───────────────────────────────────────────
    const orderTypeBreakdown = {
      dineIn: { revenue: 0, orders: 0, percentage: 0 },
      takeaway: { revenue: 0, orders: 0, percentage: 0 },
      delivery: { revenue: 0, orders: 0, percentage: 0 },
    };

    payments.forEach(p => {
      const type = p.orderType || 'dineIn';
      if (orderTypeBreakdown[type]) {
        orderTypeBreakdown[type].revenue += p.total || 0;
        orderTypeBreakdown[type].orders += 1;
      }
    });

    if (totalRevenue > 0) {
      Object.keys(orderTypeBreakdown).forEach(key => {
        orderTypeBreakdown[key].percentage = 
          (orderTypeBreakdown[key].revenue / totalRevenue) * 100;
      });
    }

    // ─── Branch breakdown ───────────────────────────────────────────────
    const branchMap = new Map();
    
    payments.forEach(p => {
      const branchIdStr = p.branchId?.toString() || 'unknown';
      if (!branchMap.has(branchIdStr)) {
        branchMap.set(branchIdStr, {
          branchId: branchIdStr,
          branchName: p.branchName || 'Unknown Branch',
          restaurantId: p.restaurantId?.toString() || 'unknown',
          restaurantName: p.restaurantName || 'Unknown',
          revenue: 0,
          orders: 0,
          commissionEarned: 0,
        });
      }
      const branch = branchMap.get(branchIdStr);
      branch.revenue += p.total || 0;
      branch.orders += 1;
      branch.commissionEarned += (p.total || 0) * 0.1;
    });

    let branchBreakdown = Array.from(branchMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    if (targetBranch) {
      const filtered = branchBreakdown.filter(b => b.branchId === branchId);
      if (filtered.length > 0) {
        branchBreakdown = filtered;
      } else {
        branchBreakdown = [{
          branchId: targetBranch._id.toString(),
          branchName: targetBranch.name,
          restaurantId: targetBranch.restaurantId?.toString() || 'unknown',
          restaurantName: 'Unknown',
          revenue: 0,
          orders: 0,
          commissionEarned: 0,
        }];
      }
    }

    // ─── Restaurant breakdown ───────────────────────────────────────────
    const restaurantMapAgg = new Map();
    branchBreakdown.forEach(b => {
      const restId = b.restaurantId;
      if (!restaurantMapAgg.has(restId)) {
        restaurantMapAgg.set(restId, {
          restaurantId: restId,
          restaurantName: b.restaurantName,
          revenue: 0,
          orders: 0,
          commissionEarned: 0,
        });
      }
      const rest = restaurantMapAgg.get(restId);
      rest.revenue += b.revenue;
      rest.orders += b.orders;
      rest.commissionEarned += b.commissionEarned;
    });

    const restaurantBreakdown = Array.from(restaurantMapAgg.values())
      .sort((a, b) => b.revenue - a.revenue);

    // ─── Daily breakdown ────────────────────────────────────────────────
    const dailyMap = new Map();
    payments.forEach(p => {
      const date = new Date(p.createdAt).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, revenue: 0, orders: 0, averageOrderValue: 0 });
      }
      const day = dailyMap.get(date);
      day.revenue += p.total || 0;
      day.orders += 1;
      day.averageOrderValue = day.orders > 0 ? day.revenue / day.orders : 0;
    });

    const dailyBreakdown = Array.from(dailyMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    // ─── Top branches ────────────────────────────────────────────────────
    const topBranches = branchBreakdown.slice(0, 10);
    const topRestaurants = restaurantBreakdown.slice(0, 10);

    // ─── Response ────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          platformCommission,
          orderTypeBreakdown,
        },
        restaurantBreakdown,
        branchBreakdown,
        dailyBreakdown,
        topRestaurants,
        topBranches,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
          label: period.charAt(0).toUpperCase() + period.slice(1),
        },
        filterInfo: {
          period,
          branchId: branchId || 'all',
          totalBillsInPeriod: payments.length,
          totalOrdersInPeriod: payments.filter(p => p.paymentStatus === 'paid').length,
          itemsProcessed: payments.reduce((sum, p) => sum + (p.items?.length || 0), 0),
        },
      }
    });

  } catch (error) {
    console.error('[GET /super-admin/revenue/overview] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue overview'
    });
  }
};

// ─── GET BRANCH REVENUE OVERVIEW ──────────────────────────────────────
export const getBranchRevenueOverview = async (req, res) => {
  try {
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;
    const { branchId, period = 'month' } = req.query;

    if (!checkRateLimit(userId, 'getBranchRevenueOverview')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    let filter = {};
    
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      filter.branchId = branchId;
      console.log(`📍 Filtering revenue by branch: ${branchId}`);
    }

    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    filter.createdAt = {
      $gte: startDate,
      $lte: now
    };

    let payments = await Bill.find(filter)
      .select('total paymentStatus paymentMethod orderType branchName restaurantName items')
      .lean();

    // ✅ Enrich payments with branch data from items
    payments = await enrichPaymentsWithBranchData(payments);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.total || 0), 0);
    const paidPayments = payments.filter(p => p.paymentStatus === 'paid');
    const totalOrders = paidPayments.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const orderTypeBreakdown = {
      dineIn: { revenue: 0, orders: 0, percentage: 0 },
      takeaway: { revenue: 0, orders: 0, percentage: 0 },
      delivery: { revenue: 0, orders: 0, percentage: 0 },
    };

    paidPayments.forEach(p => {
      const type = p.orderType || 'dine-in';
      if (orderTypeBreakdown[type]) {
        orderTypeBreakdown[type].revenue += p.total || 0;
        orderTypeBreakdown[type].orders += 1;
      }
    });

    if (totalRevenue > 0) {
      Object.keys(orderTypeBreakdown).forEach(key => {
        orderTypeBreakdown[key].percentage = 
          (orderTypeBreakdown[key].revenue / totalRevenue) * 100;
      });
    }

    let branchInfo = null;
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      const branch = await Branch.findById(branchId).populate('restaurantId', 'name').lean();
      if (branch) {
        branchInfo = {
          branchId: branch._id,
          branchName: branch.name,
          restaurantId: branch.restaurantId?._id || branch.restaurantId,
          restaurantName: branch.restaurantId?.name || 'Unknown',
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          platformCommission: totalRevenue * 0.1,
          orderTypeBreakdown,
        },
        branchInfo,
        filterInfo: {
          period,
          branchId: branchId || 'all',
          dateRange: { start: startDate, end: now },
        },
        payments: payments.map(p => ({
          ...p,
          branchName: p.branchName || 'Main Branch',
        })),
        count: payments.length,
      }
    });

  } catch (error) {
    console.error('[GET /super-admin/revenue/branch] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch revenue data'
    });
  }
};

// ─── GET ALL PAYMENTS WITH BRANCH FILTER ──────────────────────────────
export const getAllPayments = async (req, res) => {
  try {
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!checkRateLimit(userId, 'getAllPayments')) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', userId, {
        endpoint: '/super-admin/payments',
        ip: clientIp,
      });
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    const {
      restaurantId,
      branchId,
      status,
      method,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    if (restaurantId && restaurantId !== 'all' && !isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format',
      });
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    if (status && status !== 'all' && !validatePaymentStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`,
      });
    }

    if (method && method !== 'all' && !validatePaymentMethod(method)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      });
    }

    if (search) {
      if (containsSQLInjection(search) || containsXSS(search)) {
        await logSecurityEvent('INJECTION_ATTEMPT', userId, {
          endpoint: '/super-admin/payments',
          field: 'search',
          value: search,
          ip: clientIp,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid search input detected',
        });
      }
    }

    if (startDate || endDate) {
      const dateValidation = validateDateRange(startDate, endDate);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
        });
      }
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(MAX_PAYMENTS_PER_REQUEST, Math.max(1, parseInt(limit) || 50));

    let filter = {};

    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      filter.branchId = branchId;
      console.log(`📍 Filtering payments by branch: ${branchId}`);
    }

    if (restaurantId && restaurantId !== 'all') {
      filter.restaurantId = restaurantId;
    }

    if (status && status !== 'all') {
      filter.paymentStatus = status;
    }

    if (method && method !== 'all') {
      filter.paymentMethod = method;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        { billNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { orderNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { customerName: { $regex: sanitizedSearch, $options: 'i' } },
        { customerPhone: { $regex: sanitizedSearch, $options: 'i' } },
        { restaurantName: { $regex: sanitizedSearch, $options: 'i' } },
        { branchName: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    let payments = await Bill.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Bill.countDocuments(filter);

    // ✅ Enrich payments with branch data from items
    payments = await enrichPaymentsWithBranchData(payments);

    const sanitizedPayments = payments.map(p => sanitizePayment(p));
    const stats = await getPaymentStatsInternal(filter);

    await logSecurityEvent('PAYMENTS_FETCHED', userId, {
      count: payments.length,
      total,
      filters: { restaurantId, branchId, status, method, dateRange: { startDate, endDate } },
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      data: {
        payments: sanitizedPayments,
        stats,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        },
        count: payments.length
      }
    });
  } catch (error) {
    console.error('[GET /super-admin/payments] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments'
    });
  }
};

// ─── GET PAYMENT STATS WITH BRANCH FILTER ──────────────────────────────
export const getPaymentStats = async (req, res) => {
  try {
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!checkRateLimit(userId, 'getPaymentStats')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    const { restaurantId, branchId, startDate, endDate } = req.query;

    if (restaurantId && restaurantId !== 'all' && !isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format',
      });
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    if (startDate || endDate) {
      const dateValidation = validateDateRange(startDate, endDate);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
        });
      }
    }

    let filter = {};
    
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      filter.branchId = branchId;
    }
    
    if (restaurantId && restaurantId !== 'all') {
      filter.restaurantId = restaurantId;
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const stats = await getPaymentStatsInternal(filter);

    await logSecurityEvent('PAYMENT_STATS_FETCHED', userId, {
      restaurantId,
      branchId,
      dateRange: { startDate, endDate },
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[GET /super-admin/payments/stats] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment stats'
    });
  }
};

// ─── GET PAYMENT BY ID ─────────────────────────────────────────────────
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!checkRateLimit(userId, 'getPaymentById')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    const idValidation = validatePaymentId(id);
    if (!idValidation.valid) {
      return res.status(400).json({
        success: false,
        error: idValidation.error,
      });
    }

    let payment = await Bill.findById(id).select('-__v').lean();
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // ✅ Enrich payment with branch data from items
    payment = await enrichPaymentWithBranchData(payment);

    const sanitizedPayment = sanitizePayment(payment);

    await logSecurityEvent('PAYMENT_FETCHED', userId, {
      paymentId: id,
      billNumber: payment.billNumber,
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      data: sanitizedPayment
    });
  } catch (error) {
    console.error('[GET /super-admin/payments/:id] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment'
    });
  }
};

// ─── GET PAYMENTS BY RESTAURANT ──────────────────────────────────────
export const getPaymentsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;
    const { branchId, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    if (!checkRateLimit(userId, 'getPaymentsByRestaurant')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (!isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format',
      });
    }

    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    if (status && status !== 'all' && !validatePaymentStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`,
      });
    }

    if (startDate || endDate) {
      const dateValidation = validateDateRange(startDate, endDate);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
        });
      }
    }

    let filter = { restaurantId };
    
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      filter.branchId = branchId;
    }
    
    if (status && status !== 'all') {
      filter.paymentStatus = status;
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(MAX_PAYMENTS_PER_REQUEST, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    let payments = await Bill.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Bill.countDocuments(filter);

    // ✅ Enrich payments with branch data from items
    payments = await enrichPaymentsWithBranchData(payments);

    const sanitizedPayments = payments.map(p => sanitizePayment(p));
    const stats = await getPaymentStatsInternal(filter);

    await logSecurityEvent('RESTAURANT_PAYMENTS_FETCHED', userId, {
      restaurantId,
      restaurantName: restaurant.name,
      branchId,
      count: payments.length,
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      data: {
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name
        },
        payments: sanitizedPayments,
        stats,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        },
        count: payments.length
      }
    });
  } catch (error) {
    console.error('[GET /super-admin/payments/restaurant/:id] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant payments'
    });
  }
};

// ─── GET PAYMENTS BY DATE RANGE ──────────────────────────────────────
export const getPaymentsByDateRange = async (req, res) => {
  try {
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;
    const { startDate, endDate, restaurantId, branchId } = req.query;

    if (!checkRateLimit(userId, 'getPaymentsByDateRange')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        error: dateValidation.error,
      });
    }

    if (restaurantId && restaurantId !== 'all' && !isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format',
      });
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    let filter = {
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    if (restaurantId && restaurantId !== 'all') {
      filter.restaurantId = restaurantId;
    }
    
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      filter.branchId = branchId;
    }

    let payments = await Bill.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    // ✅ Enrich payments with branch data from items
    payments = await enrichPaymentsWithBranchData(payments);

    const sanitizedPayments = payments.map(p => sanitizePayment(p));
    const stats = await getPaymentStatsInternal(filter);

    await logSecurityEvent('DATE_RANGE_PAYMENTS_FETCHED', userId, {
      startDate,
      endDate,
      restaurantId: restaurantId || 'all',
      branchId: branchId || 'all',
      count: payments.length,
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      data: {
        payments: sanitizedPayments,
        stats,
        count: payments.length,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('[GET /super-admin/payments/date-range] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments by date range'
    });
  }
};

// ─── EXPORT PAYMENTS WITH BRANCH FILTER ──────────────────────────────────
export const exportPayments = async (req, res) => {
  try {
    const userId = req.admin?._id || req.user?._id || 'anonymous';
    const clientIp = req.ip || req.connection.remoteAddress;
    const { restaurantId, branchId, status, startDate, endDate } = req.query;

    if (!checkRateLimit(userId, 'exportPayments')) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (restaurantId && restaurantId !== 'all' && !isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format',
      });
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined' && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format',
      });
    }

    if (status && status !== 'all' && !validatePaymentStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`,
      });
    }

    if (startDate || endDate) {
      const dateValidation = validateDateRange(startDate, endDate);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error,
        });
      }
    }

    let filter = {};
    
    if (restaurantId && restaurantId !== 'all') {
      filter.restaurantId = restaurantId;
    }
    
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      filter.branchId = branchId;
    }
    
    if (status && status !== 'all') {
      filter.paymentStatus = status;
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    let payments = await Bill.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(MAX_EXPORT_LIMIT)
      .lean();

    // ✅ Enrich payments with branch data from items
    payments = await enrichPaymentsWithBranchData(payments);

    const csvData = payments.map(p => ({
      'Bill Number': sanitizeInput(p.billNumber || ''),
      'Order Number': sanitizeInput(p.orderNumber || ''),
      'Customer': sanitizeInput(p.customerName || 'Guest'),
      'Phone': sanitizeInput(p.customerPhone || 'N/A'),
      'Restaurant': sanitizeInput(p.restaurantName || 'Unknown'),
      'Branch': sanitizeInput(p.branchName || 'Main'),
      'Amount': p.total || 0,
      'Payment Method': p.paymentMethod || 'cash',
      'Status': p.paymentStatus || 'pending',
      'Date': new Date(p.createdAt).toLocaleString()
    }));

    await logSecurityEvent('PAYMENTS_EXPORTED', userId, {
      count: payments.length,
      filters: { restaurantId, branchId, status, dateRange: { startDate, endDate } },
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      data: {
        payments: csvData,
        count: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + (p.total || 0), 0)
      }
    });
  } catch (error) {
    console.error('[GET /super-admin/payments/export] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export payments'
    });
  }
};

// ─── INTERNAL HELPER: Get Payment Stats ──────────────────────────────
const getPaymentStatsInternal = async (filter) => {
  try {
    let payments = await Bill.find(filter).select('paymentStatus paymentMethod total restaurantName branchName items').lean();
    
    // ✅ Enrich with branch data
    payments = await enrichPaymentsWithBranchData(payments);

    const paid = payments.filter(p => p.paymentStatus === 'paid');
    const pending = payments.filter(p => p.paymentStatus === 'pending');
    const refunded = payments.filter(p => p.paymentStatus === 'refunded');

    const totalRevenue = paid.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalOrders = paid.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const byPaymentMethod = {};
    const byRestaurant = {};
    const byBranch = {};
    const byStatus = {
      paid: paid.length,
      pending: pending.length,
      refunded: refunded.length
    };

    paid.forEach(p => {
      const method = p.paymentMethod || 'unknown';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + (p.total || 0);
      
      const name = p.restaurantName || 'Unknown';
      byRestaurant[name] = (byRestaurant[name] || 0) + (p.total || 0);
      
      const branchName = p.branchName || 'Main';
      byBranch[branchName] = (byBranch[branchName] || 0) + (p.total || 0);
    });

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      pendingPayments: pending.length,
      byPaymentMethod,
      byRestaurant,
      byBranch,
      byStatus
    };
  } catch (error) {
    console.error('Error calculating payment stats:', error);
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      pendingPayments: 0,
      byPaymentMethod: {},
      byRestaurant: {},
      byBranch: {},
      byStatus: { paid: 0, pending: 0, refunded: 0 }
    };
  }
};

// ─── BACKFILL BILLS WITH BRANCH INFO ──────────────────────────────────
export const backfillBillsWithBranchInfo = async (req, res) => {
  try {
    console.log('🔄 Starting backfill of bills with branch info...');
    
    let billsWithoutBranch = await Bill.find({
      $or: [
        { branchId: { $exists: false } },
        { branchId: null },
        { branchId: '' },
        { branchName: 'Main Branch' },
        { branchName: 'Unknown Branch' }
      ]
    }).lean();

    console.log(`🔍 Found ${billsWithoutBranch.length} bills without proper branch info`);

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const bill of billsWithoutBranch) {
      try {
        // Try to get order data
        const order = await Order.findById(bill.orderId).lean();
        
        if (order) {
          // First try to get branch from order items
          const itemBranch = getBranchFromItems(order);
          
          if (itemBranch && itemBranch.branchName && itemBranch.branchName !== 'Main Branch') {
            // Update bill with branch from items
            await Bill.findByIdAndUpdate(bill._id, {
              $set: {
                restaurantId: itemBranch.restaurantId || order.restaurantId || null,
                restaurantName: itemBranch.restaurantName || order.restaurantName || '',
                branchId: itemBranch.branchId || order.branchId || null,
                branchName: itemBranch.branchName,
              }
            });
            updated++;
            console.log(`✅ Updated bill ${bill.billNumber} with branch ${itemBranch.branchName} (from items)`);
            continue;
          }
          
          // Fallback: use order's branch
          if (order.branchName && order.branchName !== 'Main Branch') {
            await Bill.findByIdAndUpdate(bill._id, {
              $set: {
                restaurantId: order.restaurantId || null,
                restaurantName: order.restaurantName || '',
                branchId: order.branchId || null,
                branchName: order.branchName,
              }
            });
            updated++;
            console.log(`✅ Updated bill ${bill.billNumber} with branch ${order.branchName} (from order)`);
            continue;
          }
        }
        
        // If order doesn't have branch, try to find branch by name in Branch collection
        if (bill.branchName && bill.branchName !== 'Main Branch' && bill.branchName !== 'Unknown Branch') {
          const branch = await Branch.findOne({ 
            restaurantId: bill.restaurantId,
            name: { $regex: new RegExp(`^${bill.branchName}$`, 'i') }
          }).lean();
          
          if (branch) {
            await Bill.findByIdAndUpdate(bill._id, {
              $set: {
                branchId: branch._id,
                branchName: branch.name,
              }
            });
            updated++;
            console.log(`✅ Updated bill ${bill.billNumber} with branch ${branch.name} (by name match)`);
            continue;
          }
        }
        
        skipped++;
        console.log(`⚠️ Skipped bill ${bill.billNumber} - no valid branch info found`);
        
      } catch (err) {
        errors.push({ billId: bill._id, billNumber: bill.billNumber, error: err.message });
        console.error(`❌ Error updating bill ${bill.billNumber}:`, err.message);
      }
    }

    console.log(`✅ Backfill completed: ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

    return res.status(200).json({
      success: true,
      message: 'Backfill completed',
      data: {
        totalBillsProcessed: billsWithoutBranch.length,
        updated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      }
    });

  } catch (err) {
    console.error('[POST /super-admin/bills/backfill] ERROR:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to backfill bills',
    });
  }
};

// ─── Clean up rate limiter ──────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimiter.entries()) {
    if (now > data.resetAt) {
      rateLimiter.delete(key);
    }
  }
}, 60000);

// ─── EXPORTS ──────────────────────────────────────────────────────────────
export default {
  getRevenueAnalytics,
  getRevenueOverview,
  getBranchRevenueOverview,
  getAllPayments,
  getPaymentStats,
  getPaymentById,
  getPaymentsByRestaurant,
  getPaymentsByDateRange,
  exportPayments,
  backfillBillsWithBranchInfo,
};