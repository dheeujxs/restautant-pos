// routes/staffOrderRoutes.js - COMPLETE FIXED VERSION

import express from 'express';
import {
  getStaffMenu,
  getStaffOrders,
  getOrderDetails,
  createStaffOrder,
  updateOrderStatus,
  kitchenAcknowledgeOrder,
  requestReady,          // ✅ NOW EXPORTED
  getStaffReadyOrders,   // ✅ NOW EXPORTED
  serveStaffOrder,       // ✅ NOW EXPORTED
  cancelOrder,
  requestBill,
  generateBillForOrder, 
} from '../controllers/staff-portal/ordersStaffController.js';
import { protectStaff } from '../middleware/staffAuthMiddleware.js';

const router = express.Router();

// ✅ All routes require staff authentication
router.use(protectStaff);

// ─── Menu ──────────────────────────────────────────────────────────────
router.get('/menu', getStaffMenu);

// ─── Orders - GET routes FIRST (specific before generic) ─────────────
// ✅ /ready must come BEFORE /:id
router.get('/orders/ready', getStaffReadyOrders);  // GET /api/staff/orders/ready
router.get('/orders', getStaffOrders);             // GET /api/staff/orders
router.get('/orders/:orderId', getOrderDetails);   // GET /api/staff/orders/:orderId

// ─── Orders - POST/PATCH routes ───────────────────────────────────────
router.post('/orders', createStaffOrder);                                // POST /api/staff/orders
router.patch('/orders/:orderId/status', updateOrderStatus);              // PATCH /api/staff/orders/:id/status
router.patch('/orders/:orderId/serve', serveStaffOrder);                 // PATCH /api/staff/orders/:id/serve
router.patch('/orders/:orderId/kitchen-acknowledge', kitchenAcknowledgeOrder); // PATCH /api/staff/orders/:id/kitchen-acknowledge
router.post('/orders/:orderId/request-ready', requestReady);            // POST /api/staff/orders/:id/request-ready
router.patch('/orders/:orderId/request-bill', requestBill);    
router.post('/orders/:orderId/generate-bill', generateBillForOrder);    
      // PATCH /api/staff/orders/:id/request-bill
router.patch('/orders/:orderId/cancel', cancelOrder);                   // PATCH /api/staff/orders/:id/cancel

export default router;