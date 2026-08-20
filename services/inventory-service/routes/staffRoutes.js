// routes/staffRoutes.js - Complete updated version

import express from 'express';
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  updateStaffPassword,
  deleteStaff,
  getAvailableRoles,
  transferStaffBranch,      // ✅ New: Branch transfer
  getStaffBranchHistory,    // ✅ New: Branch history
  bulkDeleteStaff,
  toggleStaffStatus,
} from '../controllers/staffController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// ✅ ADMIN PROTECTED ROUTES
// ============================================

// 🔒 All staff management routes require admin authentication
router.use(protect);

// ─── Public routes within auth ─────────────────────────────────────────
router.get('/roles/list', getAvailableRoles);

// ─── Staff CRUD ────────────────────────────────────────────────────────
router.get('/', getStaff);
router.get('/:id', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
router.delete('/bulk', bulkDeleteStaff);

// ─── Staff Management ──────────────────────────────────────────────────
router.put('/:id/password', updateStaffPassword);
router.patch('/:id/toggle-status', toggleStaffStatus);

// ─── ✅ Branch Transfer Routes ─────────────────────────────────────────
router.post('/:id/transfer-branch', transferStaffBranch);
router.get('/:id/branch-history', getStaffBranchHistory);

export default router;