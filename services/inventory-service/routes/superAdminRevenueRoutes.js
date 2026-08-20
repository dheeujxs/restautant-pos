// routes/superAdminRevenueRoutes.js
import express from 'express';
import {
  getRevenueOverview,
  getRevenueAnalytics,
  getRevenueReports,
} from '../controllers/super-admin/revenueController.js';
import { protect, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(isSuperAdmin);

router.get('/overview', getRevenueOverview);
router.get('/analytics', getRevenueAnalytics);
router.get('/reports', getRevenueReports);

export default router;