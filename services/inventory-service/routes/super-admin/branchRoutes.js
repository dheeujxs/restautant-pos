// routes/super-admin/branchRoutes.js

import express from 'express';
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats,
} from '../../controllers/super-admin/branchController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require super admin authentication
router.use(protect, isSuperAdmin);

// Stats route (must come before /:id routes)
router.get('/stats', getBranchStats);

// CRUD routes
router.get('/', getBranches);
router.get('/:id', getBranchById);
router.post('/', createBranch);
router.patch('/:id', updateBranch);
router.delete('/:id', deleteBranch);

export default router;