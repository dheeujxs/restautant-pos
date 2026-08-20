// controllers/billController.js - COMPLETE WITH SSE REAL-TIME UPDATES

import Bill from '../models/Bill.js';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import { 
  isValidObjectId, 
  isValidEmail, 
  isValidPhone, 
  isValidName,
  isValidText,
  isValidPrice,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_RETRIES = 5;
const ALLOWED_PAYMENT_METHODS = ['cash', 'card', 'upi', 'online'];
const ALLOWED_PAYMENT_STATUS = ['pending', 'paid', 'refunded'];

// ─── Store active SSE connections ────────────────────────────────────────
const clients = new Set();
let clientIdCounter = 0;

// ─── Broadcast bill update to all connected clients ────────────────────
export const broadcastBillUpdate = (billData) => {
  const message = JSON.stringify({
    type: 'NEW_BILL',
    data: billData,
    timestamp: new Date().toISOString()
  });
  
  console.log(`📡 Broadcasting to ${clients.size} clients`);
  
  clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (err) {
      console.error('Error sending to client:', err);
      clients.delete(client);
    }
  });
};

// ─── Broadcast payment update to all connected clients ──────────────────
export const broadcastPaymentUpdate = (billData) => {
  const message = JSON.stringify({
    type: 'PAYMENT_UPDATED',
    data: billData,
    timestamp: new Date().toISOString()
  });
  
  clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (err) {
      clients.delete(client);
    }
  });
};

// ─── SSE Endpoint for real-time bill updates ──────────────────────────
export const streamBills = async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const clientId = ++clientIdCounter;
  const newClient = {
    id: clientId,
    write: res.write.bind(res),
  };
  
  clients.add(newClient);
  console.log(`🔌 Client ${clientId} connected (${clients.size} total)`);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, clients: clients.size })}\n\n`);
  
  // Send current pending bills count
  try {
    const pendingCount = await Bill.countDocuments({ paymentStatus: 'pending' });
    const pendingTotal = await Bill.aggregate([
      { $match: { paymentStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]).then(result => result[0]?.total || 0);
    
    res.write(`data: ${JSON.stringify({ 
      type: 'INITIAL', 
      pendingCount,
      pendingTotal,
      clients: clients.size 
    })}\n\n`);
  } catch (err) {
    console.error('Error sending initial bill count:', err);
  }

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() })}\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
      clients.delete(newClient);
    }
  }, 30000);

  // Remove client on connection close
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(newClient);
    console.log(`❌ Client ${clientId} disconnected (${clients.size} remaining)`);
  });
};

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

const generateBillNumber = async () => {
  const Bill = await import('../models/Bill.js').then(m => m.default);
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const count = await Bill.countDocuments() + 1;
  return `BILL-${year}${month}-${count.toString().padStart(4, '0')}`;
};

const isValidPaymentMethod = (method) => {
  if (!method) return false;
  return ALLOWED_PAYMENT_METHODS.includes(method);
};

const isValidPaymentStatus = (status) => {
  if (!status) return false;
  return ALLOWED_PAYMENT_STATUS.includes(status);
};

const sanitizeBill = (bill) => {
  if (!bill) return null;
  return {
    _id: bill._id,
    billNumber: bill.billNumber,
    orderId: bill.orderId,
    orderNumber: bill.orderNumber,
    orderType: bill.orderType,
    tableId: bill.tableId || null,
    tableNumber: bill.tableNumber || '',
    customerName: sanitizeInput(bill.customerName || ''),
    customerPhone: bill.customerPhone || '',
    customerAddress: sanitizeInput(bill.customerAddress || ''),
    items: bill.items?.map(item => ({
      productId: item.productId,
      productName: sanitizeInput(item.productName || ''),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      notes: item.notes ? sanitizeInput(item.notes) : '',
      roundNumber: item.roundNumber || 1,
      personName: item.personName ? sanitizeInput(item.personName) : '',
      seatNumber: item.seatNumber || 0,
      restaurantId: item.restaurantId || null,
      restaurantName: item.restaurantName || '',
      branchId: item.branchId || null,
      branchName: item.branchName || '',
    })) || [],
    subtotal: bill.subtotal || 0,
    tax: bill.tax || 0,
    taxRate: bill.taxRate || 5,
    discount: bill.discount || 0,
    discountType: bill.discountType || 'fixed',
    total: bill.total || 0,
    paymentMethod: bill.paymentMethod || 'cash',
    paymentStatus: bill.paymentStatus || 'pending',
    paidAt: bill.paidAt || null,
    notes: bill.notes ? sanitizeInput(bill.notes) : '',
    generatedBy: bill.generatedBy,
    generatedByName: sanitizeInput(bill.generatedByName || 'system'),
    restaurantId: bill.restaurantId || null,
    restaurantName: bill.restaurantName || '',
    branchId: bill.branchId || null,
    branchName: bill.branchName || '',
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
  };
};

// ============================================================
//  ─── STAFF BILLS ENDPOINT ────────────────────────────────────
// ============================================================

export const getStaffBills = async (req, res) => {
  try {
    const staff = req.staff;
    console.log('📊 Fetching staff bills for:', staff?.name);
    console.log('📊 Staff restaurantId:', staff?.restaurantId);
    console.log('📊 Staff branchId:', staff?.branchId);

    const filter = {};

    if (staff?.restaurantId) {
      filter.restaurantId = staff.restaurantId;
    }

    if (staff?.branchId) {
      filter.branchId = staff.branchId;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const search = req.query.search || '';
    const paymentStatus = req.query.paymentStatus || 'pending';

    if (search && search.length > 0) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        { billNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { orderNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { customerName: { $regex: sanitizedSearch, $options: 'i' } },
        { tableNumber: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    if (paymentStatus) {
      if (!isValidPaymentStatus(paymentStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUS.join(', ')}`,
        });
      }
      filter.paymentStatus = paymentStatus;
    }

    console.log('🔍 Staff bills filter:', JSON.stringify(filter, null, 2));

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Bill.countDocuments(filter),
    ]);

    console.log(`✅ Found ${bills.length} bills for staff`);

    const sanitizedBills = bills.map(bill => sanitizeBill(bill));

    return res.json({
      success: true,
      data: {
        bills: sanitizedBills,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: bills.length,
        staff: {
          name: staff.name,
          employeeId: staff.employeeId,
          role: staff.roleName || staff.role?.name || 'Staff',
        }
      },
    });
  } catch (err) {
    console.error('[GET /api/bills/staff] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch staff bills: ' + err.message,
    });
  }
};

// ─── GET PENDING BILLS COUNT ──────────────────────────────────────────
export const getPendingBillsCount = async (req, res) => {
  try {
    const staff = req.staff;
    const filter = { paymentStatus: 'pending' };
    
    if (staff?.restaurantId) {
      filter.restaurantId = staff.restaurantId;
    }
    if (staff?.branchId) {
      filter.branchId = staff.branchId;
    }
    
    const count = await Bill.countDocuments(filter);
    const totalAmount = await Bill.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]).then(result => result[0]?.total || 0);
    
    return res.json({
      success: true,
      data: { count, totalAmount }
    });
  } catch (err) {
    console.error('[GET /api/bills/pending-count] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get pending bills count'
    });
  }
};

// ============================================================
//  ─── ADMIN BILLS ENDPOINTS ──────────────────────────────────
// ============================================================

export const getBills = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search || '';
    const paymentStatus = req.query.paymentStatus;
    const orderType = req.query.orderType;

    const filter = {};

    if (search && search.length > 0) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$text = { $search: sanitizedSearch };
    }

    if (paymentStatus) {
      if (!isValidPaymentStatus(paymentStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUS.join(', ')}`,
        });
      }
      filter.paymentStatus = paymentStatus;
    }

    if (orderType) {
      const allowedTypes = ['dine-in', 'takeaway', 'delivery'];
      if (!allowedTypes.includes(orderType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid order type. Allowed: ${allowedTypes.join(', ')}`,
        });
      }
      filter.orderType = orderType;
    }

    console.log('📊 Fetching bills with filter:', filter);

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Bill.countDocuments(filter),
    ]);

    const sanitizedBills = bills.map(bill => sanitizeBill(bill));

    return res.json({
      success: true,
      data: {
        bills: sanitizedBills,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: bills.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/bills] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bills',
    });
  }
};

export const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bill ID format',
      });
    }

    const bill = await Bill.findById(id).lean();
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizeBill(bill),
    });
  } catch (err) {
    console.error('[GET /api/bills/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bill',
    });
  }
};

export const getBillByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const bill = await Bill.findOne({ orderId }).lean();
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'No bill found for this order',
      });
    }

    return res.json({
      success: true,
      data: sanitizeBill(bill),
    });
  } catch (err) {
    console.error('[GET /api/bills/by-order/:orderId] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bill',
    });
  }
};

// ─── GENERATE BILL WITH BROADCAST ─────────────────────────────────────
export const generateBill = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot generate bill for a cancelled order',
      });
    }

    if (order.orderStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Order must be completed before generating bill',
      });
    }

    const existing = await Bill.findOne({ orderId: order._id }).lean();
    if (existing) {
      return res.json({
        success: true,
        data: sanitizeBill(existing),
        message: 'Bill already exists',
      });
    }

    const billNumber = await generateBillNumber(0);
    const generatedBy = req.staff?._id || req.user?._id || 'system';
    const staffName = req.staff?.name || req.user?.firstName || 'system';

    let branchId = order.branchId || null;
    let branchName = order.branchName || '';
    let restaurantId = order.restaurantId || null;
    let restaurantName = order.restaurantName || '';

    if (order.items && order.items.length > 0) {
      const firstItem = order.items[0];
      if (firstItem.branchId) {
        branchId = firstItem.branchId;
        branchName = firstItem.branchName || branchName;
        restaurantId = firstItem.restaurantId || restaurantId;
        restaurantName = firstItem.restaurantName || restaurantName;
        console.log(`📍 Bill using branch from items: ${branchName}`);
      }
    }

    const billData = {
      billNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableId: order.tableId || null,
      tableNumber: order.tableNumber || '',
      customerName: sanitizeInput(order.customerName || ''),
      customerPhone: order.customerPhone || '',
      customerAddress: sanitizeInput(order.customerAddress || ''),
      items: order.items?.map(item => ({
        productId: item.productId,
        productName: sanitizeInput(item.productName || ''),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes ? sanitizeInput(item.notes) : '',
        roundNumber: item.roundNumber || 1,
        personName: item.personName ? sanitizeInput(item.personName) : '',
        seatNumber: item.seatNumber || 0,
        branchId: item.branchId || branchId,
        branchName: item.branchName || branchName,
        restaurantId: item.restaurantId || restaurantId,
        restaurantName: item.restaurantName || restaurantName,
      })) || [],
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      taxRate: order.taxRate || 5,
      discount: order.discount || 0,
      discountType: order.discountType || 'fixed',
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: order.paymentStatus === 'paid' ? 'paid' : 'pending',
      paidAt: order.paymentStatus === 'paid' ? new Date() : null,
      notes: order.notes ? sanitizeInput(order.notes) : '',
      generatedBy: generatedBy,
      generatedByName: sanitizeInput(staffName),
      restaurantId: restaurantId,
      restaurantName: restaurantName,
      branchId: branchId,
      branchName: branchName,
    };

    const bill = await Bill.create(billData);

    // ✅ BROADCAST NEW BILL TO ALL CONNECTED CLIENTS
    const sanitizedBill = sanitizeBill(bill);
    broadcastBillUpdate(sanitizedBill);

    console.log(`✅ Bill ${billNumber} generated for order ${order.orderNumber} by ${staffName}`);
    console.log(`📊 Bill restaurant: ${bill.restaurantName || 'Not set'}`);
    console.log(`📍 Bill branch: ${bill.branchName || 'Not set'}`);

    return res.status(201).json({
      success: true,
      data: sanitizedBill,
      message: 'Bill generated successfully',
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.billNumber) {
      console.warn('[generateBill] Duplicate billNumber, retrying...');
    }
    console.error('[POST /api/bills/generate/:orderId] ERROR:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate bill',
    });
  }
};

export const generateBillForStaff = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot generate bill for a cancelled order',
      });
    }

    if (order.orderStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Order must be completed before generating bill',
      });
    }

    const existing = await Bill.findOne({ orderId: order._id }).lean();
    if (existing) {
      return res.json({
        success: true,
        data: sanitizeBill(existing),
        message: 'Bill already exists',
      });
    }

    const billNumber = await generateBillNumber(0);
    const generatedBy = req.staff?._id || 'system';
    const staffName = req.staff?.name || 'Staff';

    const billData = {
      billNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableId: order.tableId || null,
      tableNumber: order.tableNumber || '',
      customerName: sanitizeInput(order.customerName || ''),
      customerPhone: order.customerPhone || '',
      customerAddress: sanitizeInput(order.customerAddress || ''),
      items: order.items?.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName || ''),
        notes: item.notes ? sanitizeInput(item.notes) : '',
        personName: item.personName ? sanitizeInput(item.personName) : '',
        restaurantId: order.restaurantId || null,
        restaurantName: order.restaurantName || '',
        branchId: order.branchId || null,
        branchName: order.branchName || '',
      })) || [],
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      taxRate: order.taxRate || 5,
      discount: order.discount || 0,
      discountType: order.discountType || 'fixed',
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: order.paymentStatus === 'paid' ? 'paid' : 'pending',
      paidAt: order.paymentStatus === 'paid' ? new Date() : null,
      notes: order.notes ? sanitizeInput(order.notes) : '',
      generatedBy: generatedBy,
      generatedByName: sanitizeInput(staffName),
      restaurantId: order.restaurantId || null,
      restaurantName: order.restaurantName || '',
      branchId: order.branchId || null,
      branchName: order.branchName || '',
    };

    const bill = await Bill.create(billData);

    // ✅ BROADCAST NEW BILL TO ALL CONNECTED CLIENTS
    const sanitizedBill = sanitizeBill(bill);
    broadcastBillUpdate(sanitizedBill);

    console.log(`✅ Bill ${billNumber} generated for order ${order.orderNumber} by staff ${staffName}`);
    console.log(`📊 Bill restaurant: ${bill.restaurantName || 'Not set'}`);
    console.log(`📍 Bill branch: ${bill.branchName || 'Not set'}`);

    return res.status(201).json({
      success: true,
      data: sanitizedBill,
      message: 'Bill generated successfully by staff',
    });
  } catch (err) {
    console.error('[POST /api/bills/staff/generate/:orderId] ERROR:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate bill',
    });
  }
};

export const updateBillPayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bill ID format',
      });
    }

    const { paymentMethod, paymentStatus } = req.body;

    if (!paymentMethod || !paymentStatus) {
      return res.status(400).json({
        success: false,
        error: 'paymentMethod and paymentStatus are required',
      });
    }

    if (!isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      });
    }

    if (!isValidPaymentStatus(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUS.join(', ')}`,
      });
    }

    const updateFields = {
      paymentMethod,
      paymentStatus,
      paidAt: paymentStatus === 'paid' ? new Date() : null,
    };

    const bill = await Bill.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
    }

    console.log(`💰 [BILL PAYMENT] Bill ${bill.billNumber} updated to ${paymentStatus}`);

    // ✅ BROADCAST PAYMENT UPDATE
    const sanitizedBill = sanitizeBill(bill);
    broadcastPaymentUpdate(sanitizedBill);

    const updatedOrder = await Order.findByIdAndUpdate(
      bill.orderId,
      { $set: { paymentMethod, paymentStatus } },
      { new: true }
    ).lean();

    if (paymentStatus === 'paid' && updatedOrder?.tableId) {
      const freedTable = await Table.findByIdAndUpdate(
        updatedOrder.tableId,
        {
          status: 'available',
          currentOrderId: null,
        },
        { new: true }
      );
      
      if (freedTable) {
        console.log(`✅ [TABLE FREE] Table ${freedTable.number} is now AVAILABLE`);
      }
    }

    return res.json({
      success: true,
      data: sanitizedBill,
      message: 'Payment updated successfully',
    });
  } catch (err) {
    console.error('[PATCH /api/bills/:id/payment] ERROR:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment',
    });
  }
};

export const refundBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bill ID format',
      });
    }

    const bill = await Bill.findById(id).lean();
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
    }

    if (bill.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        error: 'Bill already refunded',
      });
    }

    if (bill.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Only paid bills can be refunded',
      });
    }

    const updatedBill = await Bill.findByIdAndUpdate(
      id,
      { $set: { paymentStatus: 'refunded' } },
      { new: true, runValidators: true }
    ).lean();

    // ✅ BROADCAST REFUND UPDATE
    const sanitizedBill = sanitizeBill(updatedBill);
    broadcastPaymentUpdate(sanitizedBill);

    await Order.findByIdAndUpdate(bill.orderId, {
      $set: { paymentStatus: 'refunded' },
    });

    console.log(`🔄 [REFUND] Bill ${bill.billNumber} marked as refunded`);

    return res.json({
      success: true,
      data: sanitizedBill,
      message: 'Bill marked as refunded successfully',
    });
  } catch (err) {
    console.error('[DELETE /api/bills/:id] ERROR:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to refund bill',
    });
  }
};