// routes/super-admin/settingsRoutes.js

import express from 'express';
import {
  getSettings,
  updateSettings,
  resetSettings,
} from '../../controllers/super-admin/settingsController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require super admin authentication
router.use(protect, isSuperAdmin);

// Get settings
router.get('/', getSettings);

// Update settings
router.put('/', updateSettings);

// Reset settings to default
router.post('/reset', resetSettings);

export default router;