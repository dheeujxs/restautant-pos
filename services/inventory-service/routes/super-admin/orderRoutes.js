// routes/super-admin/orderRoutes.js - UPDATED FOR DEFAULT EXPORT

import express from 'express';
// ✅ Import default export from controller
import orderController from '../../controllers/super-admin/orderController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// ─── Destructure controller functions ──────────────────────────────────
const {
  getAllOrders,
  getOrderById,
  getOrderStats,
  updateOrder,
  bulkDeleteOrders,
  exportOrders,
  getRestaurantOrderSummary,
  getLiveDashboard,
  getOrderByNumber,
  clearCache,
} = orderController;

// ─── All routes require Super Admin authentication ──────────────────────
router.use(protect);
router.use(isSuperAdmin);

// ─── Order Management Routes ─────────────────────────────────────────────
router.get('/', getAllOrders);
router.get('/stats', getOrderStats);
router.get('/live-dashboard', getLiveDashboard);
router.get('/export', exportOrders);
router.get('/restaurant-summary', getRestaurantOrderSummary);
router.get('/number/:orderNumber', getOrderByNumber);
router.get('/:id', getOrderById);
router.patch('/:id', updateOrder);
router.delete('/bulk', bulkDeleteOrders);
router.post('/clear-cache', clearCache);

export default router;