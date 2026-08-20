// routes/billRoutes.js

import express from 'express';
import {
  getBills,
  getBillById,
  getBillByOrderId,
  generateBill,
  generateBillForStaff,
  updateBillPayment,
  refundBill,
  getStaffBills,  // ✅ Add this import
} from '../controllers/billController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import { protectStaff } from '../middleware/staffAuthMiddleware.js';

const router = express.Router();

// ─── STAFF ROUTES (Must come before admin routes) ────────────────────
router.get('/staff', protectStaff, getStaffBills);  // ✅ Staff bills endpoint
router.post('/staff/generate/:orderId', protectStaff, generateBillForStaff);

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────
router.get('/', protect, isAdmin, getBills);
router.get('/:id', protect, isAdmin, getBillById);
router.get('/by-order/:orderId', protect, isAdmin, getBillByOrderId);
router.post('/generate/:orderId', protect, isAdmin, generateBill);
router.patch('/:id/payment', protect, isAdmin, updateBillPayment);
router.delete('/:id', protect, isAdmin, refundBill);

export default router;