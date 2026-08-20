// routes/super-admin/profileRoutes.js

import express from 'express';
import {
  getSuperAdminProfile,
  updateSuperAdminProfile,
  changeSuperAdminPassword,
} from '../../controllers/super-admin/superAdminProfileController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require super admin authentication
router.use(protect, isSuperAdmin);

// Get profile
router.get('/', getSuperAdminProfile);

// Update profile
router.put('/', updateSuperAdminProfile);

// Change password
router.put('/change-password', changeSuperAdminPassword);

export default router;