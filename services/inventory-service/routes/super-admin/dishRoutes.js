// routes/super-admin/dishRoutes.js

import express from 'express';
import {
  getDishes,
  getDishById,
  getDishStats,
  createDish,
  updateDish,
  deleteDish,
  bulkDeleteDishes,
} from '../../controllers/super-admin/dishController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// ─── All routes require Super Admin authentication ──────────────────
router.use(protect, isSuperAdmin);

// ─── Stats route (must come before /:id routes) ──────────────────────
router.get('/stats', getDishStats);

// ─── Bulk operations ──────────────────────────────────────────────────
router.delete('/bulk', bulkDeleteDishes);

// ─── CRUD routes ──────────────────────────────────────────────────────
router.get('/', getDishes);
router.get('/:id', getDishById);
router.post('/', createDish);
router.patch('/:id', updateDish);
router.delete('/:id', deleteDish);

export default router;