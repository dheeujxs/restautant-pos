// controllers/purchaseController.js
import Purchase from '../models/Purchase.js';
import Ingredient from '../models/Ingredient.js';
import Supplier from '../models/Supplier.js';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  isValidPhone,
  isValidEmail,
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

const MAX_ITEMS_PER_PURCHASE = 100;
const MAX_PURCHASE_AMOUNT = 10000000; // ₹1 Crore
const MIN_PURCHASE_AMOUNT = 0;
const ALLOWED_PURCHASE_STATUS = ['pending', 'ordered', 'partially_received', 'received', 'cancelled'];
const ALLOWED_PAYMENT_STATUS = ['unpaid', 'partial', 'paid'];
const ALLOWED_PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank_transfer', 'cheque'];
const MAX_INVOICE_LENGTH = 50;
const MAX_QUANTITY = 99999;
const MAX_COST_PRICE = 999999;

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Generate unique purchase number
const generatePurchaseNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const count = await Purchase.countDocuments() + 1;
  return `PO-${year}${month}-${count.toString().padStart(4, '0')}`;
};

// Validate purchase status
const isValidPurchaseStatus = (status) => {
  if (!status) return false;
  return ALLOWED_PURCHASE_STATUS.includes(status);
};

// Validate payment status
const isValidPaymentStatus = (status) => {
  if (!status) return false;
  return ALLOWED_PAYMENT_STATUS.includes(status);
};

// Validate payment method
const isValidPaymentMethod = (method) => {
  if (!method) return true;
  return ALLOWED_PAYMENT_METHODS.includes(method);
};

// Validate invoice number
const isValidInvoiceNumber = (invoice) => {
  if (!invoice) return true;
  const trimmed = invoice.trim();
  if (trimmed.length > MAX_INVOICE_LENGTH) return false;
  // Only allow safe characters
  const invoiceRegex = /^[a-zA-Z0-9\-_/.]+$/;
  return invoiceRegex.test(trimmed);
};

// Validate purchase item
const validatePurchaseItem = (item, index) => {
  const errors = [];
  
  if (!item.ingredientId || !isValidObjectId(item.ingredientId)) {
    errors.push(`Item ${index + 1}: Invalid ingredient ID`);
  }
  
  if (!item.ingredientName || item.ingredientName.length > 100) {
    errors.push(`Item ${index + 1}: Invalid ingredient name`);
  }
  
  if (!isValidQuantity(item.quantity) || item.quantity > MAX_QUANTITY) {
    errors.push(`Item ${index + 1}: Quantity must be between 1 and ${MAX_QUANTITY}`);
  }
  
  if (!isValidPrice(item.costPrice) || item.costPrice > MAX_COST_PRICE) {
    errors.push(`Item ${index + 1}: Cost price must be between 0 and ${MAX_COST_PRICE}`);
  }
  
  if (item.unit && item.unit.length > 20) {
    errors.push(`Item ${index + 1}: Unit cannot exceed 20 characters`);
  }
  
  return errors;
};

// Sanitize purchase for response
const sanitizePurchase = (purchase) => {
  if (!purchase) return null;
  return {
    _id: purchase._id,
    id: purchase._id,
    purchaseNumber: purchase.purchaseNumber,
    supplierId: purchase.supplierId,
    supplierName: sanitizeInput(purchase.supplierName || ''),
    purchaseDate: purchase.purchaseDate,
    invoiceNumber: purchase.invoiceNumber || '',
    items: purchase.items?.map(item => ({
      ingredientId: item.ingredientId,
      ingredientName: sanitizeInput(item.ingredientName || ''),
      quantity: item.quantity,
      unit: item.unit || '',
      costPrice: item.costPrice,
      lineTotal: item.lineTotal || 0,
    })) || [],
    subtotal: purchase.subtotal || 0,
    tax: purchase.tax || 0,
    taxRate: purchase.taxRate || 0,
    discount: purchase.discount || 0,
    discountType: purchase.discountType || 'fixed',
    totalAmount: purchase.totalAmount || 0,
    status: purchase.status || 'pending',
    paymentStatus: purchase.paymentStatus || 'unpaid',
    paymentMethod: purchase.paymentMethod || 'cash',
    notes: sanitizeInput(purchase.notes || ''),
    createdBy: purchase.createdBy,
    receivedBy: purchase.receivedBy,
    receivedAt: purchase.receivedAt,
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
};

// ============================================================
//  PURCHASE CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const getPurchases = async (req, res) => {
  try {
    // ─── VALIDATE QUERY PARAMS ──────────────────────────────────────────
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search || '';
    const status = req.query.status || '';
    const paymentStatus = req.query.paymentStatus || '';
    const supplierId = req.query.supplierId || '';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const filter = {};

    // Search filter (sanitized)
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$or = [
        { purchaseNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { invoiceNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { supplierName: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    // Status filter
    if (status) {
      if (!isValidPurchaseStatus(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid purchase status. Allowed: ${ALLOWED_PURCHASE_STATUS.join(', ')}`,
        });
      }
      filter.status = status;
    }

    // Payment status filter
    if (paymentStatus) {
      if (!isValidPaymentStatus(paymentStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUS.join(', ')}`,
        });
      }
      filter.paymentStatus = paymentStatus;
    }

    // Supplier filter
    if (supplierId) {
      if (!isValidObjectId(supplierId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid supplier ID format',
        });
      }
      filter.supplierId = supplierId;
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid start date format',
        });
      }
      filter.purchaseDate = { $gte: start };
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid end date format',
        });
      }
      end.setHours(23, 59, 59, 999);
      if (filter.purchaseDate) {
        filter.purchaseDate.$lte = end;
      } else {
        filter.purchaseDate = { $lte: end };
      }
    }

    // ─── FETCH PURCHASES ──────────────────────────────────────────────────
    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate('supplierId', 'supplierName phoneNumber email')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(filter),
    ]);

    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedPurchases = purchases.map(sanitizePurchase);

    // ─── CALCULATE STATISTICS ────────────────────────────────────────────
    const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const receivedCount = purchases.filter(p => p.status === 'received').length;
    const pendingCount = purchases.filter(p => p.status === 'pending' || p.status === 'ordered').length;

    return res.json({
      success: true,
      data: {
        purchases: sanitizedPurchases,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: purchases.length,
        summary: {
          totalAmount,
          receivedCount,
          pendingCount,
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/purchases] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchases',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get single purchase
// @route   GET /api/purchases/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const getPurchaseById = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purchase ID format',
      });
    }

    // ─── FETCH PURCHASE ──────────────────────────────────────────────────
    const purchase = await Purchase.findById(id)
      .populate('supplierId', 'supplierName phoneNumber email')
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found',
      });
    }

    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    return res.json({
      success: true,
      data: sanitizePurchase(purchase),
    });
  } catch (err) {
    console.error('[GET /api/purchases/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create purchase order
// @route   POST /api/purchases
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const createPurchase = async (req, res) => {
  try {
    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const body = sanitizeObject(req.body);
    const createdBy = req.user?._id || req.staff?._id;

    // ─── VALIDATE SUPPLIER ──────────────────────────────────────────────
    if (!body.supplierId) {
      return res.status(400).json({
        success: false,
        error: 'Supplier is required',
      });
    }

    if (!isValidObjectId(body.supplierId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid supplier ID format',
      });
    }

    const supplier = await Supplier.findById(body.supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found',
      });
    }

    // ─── VALIDATE ITEMS ──────────────────────────────────────────────────
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one item is required',
      });
    }

    if (body.items.length > MAX_ITEMS_PER_PURCHASE) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_ITEMS_PER_PURCHASE} items allowed per purchase`,
      });
    }

    // ─── VALIDATE INVOICE NUMBER ────────────────────────────────────────
    if (body.invoiceNumber && !isValidInvoiceNumber(body.invoiceNumber)) {
      return res.status(400).json({
        success: false,
        error: `Invalid invoice number. Max ${MAX_INVOICE_LENGTH} characters. Only letters, numbers, hyphens, underscores, dots, and slashes are allowed.`,
      });
    }

    // ─── VALIDATE PAYMENT METHOD ─────────────────────────────────────────
    if (body.paymentMethod && !isValidPaymentMethod(body.paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      });
    }

    // ─── VALIDATE NOTES ──────────────────────────────────────────────────
    if (body.notes && !isValidText(body.notes, MAX_NOTES_LENGTH)) {
      return res.status(400).json({
        success: false,
        error: `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`,
      });
    }

    // ─── PROCESS ITEMS ──────────────────────────────────────────────────
    let totalAmount = 0;
    const items = [];
    const errors = [];

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      
      // Validate item
      const itemErrors = validatePurchaseItem(item, i);
      if (itemErrors.length > 0) {
        errors.push(...itemErrors);
        continue;
      }

      // Get ingredient details
      const ingredient = await Ingredient.findById(item.ingredientId);
      if (!ingredient) {
        errors.push(`Item ${i + 1}: Ingredient not found`);
        continue;
      }

      const quantity = parseFloat(item.quantity) || 0;
      const costPrice = parseFloat(item.costPrice) || 0;
      const lineTotal = quantity * costPrice;
      totalAmount += lineTotal;

      items.push({
        ingredientId: item.ingredientId,
        ingredientName: sanitizeInput(ingredient.name),
        quantity: quantity,
        unit: ingredient.unit || item.unit || 'unit',
        costPrice: costPrice,
        lineTotal: lineTotal,
        notes: item.notes ? sanitizeInput(item.notes) : '',
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    if (totalAmount > MAX_PURCHASE_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Total amount exceeds maximum limit of ₹${MAX_PURCHASE_AMOUNT.toLocaleString()}`,
      });
    }

    // ─── CREATE PURCHASE ──────────────────────────────────────────────────
    const purchaseNumber = await generatePurchaseNumber();

    const purchaseData = {
      purchaseNumber,
      supplierId: body.supplierId,
      supplierName: sanitizeInput(supplier.supplierName),
      purchaseDate: body.purchaseDate || new Date(),
      invoiceNumber: body.invoiceNumber ? sanitizeInput(body.invoiceNumber.trim()) : '',
      items,
      subtotal: totalAmount,
      tax: body.tax || 0,
      taxRate: body.taxRate || 0,
      discount: body.discount || 0,
      discountType: body.discountType || 'fixed',
      totalAmount: totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: body.paymentMethod || 'cash',
      notes: body.notes ? sanitizeInput(body.notes.trim()) : '',
      createdBy,
    };

    const purchase = await Purchase.create(purchaseData);

    // ─── POPULATE FOR RESPONSE ──────────────────────────────────────────
    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate('supplierId', 'supplierName phoneNumber email')
      .lean();

    return res.status(201).json({
      success: true,
      data: sanitizePurchase(populatedPurchase),
      message: 'Purchase order created successfully',
    });
  } catch (err) {
    console.error('[POST /api/purchases] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Purchase with this number already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create purchase',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Receive purchase order (update stock)
// @route   POST /api/purchases/:id/receive
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const receivePurchase = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purchase ID format',
      });
    }

    // ─── FIND PURCHASE ──────────────────────────────────────────────────
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found',
      });
    }

    if (purchase.status === 'received') {
      return res.status(400).json({
        success: false,
        error: 'Purchase already received',
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot receive a cancelled purchase',
      });
    }

    console.log(`[RECEIVE] Processing purchase ${purchase.purchaseNumber} with ${purchase.items.length} items`);

    // ─── UPDATE STOCK ──────────────────────────────────────────────────
    const stockUpdates = [];
    const stockErrors = [];

    for (const item of purchase.items) {
      if (!item.ingredientId) {
        stockErrors.push({
          ingredientName: item.ingredientName || 'Unknown',
          error: 'Ingredient ID missing',
        });
        continue;
      }

      const ingredient = await Ingredient.findById(item.ingredientId);
      if (!ingredient) {
        stockErrors.push({
          ingredientName: item.ingredientName || 'Unknown',
          error: 'Ingredient not found',
        });
        continue;
      }

      const oldStock = ingredient.currentStock || 0;
      const newStock = oldStock + item.quantity;

      ingredient.currentStock = newStock;
      await ingredient.save();

      stockUpdates.push({
        name: ingredient.name,
        oldStock,
        newStock,
        added: item.quantity,
        unit: ingredient.unit || 'unit',
      });

      console.log(`[STOCK] ${ingredient.name}: ${oldStock} → ${newStock} (+${item.quantity} ${ingredient.unit})`);
    }

    // ─── UPDATE PURCHASE ──────────────────────────────────────────────
    purchase.status = 'received';
    purchase.receivedAt = new Date();
    purchase.receivedBy = req.user?._id || req.staff?._id;
    await purchase.save();

    return res.json({
      success: true,
      data: {
        purchase: sanitizePurchase(purchase),
        stockUpdates,
        stockErrors: stockErrors.length > 0 ? stockErrors : undefined,
      },
      message: `Purchase order received and stock updated for ${stockUpdates.length} item(s)${stockErrors.length > 0 ? ` (${stockErrors.length} errors)` : ''}`,
    });
  } catch (err) {
    console.error('[POST /api/purchases/:id/receive] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to receive purchase',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update purchase status
// @route   PATCH /api/purchases/:id/status
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const updatePurchaseStatus = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purchase ID format',
      });
    }

    // ─── VALIDATE STATUS ──────────────────────────────────────────────────
    const { status } = req.body;
    if (!status || !isValidPurchaseStatus(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid purchase status. Allowed: ${ALLOWED_PURCHASE_STATUS.join(', ')}`,
      });
    }

    // ─── FIND AND UPDATE ──────────────────────────────────────────────────
    const purchase = await Purchase.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizePurchase(purchase),
      message: `Purchase status updated to ${status}`,
    });
  } catch (err) {
    console.error('[PATCH /api/purchases/:id/status] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update purchase status',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update payment status
// @route   PATCH /api/purchases/:id/payment
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const updatePurchasePayment = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purchase ID format',
      });
    }

    // ─── VALIDATE PAYMENT DATA ──────────────────────────────────────────
    const { paymentStatus, paymentMethod, paidAmount } = req.body;

    if (!paymentStatus || !isValidPaymentStatus(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment status. Allowed: ${ALLOWED_PAYMENT_STATUS.join(', ')}`,
      });
    }

    if (paymentMethod && !isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      });
    }

    if (paidAmount !== undefined) {
      if (!isValidPrice(paidAmount)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid paid amount',
        });
      }
    }

    // ─── FIND AND UPDATE ──────────────────────────────────────────────────
    const purchase = await Purchase.findByIdAndUpdate(
      id,
      {
        $set: {
          paymentStatus,
          paymentMethod: paymentMethod || 'cash',
          ...(paidAmount !== undefined && { paidAmount }),
          ...(paymentStatus === 'paid' && { paidAt: new Date() }),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizePurchase(purchase),
      message: `Payment status updated to ${paymentStatus}`,
    });
  } catch (err) {
    console.error('[PATCH /api/purchases/:id/payment] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

// controllers/purchaseController.js - FIXED deletePurchase

export const deletePurchase = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purchase ID format',
      });
    }

    // ─── FIND PURCHASE ──────────────────────────────────────────────────
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found',
      });
    }

    // ─── CHECK IF CAN DELETE ──────────────────────────────────────────
    if (purchase.status === 'received') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a received purchase. Please reverse stock first.',
      });
    }

    // ─── DELETE PURCHASE ──────────────────────────────────────────────────
    await Purchase.findByIdAndDelete(id);

    console.log(`✅ Purchase ${purchase.purchaseNumber} deleted successfully`);

    return res.json({
      success: true,
      message: `Purchase ${purchase.purchaseNumber} deleted successfully`,
      data: { deletedId: id }
    });
  } catch (err) {
    console.error('[DELETE /api/purchases/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete purchase: ' + err.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete purchases
// @route   DELETE /api/purchases/bulk
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeletePurchases = async (req, res) => {
  try {
    // ─── VALIDATE INPUT ──────────────────────────────────────────────────
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of purchase IDs',
      });
    }
    
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 purchases can be deleted at once',
      });
    }
    
    // ─── VALIDATE ALL IDs ──────────────────────────────────────────────
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ID format: ${invalidIds.join(', ')}`,
      });
    }
    
    // ─── CHECK FOR RECEIVED PURCHASES ──────────────────────────────────
    const receivedPurchases = await Purchase.find({
      _id: { $in: ids },
      status: 'received',
    }).select('purchaseNumber');
    
    if (receivedPurchases.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete received purchases: ${receivedPurchases.map(p => p.purchaseNumber).join(', ')}`,
      });
    }
    
    // ─── DELETE PURCHASES ──────────────────────────────────────────────────
    const result = await Purchase.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No purchases found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} purchases deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    console.error('[DELETE /api/purchases/bulk] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete purchases',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get purchase statistics
// @route   GET /api/purchases/stats
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const getPurchaseStats = async (req, res) => {
  try {
    // ─── FETCH STATS ──────────────────────────────────────────────────────
    const [totalPurchases, pendingPurchases, receivedPurchases, totalSpent] = await Promise.all([
      Purchase.countDocuments(),
      Purchase.countDocuments({ status: { $in: ['pending', 'ordered'] } }),
      Purchase.countDocuments({ status: 'received' }),
      Purchase.aggregate([
        { $match: { status: 'received' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
    ]);

    // ─── GET RECENT PURCHASES ────────────────────────────────────────────
    const recentPurchases = await Purchase.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('supplierId', 'supplierName')
      .lean();

    return res.json({
      success: true,
      data: {
        totalPurchases,
        pendingPurchases,
        receivedPurchases,
        totalSpent: totalSpent[0]?.total || 0,
        recentPurchases: recentPurchases.map(p => ({
          _id: p._id,
          purchaseNumber: p.purchaseNumber,
          supplierName: sanitizeInput(p.supplierName || ''),
          totalAmount: p.totalAmount,
          status: p.status,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (err) {
    console.error('[GET /api/purchases/stats] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase stats',
    });
  }
};