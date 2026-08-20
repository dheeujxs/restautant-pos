// controllers/kotController.js
import KOT from '../models/KOT.js';
import Order from '../models/Order.js';
import { syncOrderStatusFromKOT } from './orderController.js';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  isValidQuantity,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_ITEMS_PER_KOT = 50;
const MAX_KOT_STATIONS = ['Main Kitchen', 'Tandoor', 'Bar', 'Cold Kitchen', 'Bakery', 'Grill', 'Sushi', 'Pizza', 'Dessert'];
const ALLOWED_ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'];
const ALLOWED_KOT_STATUS = ['new', 'acknowledged', 'preparing', 'partially_ready', 'ready', 'served', 'cancelled'];
const ALLOWED_ITEM_STATUS = ['pending', 'cooking', 'done', 'voided'];
const ALLOWED_PRIORITY = ['normal', 'urgent', 'vip'];
const MAX_PREP_TIME = 240; // 4 hours
const MIN_PREP_TIME = 1;
const DELAY_THRESHOLD_MINUTES = 20;

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Validate KOT number format
const isValidKotNumber = (kotNumber) => {
  if (!kotNumber) return false;
  return /^KOT-\d{8}-\d{4}$/.test(kotNumber);
};

// Validate KOT station
const isValidKotStation = (station) => {
  if (!station) return false;
  return MAX_KOT_STATIONS.includes(station);
};

// Validate order type
const isValidOrderType = (type) => {
  if (!type) return false;
  return ALLOWED_ORDER_TYPES.includes(type);
};

// Validate KOT status
const isValidKOTStatus = (status) => {
  if (!status) return false;
  return ALLOWED_KOT_STATUS.includes(status);
};

// Validate item status
const isValidItemStatus = (status) => {
  if (!status) return false;
  return ALLOWED_ITEM_STATUS.includes(status);
};

// Validate priority
const isValidPriority = (priority) => {
  if (!priority) return true;
  return ALLOWED_PRIORITY.includes(priority);
};

// Validate prep time
const isValidPrepTime = (minutes) => {
  if (minutes === undefined || minutes === null) return true;
  if (!Number.isInteger(minutes)) return false;
  if (minutes < MIN_PREP_TIME) return false;
  if (minutes > MAX_PREP_TIME) return false;
  return true;
};

// Validate covers
const isValidCovers = (covers) => {
  if (covers === undefined || covers === null) return true;
  if (!Number.isInteger(covers)) return false;
  if (covers < 1) return false;
  if (covers > 100) return false;
  return true;
};

// Validate item notes
const isValidItemNotes = (notes) => {
  if (!notes) return true;
  const trimmed = notes.trim();
  if (trimmed.length > 200) return false;
  return true;
};

// Derive KOT status from items
const deriveStatus = (items) => {
  if (!items || items.length === 0) return 'new';
  const s = items.map(i => i.status);
  if (s.every(x => x === 'done')) return 'ready';
  if (s.every(x => x === 'pending')) return 'new';
  if (s.some(x => x === 'done')) return 'partially_ready';
  return 'preparing';
};

// Enrich KOT with calculated fields
const enrichKOT = (kot) => {
  if (!kot) return null;
  const elapsedMinutes = Math.floor((Date.now() - new Date(kot.createdAt).getTime()) / 60000);
  const isDelayed = elapsedMinutes > DELAY_THRESHOLD_MINUTES && 
    !['ready', 'served', 'cancelled'].includes(kot.status);
  
  return {
    ...kot,
    elapsedMinutes,
    isDelayed,
    totalItems: kot.items?.length || 0,
    doneItems: kot.items?.filter(i => i.status === 'done').length || 0,
    progressPercent: kot.items?.length > 0 
      ? Math.round((kot.items.filter(i => i.status === 'done').length / kot.items.length) * 100)
      : 0,
  };
};

// Sanitize KOT for response
const sanitizeKOT = (kot) => {
  if (!kot) return null;
  return {
    _id: kot._id,
    id: kot._id,
    kotNumber: kot.kotNumber,
    orderId: kot.orderId,
    orderNumber: kot.orderNumber,
    orderType: kot.orderType,
    tableId: kot.tableId || null,
    tableNumber: kot.tableNumber || '',
    floorName: sanitizeInput(kot.floorName || ''),
    covers: kot.covers || 1,
    waiterId: kot.waiterId || null,
    waiterName: sanitizeInput(kot.waiterName || ''),
    kotStation: kot.kotStation,
    platform: kot.platform || '',
    deliveryOrderId: kot.deliveryOrderId || '',
    riderETA: kot.riderETA || null,
    items: kot.items?.map(item => ({
      _id: item._id,
      productId: item.productId,
      productName: sanitizeInput(item.productName || ''),
      quantity: item.quantity,
      notes: item.notes ? sanitizeInput(item.notes) : '',
      status: item.status,
      cookingStartedAt: item.cookingStartedAt,
      doneAt: item.doneAt,
      prepTimeMinutes: item.prepTimeMinutes || 15,
    })) || [],
    priority: kot.priority || 'normal',
    allergyAlerts: kot.allergyAlerts?.map(a => sanitizeInput(a)) || [],
    notes: kot.notes ? sanitizeInput(kot.notes) : '',
    kotPrinted: kot.kotPrinted || false,
    isReprint: kot.isReprint || false,
    targetReadyAt: kot.targetReadyAt,
    createdBy: kot.createdBy,
    isVip: kot.isVip || false,
    status: kot.status,
    prepStartedAt: kot.prepStartedAt,
    readyAt: kot.readyAt,
    servedAt: kot.servedAt,
    createdAt: kot.createdAt,
    updatedAt: kot.updatedAt,
    elapsedMinutes: kot.elapsedMinutes || 0,
    isDelayed: kot.isDelayed || false,
  };
};

// Generate KOT number with retry
const generateKotNumber = async (retryCount = 0) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `KOT-${dateStr}-`;
  
  const last = await KOT.findOne(
    { kotNumber: { $regex: `^${prefix}` } },
    { kotNumber: 1 }
  ).sort({ kotNumber: -1 }).lean();
  
  const seq = (last ? parseInt(last.kotNumber.slice(-4), 10) : 0) + 1 + retryCount;
  return `${prefix}${seq.toString().padStart(4, '0')}`;
};

// ============================================================
//  KOT CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Fix inconsistent KOT status
// @route   PATCH /api/kots/:id/fix-status
// @access  Private (Kitchen Staff)
// ──────────────────────────────────────────────────────────────────────────

export const fixKOTStatus = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid KOT ID format',
      });
    }

    // ─── FIND KOT ──────────────────────────────────────────────────────
    const kot = await KOT.findById(id);
    if (!kot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }

    // ─── CHECK KOT STATUS ──────────────────────────────────────────────
    if (kot.status === 'ready') {
      const allDone = kot.items.every(item => item.status === 'done');

      if (!allDone) {
        const now = new Date();
        kot.items = kot.items.map(item => ({
          ...item,
          status: 'done',
          doneAt: now,
        }));

        await kot.save();

        const order = await Order.findById(kot.orderId);
        if (order && !['completed', 'cancelled'].includes(order.orderStatus)) {
          await Order.findByIdAndUpdate(kot.orderId, { 
            orderStatus: 'ready' 
          });
          console.log(`✅ Order ${order.orderNumber} status synced to 'ready'`);
        }

        return res.json({
          success: true,
          data: sanitizeKOT(enrichKOT(kot)),
          message: 'All items marked as done. Status fixed!'
        });
      }

      return res.json({
        success: true,
        data: sanitizeKOT(enrichKOT(kot)),
        message: 'Status is already consistent'
      });
    }

    // ─── CHECK IF ALL ITEMS DONE ──────────────────────────────────────
    const allDone = kot.items.every(item => item.status === 'done');
    if (allDone && kot.status !== 'ready') {
      kot.status = 'ready';
      kot.readyAt = new Date();
      await kot.save();

      const order = await Order.findById(kot.orderId);
      if (order && !['completed', 'cancelled'].includes(order.orderStatus)) {
        await Order.findByIdAndUpdate(kot.orderId, { 
          orderStatus: 'ready' 
        });
        console.log(`✅ Order ${order.orderNumber} status synced to 'ready'`);
      }

      return res.json({
        success: true,
        data: sanitizeKOT(enrichKOT(kot)),
        message: 'KOT marked as ready because all items are done!'
      });
    }

    return res.json({
      success: true,
      data: sanitizeKOT(enrichKOT(kot)),
      message: 'No fixes needed'
    });
  } catch (err) {
    console.error('[PATCH /api/kots/:id/fix-status] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fix KOT status',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all KOTs
// @route   GET /api/kots
// @access  Private (Staff)
// ──────────────────────────────────────────────────────────────────────────

export const getKOTs = async (req, res) => {
  try {
    // ─── VALIDATE QUERY PARAMS ──────────────────────────────────────────
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const { status, kotStation, priority, orderId, activeOnly, showAll, search } = req.query;

    // Validate status
    if (status && !isValidKOTStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${ALLOWED_KOT_STATUS.join(', ')}`,
      });
    }

    // Validate priority
    if (priority && !isValidPriority(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Allowed: ${ALLOWED_PRIORITY.join(', ')}`,
      });
    }

    // Validate KOT station
    if (kotStation && !isValidKotStation(kotStation)) {
      return res.status(400).json({
        success: false,
        error: `Invalid KOT station. Allowed: ${MAX_KOT_STATIONS.join(', ')}`,
      });
    }

    // ─── BUILD FILTER ──────────────────────────────────────────────────
    const filter = {};

    if (showAll === 'true') {
      console.log('📋 Showing ALL KOTs (showAll=true)');
    } else if (status) {
      filter.status = status;
    } else if (activeOnly === 'true') {
      filter.status = { $nin: ['served', 'cancelled'] };
    }

    if (kotStation) filter.kotStation = kotStation;
    if (priority) filter.priority = priority;
    if (orderId) {
      if (!isValidObjectId(orderId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid order ID format',
        });
      }
      filter.orderId = orderId;
    }

    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        { kotNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { orderNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { tableNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { waiterName: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    // ─── SORTING ──────────────────────────────────────────────────────────
    const sortStage = {};
    if (req.query.kitchenView === 'true') {
      sortStage.status = 1;
      sortStage.priorityScore = -1;
      sortStage.createdAt = 1;
    } else {
      sortStage.priorityScore = -1;
      sortStage.createdAt = -1;
    }

    // ─── FETCH KOTs ──────────────────────────────────────────────────────
    const [kots, total] = await Promise.all([
      KOT.find(filter)
        .sort(sortStage)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      KOT.countDocuments(filter),
    ]);

    // ─── ENRICH & SANITIZE RESPONSE ────────────────────────────────────
    const enrichedKots = kots.map(kot => sanitizeKOT(enrichKOT(kot)));

    return res.json({
      success: true,
      data: {
        kots: enrichedKots,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: kots.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/kots] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch KOTs',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get kitchen queue
// @route   GET /api/kots/queue
// @access  Private (Kitchen Staff)
// ──────────────────────────────────────────────────────────────────────────

export const getKitchenQueue = async (req, res) => {
  try {
    // ─── FETCH ACTIVE KOTs ──────────────────────────────────────────────
    const activeKOTs = await KOT.find({
      status: { $in: ['new', 'acknowledged', 'preparing', 'partially_ready'] }
    }).sort({ priorityScore: -1, createdAt: 1 }).lean();

    // ─── BUILD QUEUE ─────────────────────────────────────────────────────
    const allItems = [];
    for (const kot of activeKOTs) {
      for (const item of kot.items) {
        if (item.status === 'pending') {
          let itemPriority = 'normal';
          if (kot.isVip) itemPriority = 'vip';
          else if (kot.priority === 'urgent') itemPriority = 'urgent';

          allItems.push({
            kotId: kot._id,
            kotNumber: kot.kotNumber,
            orderNumber: kot.orderNumber,
            tableNumber: kot.tableNumber,
            itemId: item._id,
            productName: sanitizeInput(item.productName),
            quantity: item.quantity,
            prepTimeMinutes: Math.min(item.prepTimeMinutes || 15, MAX_PREP_TIME),
            priority: itemPriority,
            priorityScore: (kot.isVip ? 100 : 0) + (kot.priority === 'urgent' ? 50 : 0),
            createdAt: kot.createdAt,
            notes: item.notes ? sanitizeInput(item.notes) : '',
            isVip: kot.isVip,
          });
        }
      }
    }

    // ─── SORT QUEUE ──────────────────────────────────────────────────────
    allItems.sort((a, b) => {
      if (a.priority === 'vip' && b.priority !== 'vip') return -1;
      if (a.priority !== 'vip' && b.priority === 'vip') return 1;
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
      if (a.prepTimeMinutes !== b.prepTimeMinutes) return a.prepTimeMinutes - b.prepTimeMinutes;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // ─── CALCULATE SUMMARY ──────────────────────────────────────────────
    const totalPending = allItems.length;
    const vipCount = allItems.filter(i => i.priority === 'vip').length;
    const urgentCount = allItems.filter(i => i.priority === 'urgent').length;
    const avgPrepTime = totalPending > 0 
      ? Math.round(allItems.reduce((s, i) => s + i.prepTimeMinutes, 0) / totalPending)
      : 0;

    return res.json({
      success: true,
      data: {
        queue: allItems,
        summary: {
          totalPending,
          vipCount,
          urgentCount,
          averagePrepTime: avgPrepTime,
          estimatedWaitTime: totalPending * avgPrepTime,
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/kots/queue] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get kitchen queue',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get KOT by ID
// @route   GET /api/kots/:id
// @access  Private (Staff)
// ──────────────────────────────────────────────────────────────────────────

export const getKOTById = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid KOT ID format',
      });
    }

    // ─── FETCH KOT ──────────────────────────────────────────────────────
    const kot = await KOT.findById(id).lean();
    if (!kot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizeKOT(enrichKOT(kot)),
    });
  } catch (err) {
    console.error('[GET /api/kots/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch KOT',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get KOTs by order
// @route   GET /api/kots/order/:orderId
// @access  Private (Staff)
// ──────────────────────────────────────────────────────────────────────────

export const getKOTsByOrder = async (req, res) => {
  try {
    // ─── VALIDATE ORDER ID ──────────────────────────────────────────────
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    // ─── FETCH KOTs ──────────────────────────────────────────────────────
    const kots = await KOT.find({ orderId })
      .sort({ createdAt: 1 })
      .lean();

    const enrichedKots = kots.map(kot => sanitizeKOT(enrichKOT(kot)));

    return res.json({
      success: true,
      data: enrichedKots,
      count: kots.length,
    });
  } catch (err) {
    console.error('[GET /api/kots/order/:orderId] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch KOTs for order',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create KOT
// @route   POST /api/kots
// @access  Private (Staff)
// ──────────────────────────────────────────────────────────────────────────

export const createKOT = async (req, res) => {
  try {
    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const body = sanitizeObject(req.body);

    // ─── VALIDATE REQUIRED FIELDS ──────────────────────────────────────
    const required = ['orderId', 'orderNumber', 'orderType', 'kotStation', 'items'];
    for (const field of required) {
      if (!body[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`,
        });
      }
    }

    // ─── VALIDATE ORDER ID ──────────────────────────────────────────────
    if (!isValidObjectId(body.orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }

    // ─── VALIDATE ORDER TYPE ────────────────────────────────────────────
    if (!isValidOrderType(body.orderType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order type. Allowed: ${ALLOWED_ORDER_TYPES.join(', ')}`,
      });
    }

    // ─── VALIDATE KOT STATION ──────────────────────────────────────────
    if (!isValidKotStation(body.kotStation)) {
      return res.status(400).json({
        success: false,
        error: `Invalid KOT station. Allowed: ${MAX_KOT_STATIONS.join(', ')}`,
      });
    }

    // ─── VALIDATE ITEMS ──────────────────────────────────────────────────
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one item is required',
      });
    }

    if (body.items.length > MAX_ITEMS_PER_KOT) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_ITEMS_PER_KOT} items allowed per KOT`,
      });
    }

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (!item.productId || !item.productName || !item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: productId, productName, and quantity are required`,
        });
      }
      
      if (!isValidObjectId(item.productId)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Invalid product ID format`,
        });
      }

      if (!isValidQuantity(item.quantity)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Invalid quantity. Must be between 1 and 999`,
        });
      }

      if (item.notes && !isValidItemNotes(item.notes)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Notes cannot exceed 200 characters`,
        });
      }

      if (item.prepTimeMinutes && !isValidPrepTime(item.prepTimeMinutes)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i + 1}: Prep time must be between ${MIN_PREP_TIME} and ${MAX_PREP_TIME} minutes`,
        });
      }
    }

    // ─── VALIDATE PRIORITY ──────────────────────────────────────────────
    if (body.priority && !isValidPriority(body.priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Allowed: ${ALLOWED_PRIORITY.join(', ')}`,
      });
    }

    // ─── VALIDATE COVERS ──────────────────────────────────────────────────
    if (body.covers && !isValidCovers(body.covers)) {
      return res.status(400).json({
        success: false,
        error: 'Covers must be between 1 and 100',
      });
    }

    // ─── CHECK ORDER ──────────────────────────────────────────────────────
    const order = await Order.findById(body.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // ─── GENERATE KOT NUMBER ────────────────────────────────────────────
    const kotNumber = await generateKotNumber();
    const maxPrep = body.items.reduce((m, i) => Math.max(m, i.prepTimeMinutes || 15), 0);

    // ─── CREATE KOT ──────────────────────────────────────────────────────
    const kotData = {
      kotNumber,
      orderId: body.orderId,
      orderNumber: body.orderNumber,
      orderType: body.orderType,
      tableId: body.tableId || null,
      tableNumber: body.tableNumber || '',
      floorName: body.floorName ? sanitizeInput(body.floorName) : '',
      covers: body.covers || 1,
      waiterId: body.waiterId || null,
      waiterName: body.waiterName ? sanitizeInput(body.waiterName) : '',
      kotStation: body.kotStation,
      platform: body.platform || '',
      deliveryOrderId: body.deliveryOrderId || '',
      riderETA: body.riderETA || null,
      items: body.items.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName),
        notes: item.notes ? sanitizeInput(item.notes) : '',
        prepTimeMinutes: Math.min(item.prepTimeMinutes || 15, MAX_PREP_TIME),
        status: 'pending',
      })),
      priority: body.priority || 'normal',
      allergyAlerts: body.allergyAlerts?.map(a => sanitizeInput(a)) || [],
      notes: body.notes ? sanitizeInput(body.notes) : '',
      kotPrinted: body.kotPrinted || false,
      isReprint: body.isReprint || false,
      targetReadyAt: new Date(Date.now() + maxPrep * 60000),
      createdBy: req.user?._id || null,
      isVip: order.isVip || false,
    };

    const kot = await KOT.create(kotData);

    // ─── UPDATE ORDER ────────────────────────────────────────────────────
    await Order.findByIdAndUpdate(body.orderId, { $set: { kotPrinted: true } });

    return res.status(201).json({
      success: true,
      data: sanitizeKOT(enrichKOT(kot)),
      message: 'KOT created successfully',
    });
  } catch (err) {
    console.error('[POST /api/kots] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to create KOT',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update KOT status
// @route   PATCH /api/kots/:id/status
// @access  Private (Kitchen Staff)
// ──────────────────────────────────────────────────────────────────────────

export const updateKOTStatus = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid KOT ID format',
      });
    }

    // ─── VALIDATE REQUEST BODY ─────────────────────────────────────────
    const { status, priority, notes } = req.body;

    if (status && !isValidKOTStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${ALLOWED_KOT_STATUS.join(', ')}`,
      });
    }

    if (priority && !isValidPriority(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Allowed: ${ALLOWED_PRIORITY.join(', ')}`,
      });
    }

    if (notes && !isValidText(notes, 500)) {
      return res.status(400).json({
        success: false,
        error: 'Notes cannot exceed 500 characters',
      });
    }

    // ─── FIND KOT ──────────────────────────────────────────────────────
    const kot = await KOT.findById(id);
    if (!kot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }

    // ─── ROLE-BASED STATUS UPDATE ──────────────────────────────────────
    const userRole = req.staff?.role?.name || req.staff?.roleName || '';
    const isKitchen = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'].includes(userRole?.toLowerCase());

    // Kitchen cannot mark as served
    if (status === 'served' && isKitchen) {
      return res.status(403).json({
        success: false,
        error: '❌ Kitchen staff cannot mark KOT as served. Only waiters can.',
      });
    }

    // ─── UPDATE KOT ──────────────────────────────────────────────────────
    const now = new Date();
    const $set = {};

    if (status) $set.status = status;
    if (priority) $set.priority = priority;
    if (notes !== undefined) $set.notes = sanitizeInput(notes);

    if (status === 'preparing') {
      $set.prepStartedAt = now;
      $set['items.$[].cookingStartedAt'] = now;
    }
    if (status === 'ready') {
      $set.readyAt = now;
      $set['items.$[].status'] = 'done';
      $set['items.$[].doneAt'] = now;
    }
    if (status === 'served') {
      $set.servedAt = now;
    }

    const updatedKot = await KOT.findByIdAndUpdate(
      id,
      { $set },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedKot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }

    // ─── CALCULATE ACTUAL PREP TIME ────────────────────────────────────
    if (status === 'served' && updatedKot.prepStartedAt) {
      const prepTime = Math.floor((now - new Date(updatedKot.prepStartedAt).getTime()) / 60000);
      await KOT.findByIdAndUpdate(id, { 
        actualPrepTimeMinutes: Math.min(prepTime, MAX_PREP_TIME) 
      });
    }

    console.log(`📌 KOT ${updatedKot.kotNumber} updated to status: ${updatedKot.status}`);

    // ─── SYNC ORDER STATUS ──────────────────────────────────────────────
    if (status === 'ready') {
      await syncOrderStatusFromKOT(updatedKot);
    }

    return res.json({
      success: true,
      data: sanitizeKOT(enrichKOT(updatedKot)),
      message: `KOT status updated to ${status}`,
    });
  } catch (err) {
    console.error('[PATCH /api/kots/:id/status] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update KOT status',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update individual item status
// @route   PATCH /api/kots/:id/items/:itemId/status
// @access  Private (Kitchen Staff)
// ──────────────────────────────────────────────────────────────────────────

export const updateItemStatus = async (req, res) => {
  try {
    // ─── VALIDATE IDS ────────────────────────────────────────────────────
    const { id, itemId } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
      });
    }

    // ─── VALIDATE STATUS ─────────────────────────────────────────────────
    const { status } = req.body;
    if (!status || !isValidItemStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid item status. Allowed: ${ALLOWED_ITEM_STATUS.join(', ')}`,
      });
    }

    // ─── FIND AND UPDATE ITEM ──────────────────────────────────────────
    const now = new Date();
    const $set = { 'items.$.status': status };
    
    if (status === 'cooking') $set['items.$.cookingStartedAt'] = now;
    if (status === 'done') $set['items.$.doneAt'] = now;

    const kot = await KOT.findOneAndUpdate(
      { _id: id, 'items._id': itemId },
      { $set },
      { new: true }
    );

    if (!kot) {
      return res.status(404).json({
        success: false,
        error: 'KOT or item not found',
      });
    }

    // ─── DERIVE OVERALL STATUS ──────────────────────────────────────────
    const overall = deriveStatus(kot.items);
    const update = { status: overall };
    if (overall === 'ready' && !kot.readyAt) update.readyAt = now;

    const updated = await KOT.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();

    // ─── SYNC ORDER STATUS ──────────────────────────────────────────────
    if (overall === 'ready') {
      await syncOrderStatusFromKOT(updated);
    }

    return res.json({
      success: true,
      data: sanitizeKOT(enrichKOT(updated)),
      message: `Item status updated to ${status}`,
    });
  } catch (err) {
    console.error('[PATCH /api/kots/:id/items/:itemId/status] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update item status',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Mark KOT as printed
// @route   PATCH /api/kots/:id/printed
// @access  Private (Kitchen Staff)
// ──────────────────────────────────────────────────────────────────────────

export const markKOTPrinted = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid KOT ID format',
      });
    }

    // ─── UPDATE KOT ──────────────────────────────────────────────────────
    const kot = await KOT.findByIdAndUpdate(
      id,
      { 
        $set: { 
          kotPrinted: true, 
          kotPrintedAt: new Date() 
        } 
      },
      { new: true, runValidators: true }
    ).lean();

    if (!kot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizeKOT(enrichKOT(kot)),
      message: 'KOT marked as printed',
    });
  } catch (err) {
    console.error('[PATCH /api/kots/:id/printed] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark KOT as printed',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Cancel KOT
// @route   PATCH /api/kots/:id/cancel
// @access  Private (Manager/Admin)
// ──────────────────────────────────────────────────────────────────────────

export const cancelKOT = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid KOT ID format',
      });
    }

    // ─── VALIDATE REASON ─────────────────────────────────────────────────
    const { reason } = req.body;
    if (reason && !isValidText(reason, 500)) {
      return res.status(400).json({
        success: false,
        error: 'Reason cannot exceed 500 characters',
      });
    }

    // ─── FIND AND CANCEL KOT ─────────────────────────────────────────────
    const kot = await KOT.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: 'cancelled',
          notes: reason ? `CANCELLED: ${sanitizeInput(reason)}` : 'Cancelled'
        } 
      },
      { new: true, runValidators: true }
    ).lean();

    if (!kot) {
      return res.status(404).json({
        success: false,
        error: 'KOT not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizeKOT(enrichKOT(kot)),
      message: 'KOT cancelled successfully',
    });
  } catch (err) {
    console.error('[PATCH /api/kots/:id/cancel] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel KOT',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get kitchen stats
// @route   GET /api/kots/stats
// @access  Private (Kitchen Staff)
// ──────────────────────────────────────────────────────────────────────────

export const getKitchenStats = async (req, res) => {
  try {
    // ─── FETCH STATS ──────────────────────────────────────────────────────
    const [total, newK, preparing, ready, delayed, vipPending] = await Promise.all([
      KOT.countDocuments({ status: { $nin: ['served', 'cancelled'] } }),
      KOT.countDocuments({ status: 'new' }),
      KOT.countDocuments({ status: { $in: ['acknowledged', 'preparing', 'partially_ready'] } }),
      KOT.countDocuments({ status: 'ready' }),
      KOT.countDocuments({ 
        status: { $nin: ['ready', 'served', 'cancelled'] }, 
        createdAt: { $lt: new Date(Date.now() - DELAY_THRESHOLD_MINUTES * 60000) } 
      }),
      KOT.countDocuments({ 
        isVip: true, 
        status: { $nin: ['ready', 'served', 'cancelled'] } 
      }),
    ]);

    // ─── CALCULATE AVERAGE PREP TIME ──────────────────────────────────
    const avgPrepResult = await KOT.aggregate([
      { $match: { status: 'served', actualPrepTimeMinutes: { $exists: true } } },
      { $group: { _id: null, avgPrepTime: { $avg: '$actualPrepTimeMinutes' } } }
    ]);

    const averagePrepTime = avgPrepResult.length > 0 
      ? Math.round(avgPrepResult[0].avgPrepTime) 
      : 0;

    return res.json({
      success: true,
      data: {
        total,
        new: newK,
        preparing,
        ready,
        delayed,
        vipPending,
        averagePrepTime,
        utilizationRate: total > 0 ? Math.round((preparing / total) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('[GET /api/kots/stats] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch kitchen stats',
    });
  }
};