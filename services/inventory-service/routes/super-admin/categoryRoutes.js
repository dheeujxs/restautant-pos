// routes/super-admin/categoryRoutes.js

import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from '../../controllers/super-admin/categoryController.js';
import { protectSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require Super Admin authentication
router.use(protectSuperAdmin);

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.patch('/:id/toggle-status', toggleCategoryStatus);

export default router;