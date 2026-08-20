// models/Order.js - Complete updated version

import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  notes: { type: String, default: '' },
  prepTimeMinutes: { type: Number, default: 15 },
  customerEmail: { type: String, default: '' },
  roundNumber: { type: Number, default: 1 },
  seatNumber: { type: Number, default: 0 },
  personName: { type: String, default: '' },
  orderedAt: { type: Date, default: Date.now },
  restaurantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Restaurant',
    index: true 
  },
  restaurantName: { type: String, default: '' },
  branchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Restaurant.branches',
    index: true 
  },
  branchName: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    // ─── Basic Order Info ──────────────────────────────────────────────
    orderNumber: { type: String, required: true, unique: true },
    orderType: { type: String, enum: ['dine-in', 'takeaway', 'delivery'], required: true },
    tableId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Table',
      default: null 
    },
    tableNumber: { type: String, default: '' },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerLandmark: { type: String, default: '' },
    items: [orderItemSchema],
    
    // ─── Amounts ────────────────────────────────────────────────────────
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxRate: { type: Number, default: 5 },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
    total: { type: Number, default: 0 },
    
    // ─── Payment ───────────────────────────────────────────────────────
    paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'online'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    
    // ─── Order Status ──────────────────────────────────────────────────
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending'
    },
    kitchenAcknowledged: { type: Boolean, default: false },
    kitchenAcknowledgedAt: { type: Date, default: null },
    kotPrinted: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    createdBy: { type: String, required: true },
    
    // ─── Serving (Waiter) ──────────────────────────────────────────────
    servedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    servedByName: { type: String },
    servedAt: { type: Date },
    
    // ─── Multi-round ────────────────────────────────────────────────────
    currentRound: { type: Number, default: 1 },
    billRequested: { type: Boolean, default: false },
    billRequestedAt: { type: Date, default: null },
    
    // ─── VIP ────────────────────────────────────────────────────────────
    isVip: { type: Boolean, default: false },
    vipNotes: { type: String, default: '' },
    orderPriority: {
      type: String,
      enum: ['vip', 'normal', 'urgent'],
      default: 'normal'
    },
    
    // ─── Ready Request ──────────────────────────────────────────────────
    readyRequested: { type: Boolean, default: false },
    readyRequestedAt: { type: Date, default: null },
    readyNotes: { type: String, default: '' },
    readyRejectedAt: { type: Date, default: null },
    readyRejectionReason: { type: String, default: '' },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // ─── DELIVERY SPECIFIC FIELDS ──────────────────────────────────────
    // ✅ Fixed: Removed default: null and made it optional
    deliveryStatus: {
      type: String,
      enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'ready_for_pickup'],
      required: false,
      index: true,
    },
    restaurantName: { type: String, default: '' },
    restaurantAddress: { type: String, default: '' },
    restaurantPhone: { type: String, default: '' },
    distance: { type: Number, default: 0 },
    estimatedTime: { type: Number, default: 0 },
    deliveryInstructions: { type: String, default: '' },
    
    // ─── Delivery Boy ───────────────────────────────────────────────────
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    riderName: { type: String, default: '' },
    assignedAt: { type: Date },
    pickedUpAt: { type: Date },
    inTransitAt: { type: Date },
    deliveredAt: { type: Date },
    
    // ─── Delivery Boy Completion ───────────────────────────────────────
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    deliveredByName: { type: String },
    completedBy: { type: String, enum: ['waiter', 'delivery_boy', 'manager'] },
    
    // ─── Restaurant & Branch ───────────────────────────────────────────
    restaurantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Restaurant',
      index: true 
    },
    branchId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Restaurant.branches',
      index: true 
    },
    branchName: { type: String, default: '' },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────
orderSchema.index({ orderNumber: 'text', customerName: 'text', customerPhone: 'text' });
orderSchema.index({ riderId: 1, deliveryStatus: 1 });
orderSchema.index({ orderStatus: 1, orderType: 1 });
orderSchema.index({ restaurantId: 1 });
orderSchema.index({ branchId: 1 });

export default mongoose.model('Order', orderSchema);