// routes/dishRoutes.js (Regular Admin routes)

import express from 'express';
import {
  getDishes,
  getDishById,
  createDish,
  updateDish,
  deleteDish,
  bulkDeleteDishes,
  validateDishStock,
} from '../controllers/dishController.js';
import { checkDishAvailability } from '../controllers/dishController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── All routes require authentication ──────────────────────────────
router.use(protect);

// ─── All routes require Admin access (not Super Admin) ──────────────
router.use(isAdmin);

// ─── CRUD routes ──────────────────────────────────────────────────────
router.get('/', getDishes);
router.get('/:id', getDishById);
router.post('/', createDish);
router.patch('/:id', updateDish);
router.delete('/:id', deleteDish);
router.delete('/bulk', bulkDeleteDishes);
router.post('/availability', checkDishAvailability);
router.post('/:id/validate-stock', validateDishStock);

export default router;