// routes/super-admin/reportRoutes.js

import express from 'express';
import { getReports } from '../../controllers/super-admin/reportController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require super admin authentication
router.use(protect, isSuperAdmin);

// Get reports with filters
router.get('/', getReports);
router.get('/sales', getReports);
router.get('/staff', getReports);
router.get('/financial', getReports);
router.get('/export', getReports);

export default router;