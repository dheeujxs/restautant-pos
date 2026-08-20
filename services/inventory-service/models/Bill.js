// models/Bill.js - COMPLETE UPDATED VERSION WITH ITEM BRANCH FIELDS

import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema({
  productId:   { type: String, default: '' },
  productName: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  unitPrice:   { type: Number, required: true, min: 0 },
  totalPrice:  { type: Number, required: true, min: 0 },
  notes:       { type: String, default: '' },
  roundNumber: { type: Number, default: 1 },
  personName:  { type: String, default: '' },
  seatNumber:  { type: Number, default: 0 },
  // ✅ Add branch fields to items
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    index: true,
  },
  branchName: {
    type: String,
    default: '',
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    index: true,
  },
  restaurantName: {
    type: String,
    default: '',
  },
}, { _id: true });

const billSchema = new mongoose.Schema(
  {
    billNumber:   { type: String, required: true, unique: true },

    // ── Linked Order ──────────────────────────────────────────────
    orderId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    orderNumber:  { type: String, required: true },

    // ── Order Meta ────────────────────────────────────────────────
    orderType:    { type: String, enum: ['dine-in', 'takeaway', 'delivery'], required: true },
    tableId:      { type: String, default: null },
    tableNumber:  { type: String, default: '' },

    // ── Customer ──────────────────────────────────────────────────
    customerName:    { type: String, default: '' },
    customerPhone:   { type: String, default: '' },
    customerAddress: { type: String, default: '' },

    // ── Line Items ────────────────────────────────────────────────
    items: [billItemSchema],

    // ── Amounts ───────────────────────────────────────────────────
    subtotal:     { type: Number, required: true, min: 0 },
    tax:          { type: Number, required: true, min: 0 },
    taxRate:      { type: Number, default: 5 },
    discount:     { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
    total:        { type: Number, required: true, min: 0 },

    // ── Payment ───────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'online'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    paidAt: { type: Date, default: null },

    // ─── Restaurant & Branch ───────────────────────────────────
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      index: true,
    },
    restaurantName: {
      type: String,
      default: '',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    branchName: {
      type: String,
      default: '',
    },

    // ── Meta ──────────────────────────────────────────────────────
    notes:       { type: String, default: '' },
    generatedBy: { type: String, default: 'system' },
    generatedByName: { type: String, default: 'system' },
  },
  { timestamps: true }
);

billSchema.index({ billNumber: 'text', customerName: 'text', orderNumber: 'text' });
billSchema.index({ restaurantId: 1 });
billSchema.index({ branchId: 1 });

export default mongoose.model('Bill', billSchema);