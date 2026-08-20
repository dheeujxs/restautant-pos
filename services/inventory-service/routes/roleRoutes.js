// routes/roleRoutes.js - Updated with permissions endpoints

import express from 'express';
import {
  getRoles,
  getRoleById,
  getRolePermissions,      // ✅ NEW - Get role permissions
  createRole,
  updateRole,
  deleteRole,
  bulkDeleteRoles,          // ✅ NEW - Bulk delete roles
  toggleRoleStatus,         // ✅ NEW - Toggle role status
  updateRolePermissions,    // ✅ NEW - Update role permissions
} from '../controllers/roleController.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────
// GET Routes
// ──────────────────────────────────────────────────────────────

// Get all roles (with optional filters)
router.get('/', getRoles);

// Get single role by ID
router.get('/:id', getRoleById);

// ✅ Get role permissions (for staff creation/edit)
router.get('/:id/permissions', getRolePermissions);

// ──────────────────────────────────────────────────────────────
// POST Routes
// ──────────────────────────────────────────────────────────────

// Create new role
router.post('/', createRole);

// ──────────────────────────────────────────────────────────────
// PUT Routes
// ──────────────────────────────────────────────────────────────

// Update role
router.put('/:id', updateRole);

// ✅ Update role permissions
router.put('/:id/permissions', updateRolePermissions);

// ──────────────────────────────────────────────────────────────
// PATCH Routes
// ──────────────────────────────────────────────────────────────

// ✅ Toggle role status (active/inactive)
router.patch('/:id/toggle-status', toggleRoleStatus);

// ──────────────────────────────────────────────────────────────
// DELETE Routes
// ──────────────────────────────────────────────────────────────

// Delete single role
router.delete('/:id', deleteRole);

// ✅ Bulk delete roles
router.delete('/bulk', bulkDeleteRoles);

export default router;