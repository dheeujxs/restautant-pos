// routes/templateRoutes.js
import express from 'express';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  addSection,
  removeSection,
  addDishToSection,
  removeDishFromSection,
} from '../controllers/templateController.js';
import { protect, isAdmin, isAdminOrSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────
// All routes require authentication
// ──────────────────────────────────────────────────────────────────────────
router.use(protect);

// ──────────────────────────────────────────────────────────────────────────
// Main template routes
// ──────────────────────────────────────────────────────────────────────────

// GET /api/templates - Get all templates
// POST /api/templates - Create new template
router.route('/')
  .get(getTemplates)
  .post(isAdmin, createTemplate);  // Use isAdmin instead of authorize

// ──────────────────────────────────────────────────────────────────────────
// Single template routes
// ──────────────────────────────────────────────────────────────────────────

// GET /api/templates/:id - Get template by ID
// PATCH /api/templates/:id - Update template
// DELETE /api/templates/:id - Delete template
router.route('/:id')
  .get(getTemplateById)
  .patch(isAdmin, updateTemplate)
  .delete(isAdmin, deleteTemplate);

// ──────────────────────────────────────────────────────────────────────────
// Template actions
// ──────────────────────────────────────────────────────────────────────────

// POST /api/templates/:id/duplicate - Duplicate template
router.route('/:id/duplicate')
  .post(isAdmin, duplicateTemplate);

// ──────────────────────────────────────────────────────────────────────────
// Section management
// ──────────────────────────────────────────────────────────────────────────

// POST /api/templates/:id/sections - Add section to template
router.route('/:id/sections')
  .post(isAdmin, addSection);

// DELETE /api/templates/:id/sections/:sectionId - Remove section from template
router.route('/:id/sections/:sectionId')
  .delete(isAdmin, removeSection);

// ──────────────────────────────────────────────────────────────────────────
// Dish management within sections
// ──────────────────────────────────────────────────────────────────────────

// POST /api/templates/:id/sections/:sectionId/dishes/:dishId - Add dish to section
// DELETE /api/templates/:id/sections/:sectionId/dishes/:dishId - Remove dish from section
router.route('/:id/sections/:sectionId/dishes/:dishId')
  .post(isAdmin, addDishToSection)
  .delete(isAdmin, removeDishFromSection);

export default router;