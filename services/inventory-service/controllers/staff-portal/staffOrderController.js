// controllers/staff-portal/ordersStaffController.js - COMPLETE FIXED WITH BILL GENERATION

import Order from '../../models/Order.js';
import Dish from '../../models/Dish.js';
import Category from '../../models/Category.js';
import KOT from '../../models/KOT.js';
import Table from '../../models/Table.js';
import Bill from '../../models/Bill.js';
import { generateBillForOrder } from '../orderController.js'; // ✅ IMPORT BILL GENERATION
import { 
  isValidObjectId, 
  isValidText, 
  isValidPrice, 
  isValidQuantity,
  isValidOrderStatus,
  isValidOrderType,
  isValidPaymentStatus,
  MAX_ITEMS_PER_ORDER,
  ALLOWED_ORDER_STATUS,
  ALLOWED_ORDER_TYPES,
  ALLOWED_PAYMENT_STATUS,
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

// ============================================================
//  ─── CONSTANTS ──────────────────────────────────────────────
// ============================================================

const MAX_ORDERS_PER_REQUEST = 1000;
const MAX_ITEMS_PER_ORDER_SA = 50;
const ALLOWED_ORDER_STATUSES = ALLOWED_ORDER_STATUS;
const ALLOWED_ORDER_TYPES_SA = ALLOWED_ORDER_TYPES;
const ALLOWED_PAYMENT_STATUSES = ALLOWED_PAYMENT_STATUS;
const KITCHEN_ROLES = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'];
const WAITER_ROLES = ['waiter', 'cashier'];
const MANAGER_ROLES = ['manager', 'admin', 'superadmin'];

// ============================================================
//  ─── HELPER FUNCTIONS ──────────────────────────────────────
// ============================================================

const getUserRole = (staff) => {
  if (!staff) return '';
  return staff?.role?.name || staff?.roleName || staff?.primaryRole || staff?.role || '';
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

const generateKotNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const last = await KOT.findOne({ 
    kotNumber: { $regex: `^KOT-${dateStr}` } 
  }).sort({ createdAt: -1 });
  const seq = last ? parseInt(last.kotNumber.split('-').pop()) + 1 : 1;
  return `KOT-${dateStr}-${seq.toString().padStart(4, '0')}`;
};

// ─── Auto-create KOT ──────────────────────────────────────────
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
    console.log(`✅ KOT ${kot.kotNumber} created for order ${order.orderNumber}`);
    return kot;
  } catch (err) {
    console.error('❌ KOT creation failed:', err.message);
    return null;
  }
};

// ============================================================
//  ─── CONTROLLER FUNCTIONS ─────────────────────────────────
// ============================================================

// ─── GET /api/staff/orders/ready ────────────────────────────
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

// ─── PATCH /api/staff/orders/:orderId/serve ──────────────────
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

    order.orderStatus = 'completed';
    order.servedBy = staff._id;
    order.servedByName = staff.name || 'Staff';
    order.servedAt = new Date();
    order.completedBy = 'waiter';
    order.completedAt = new Date();

    await order.save();

    // ✅ GENERATE BILL WHEN ORDER IS SERVED/COMPLETED
    let generatedBill = null;
    try {
      generatedBill = await generateBillForOrder(order, staff._id || 'system');
      if (generatedBill) {
        console.log(`✅ Bill ${generatedBill.billNumber} generated for served order ${order.orderNumber}`);
      }
    } catch (billError) {
      console.error('❌ Failed to generate bill for served order:', billError);
    }

    if (order.tableId && order.orderType === 'dine-in') {
      try {
        await Table.findByIdAndUpdate(order.tableId, {
          status: 'available',
          currentOrderId: null,
        });
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

    console.log(`✅ Order ${order.orderNumber} served by ${order.servedByName}`);

    return res.json({
      success: true,
      data: {
        order,
        bill: generatedBill || null,
      },
      message: `✅ Order ${order.orderNumber} served by ${order.servedByName}!${generatedBill ? ` Bill ${generatedBill.billNumber} generated.` : ''}`
    });
  } catch (error) {
    console.error('[PATCH /staff/orders/:id/serve] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to serve order'
    });
  }
};

// ─── GET /api/staff/orders ──────────────────────────────────
const getStaffOrders = async (req, res) => {
  try {
    const staff = req.staff;
    const { limit = 100, status, orderType, search, showAll } = req.query;

    const filter = {};

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      const validStatuses = statuses.filter(s => ALLOWED_ORDER_STATUSES.includes(s));
      if (validStatuses.length > 0) {
        filter.orderStatus = validStatuses.length === 1 ? validStatuses[0] : { $in: validStatuses };
      }
    }

    if (orderType && ALLOWED_ORDER_TYPES_SA.includes(orderType)) {
      filter.orderType = orderType;
    }

    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        { orderNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { customerName: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    if (staff.branchId) {
      filter.$or = [
        { branchId: staff.branchId },
        { branchId: null },
        { branchId: { $exists: false } }
      ];
    }

    const parsedLimit = Math.min(parseInt(limit) || 100, MAX_ORDERS_PER_REQUEST);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .lean();

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

// ─── GET /api/staff/orders/:orderId ──────────────────────────
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;

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

// ─── POST /api/staff/orders ──────────────────────────────────
const createStaffOrder = async (req, res) => {
  try {
    const staff = req.staff;
    const { 
      orderType, items, subtotal, tax, discount, discountType, 
      total, notes, tableId, tableNumber, customerName, customerPhone 
    } = req.body;

    console.log('📝 Creating staff order:', { orderType, itemsCount: items?.length });

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

    const orderNumber = await generateOrderNumber();

    const orderData = {
      orderNumber,
      orderType: orderType || 'dine-in',
      tableId: tableId || null,
      tableNumber: tableNumber || '',
      customerName: customerName ? sanitizeInput(customerName.trim()) : 'Guest',
      customerPhone: customerPhone || '',
      items: items.map(item => ({
        productId: item.productId,
        productName: sanitizeInput(item.productName),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || item.quantity * item.unitPrice,
        notes: item.notes ? sanitizeInput(item.notes) : '',
        prepTimeMinutes: item.prepTimeMinutes || 15,
        roundNumber: 1,
        orderedAt: new Date(),
      })),
      subtotal: subtotal || 0,
      tax: tax || 0,
      taxRate: 5,
      discount: discount || 0,
      discountType: discountType || 'fixed',
      total: total || 0,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      notes: notes ? sanitizeInput(notes.trim()) : '',
      createdBy: staff._id,
      restaurantId: staff.restaurantId || null,
      restaurantName: staff.restaurantName || '',
      branchId: staff.branchId || null,
      branchName: staff.branchName || '',
      kitchenAcknowledged: false,
      currentRound: 1,
      isVip: false,
      servedBy: staff._id,
      servedByName: staff.name,
    };

    const order = await Order.create(orderData);
    console.log(`✅ Order ${order.orderNumber} created by staff ${staff.name}`);

    // Auto-create KOT
    try {
      await autoCreateKOT(order, items);
    } catch (kotError) {
      console.error('❌ KOT creation failed:', kotError);
    }

    if (orderType === 'dine-in' && tableId) {
      try {
        await Table.findByIdAndUpdate(tableId, {
          status: 'occupied',
          currentOrderId: order._id,
        });
      } catch (tableError) {
        console.warn('Could not update table status:', tableError.message);
      }
    }

    res.status(201).json({
      success: true,
      data: order,
      message: `Order ${order.orderNumber} created successfully!`,
    });
  } catch (error) {
    console.error('❌ Error creating staff order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order: ' + error.message,
    });
  }
};

// ─── PATCH /api/staff/orders/:orderId/status ──────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const staff = req.staff;

    console.log(`📝 [STAFF] updateOrderStatus:`, { orderId, status });

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    if (!status || !ALLOWED_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${ALLOWED_ORDER_STATUSES.join(', ')}`,
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const userRole = getUserRole(staff);
    const isKitchen = isKitchenRole(userRole);
    const isManager = isManagerRole(userRole);

    if (isKitchen && !isManager && status === 'completed') {
      return res.status(403).json({
        success: false,
        error: 'Kitchen staff cannot complete orders.',
      });
    }

    // Update order
    order.orderStatus = status;
    order.updatedAt = new Date();
    
    if (status === 'ready') order.readyAt = new Date();
    if (status === 'completed') {
      order.completedAt = new Date();
      order.completedBy = staff._id;
      order.completedByName = staff.name;
    }
    if (status === 'preparing') order.prepStartedAt = new Date();
    if (status === 'confirmed') order.confirmedAt = new Date();

    await order.save();

    // ✅ GENERATE BILL WHEN ORDER IS COMPLETED
    let generatedBill = null;
    if (status === 'completed') {
      try {
        generatedBill = await generateBillForOrder(order, staff._id || 'system');
        if (generatedBill) {
          console.log(`✅ Bill ${generatedBill.billNumber} generated for completed order ${order.orderNumber}`);
        }
      } catch (billError) {
        console.error('❌ Failed to generate bill for completed order:', billError);
      }
    }

    // Free table if dine-in and completed
    if (status === 'completed' && order.tableId && order.orderType === 'dine-in') {
      try {
        await Table.findByIdAndUpdate(order.tableId, {
          status: 'available',
          currentOrderId: null,
        });
      } catch (tableError) {
        console.warn('Could not free table:', tableError.message);
      }
    }

    // Update KOT status
    if (status === 'ready' || status === 'completed') {
      await KOT.updateMany(
        { orderId: order._id },
        { status: status === 'ready' ? 'ready' : 'served' }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        order,
        bill: generatedBill || null,
      },
      message: `Order ${order.orderNumber} status updated to ${status}${generatedBill ? ` and bill ${generatedBill.billNumber} generated` : ''}`,
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status: ' + error.message,
    });
  }
};

// ─── PATCH /api/staff/orders/:orderId/request-bill ──────────────
const requestBill = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;

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

    // Generate bill if not exists
    let bill = await Bill.findOne({ orderId: order._id });
    if (!bill) {
      try {
        bill = await generateBillForOrder(order, staff._id || 'system');
      } catch (err) {
        console.error('Failed to generate bill:', err);
      }
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

    res.status(200).json({
      success: true,
      data: {
        order: updatedOrder,
        bill: bill || null,
      },
      message: `Bill ${bill?.billNumber || 'requested'} successfully.`,
    });
  } catch (error) {
    console.error('❌ Error requesting bill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request bill',
    });
  }
};

// ─── POST /api/staff/orders/:orderId/generate-bill ──────────────
const generateBillForStaffOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;

    console.log(`📊 [STAFF] Generating bill for order: ${orderId}`);

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

    // Generate bill using the admin controller function
    const bill = await generateBillForOrder(order, staff._id || 'system');

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

// ─── GET /api/staff/menu ──────────────────────────────────────
const getStaffMenu = async (req, res) => {
  try {
    const staff = req.staff;
    const { category, search, limit = 100 } = req.query;

    const filter = { isActive: true };

    if (category && category !== 'all') {
      filter.categoryId = category;
    }

    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const dishes = await Dish.find(filter)
      .populate('categoryId')
      .limit(Math.min(parseInt(limit) || 100, 500))
      .sort({ name: 1 })
      .lean();

    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        dishes,
        categories,
        total: dishes.length,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching staff menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu',
    });
  }
};

// ─── PATCH /api/staff/orders/:orderId/cancel ──────────────────
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const staff = req.staff;

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
          cancellationReason: reason || 'Cancelled by staff',
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

// ─── PATCH /api/staff/orders/:orderId/kitchen-acknowledge ──────
const kitchenAcknowledgeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const staff = req.staff;

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

// ─── POST /api/staff/orders/:orderId/request-ready ──────────────
const requestReady = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const staff = req.staff;

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

// ============================================================
//  ─── ✅ EXPORT ALL FUNCTIONS ──────────────────────────────
// ============================================================

export {
  getStaffOrders,
  getOrderDetails,
  createStaffOrder,
  updateOrderStatus,
  requestBill,
  getStaffMenu,
  cancelOrder,
  kitchenAcknowledgeOrder,
  requestReady,
  getStaffReadyOrders,
  serveStaffOrder,
  generateBillForStaffOrder,  // ✅ EXPORT THE GENERATE BILL FUNCTION
};