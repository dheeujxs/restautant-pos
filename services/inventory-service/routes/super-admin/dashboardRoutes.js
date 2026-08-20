// routes/super-admin/dashboardRoutes.js

import express from 'express';
import {
  getDashboardStats,
  getRevenueOverview,
  getRecentOrders,
  getRecentStaff,
  getRecentActivities,
  getRevenueData,
} from '../../controllers/super-admin/dashboardController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// ─── All routes require Super Admin authentication ──────────────────
router.use(protect, isSuperAdmin);

// ─── Dashboard routes ──────────────────────────────────────────────────
router.get('/stats', getDashboardStats);
router.get('/revenue/overview', getRevenueOverview);
router.get('/recent-orders', getRecentOrders);
router.get('/recent-staff', getRecentStaff);
router.get('/recent-activities', getRecentActivities);
router.get('/revenue-data', getRevenueData);

export default router;