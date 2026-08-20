// routes/super-admin/staffRoutes.js

import express from 'express';
import { 
  getAllStaffForSuperAdmin,
  getStaffByRestaurant,
  createStaff, // ✅ Add this import
} from '../../controllers/super-admin/staffController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// ─── All routes require Super Admin authentication ──────────────────
router.use(protect, isSuperAdmin);

// ─── Get all staff with filters ──────────────────────────────────────
router.get('/all', getAllStaffForSuperAdmin);

// ─── Get staff by restaurant ─────────────────────────────────────────
router.get('/restaurant/:restaurantId', getStaffByRestaurant);

// ✅ ─── Create staff ──────────────────────────────────────────────────
router.post('/', createStaff);

export default router;