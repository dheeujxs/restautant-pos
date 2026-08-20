// routes/adminRoutes1.js
import express from 'express';
import {
  createBranchAdmin,
  getBranchAdmins,
  getBranchAdminById,
  updateAdminBranch,
  deleteBranchAdmin,
} from '../controllers/super-admin/adminController.js';
import { protect, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ All routes here already have /api/super-admin/admins prefix from server.js
// So we just define the endpoints relative to that

// Admin management routes
router.post('/', createBranchAdmin); // POST /api/super-admin/admins
router.get('/', getBranchAdmins); // GET /api/super-admin/admins
router.get('/:id', getBranchAdminById); // GET /api/super-admin/admins/:id
router.put('/:id', updateAdminBranch); // PUT /api/super-admin/admins/:id
router.delete('/:id', deleteBranchAdmin); // DELETE /api/super-admin/admins/:id

export default router;