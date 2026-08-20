// routes/staffRoutes.js - Add settings routes
import express from 'express';
import { protectStaff } from '../middleware/staffAuth.js';
import {
  getStaffSettings,
  updateStaffSettings,
  resetStaffSettings,
} from '../controllers/staff/settingsController.js';

const router = express.Router();

// ─── Apply Staff Auth Middleware ──────────────────────────────────────
router.use(protectStaff);

// ─── Settings Routes ────────────────────────────────────────────────────
router.get('/settings', getStaffSettings);
router.patch('/settings', updateStaffSettings);
router.post('/settings/reset', resetStaffSettings);

export default router;