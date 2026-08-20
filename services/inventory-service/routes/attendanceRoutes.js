import express from 'express';
import {
  punchIn,
  punchOut,
  getMyAttendance,
  getAllAttendance,
  updateAttendanceStatus,
  getAttendanceStats,
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { protectStaff } from '../middleware/staffAuthMiddleware.js';

const router = express.Router();

// ─── STAFF ROUTES (Protected by Staff Auth) ──────────────────────────────
router.post('/staff/punch-in', protectStaff, punchIn);
router.post('/staff/punch-out', protectStaff, punchOut);
router.get('/staff/my', protectStaff, getMyAttendance);

// ─── ADMIN ROUTES (Protected by Admin Auth) ──────────────────────────────
router.get('/admin/all', protect, getAllAttendance);
router.get('/admin/stats', protect, getAttendanceStats);
router.patch('/admin/:id/status', protect, updateAttendanceStatus);

export default router;