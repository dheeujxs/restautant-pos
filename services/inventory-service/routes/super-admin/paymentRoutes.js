import express from 'express';
import {
  getAllPayments,
  getPaymentStats,
  getPaymentById,
  getPaymentsByRestaurant,
  getPaymentsByDateRange,
  exportPayments,
  getBranchRevenueOverview,
  getRevenueOverview,
  getRevenueAnalytics,
  backfillBillsWithBranchInfo,  // ✅ Add this import
} from '../../controllers/super-admin/paymentController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, isSuperAdmin);

router.get('/', getAllPayments);
router.get('/stats', getPaymentStats);
router.get('/revenue/overview', getRevenueOverview);
router.get('/revenue/analytics', getRevenueAnalytics);
router.get('/revenue/branch', getBranchRevenueOverview);

// ✅ Add backfill endpoint (run once)
router.post('/bills/backfill', backfillBillsWithBranchInfo);

router.get('/:id', getPaymentById);
router.get('/restaurant/:restaurantId', getPaymentsByRestaurant);
router.get('/date-range', getPaymentsByDateRange);
router.get('/export', exportPayments);

export default router;