// routes/kotRoutes.js
import express from 'express';
import {
  getKOTs,
  getKOTById,
  getKOTsByOrder,
  createKOT,
  updateKOTStatus,
  updateItemStatus,
  markKOTPrinted,
  fixKOTStatus,
  cancelKOT,
  getKitchenStats,
  getKitchenQueue,
} from '../controllers/kotController.js';
import { protect } from '../middleware/authMiddleware.js';
import { protectStaff, authorizeStaffRoles } from '../middleware/staffAuthMiddleware.js';

const router = express.Router();

// ============================================
// ✅ STAFF ROUTES - Using staffToken
// ============================================

// ✅ Staff can view KOTs and stats (no /staff prefix needed)
router.get('/', protectStaff, getKOTs);
router.get('/stats', protectStaff, getKitchenStats);
router.get('/queue', protectStaff, getKitchenQueue);
router.get('/order/:orderId', protectStaff, getKOTsByOrder);
router.get('/:id', protectStaff, getKOTById);

// ✅ Staff can update KOT status (kitchen staff only)
router.patch('/:id/status', protectStaff, authorizeStaffRoles('chef', 'cook', 'section_chef', 'kot_staff'), updateKOTStatus);
router.patch('/:id/items/:itemId/status', protectStaff, authorizeStaffRoles('chef', 'cook', 'section_chef', 'kot_staff'), updateItemStatus);
router.patch('/:id/print', protectStaff, authorizeStaffRoles('chef', 'cook', 'section_chef', 'kot_staff'), markKOTPrinted);
router.patch('/:id/fix-status', protectStaff, authorizeStaffRoles('chef', 'cook', 'section_chef', 'kot_staff'), fixKOTStatus);
router.delete('/:id', protectStaff, authorizeStaffRoles('chef', 'section_chef'), cancelKOT);

// ============================================
// ✅ ADMIN ROUTES - Using admin token (full access)
// ============================================
router.post('/', protect, createKOT);

export default router;