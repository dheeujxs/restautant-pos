import express from 'express';
import {
  getIngredientCategories,
  getIngredientCategoryById,
  createIngredientCategory,
  updateIngredientCategory,
  deleteIngredientCategory,
  toggleIngredientCategoryStatus,
  bulkDeleteIngredientCategories
} from '../controllers/ingredientCategoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES (No authentication required) ──────────────────────────
router.get('/', getIngredientCategories);
router.get('/:id', getIngredientCategoryById);

// ─── PROTECTED ROUTES (Authentication required) ──────────────────────────
router.post('/', protect, createIngredientCategory);
router.patch('/:id', protect, updateIngredientCategory);
router.delete('/:id', protect, deleteIngredientCategory);
router.patch('/:id/toggle-status', protect, toggleIngredientCategoryStatus);
router.delete('/bulk', protect, bulkDeleteIngredientCategories);

export default router;