// models/Table.js - UPDATED with branch fields

import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema(
  {
    // ─── Basic Info ──────────────────────────────────────────────────────
    number: { type: String, required: true, unique: true, trim: true },
    name: { type: String, default: '' },
    
    // ─── Location ────────────────────────────────────────────────────────
    floorId: { type: String, required: true },
    floorName: { type: String, required: true },
    
    // ─── Branch & Restaurant ────────────────────────────────────────────
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
    
    // ─── Table Details ──────────────────────────────────────────────────
    capacity: { type: Number, default: 4, min: 1, max: 20 },
    shape: { type: String, enum: ['round', 'square', 'rectangle'], default: 'square' },
    status: { type: String, enum: ['available', 'occupied', 'reserved', 'maintenance'], default: 'available' },
    
    // ─── Positioning ────────────────────────────────────────────────────
    positionX: { type: Number, default: 0 },
    positionY: { type: Number, default: 0 },
    width: { type: Number, default: 80 },
    height: { type: Number, default: 80 },
    
    // ─── QR & Pricing ────────────────────────────────────────────────────
    qrCode: { type: String, default: '' },
    minOrderAmount: { type: Number, default: 0 },
    coverCharge: { type: Number, default: 0 },
    
    // ─── Status ──────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    currentOrderId: { type: String, default: null },
    reservedFor: { type: String, default: '' },
    reservedTime: { type: Date, default: null },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────
tableSchema.index({ number: 'text', floorId: 1, status: 1 });
tableSchema.index({ branchId: 1, restaurantId: 1 });

export default mongoose.model('Table', tableSchema);