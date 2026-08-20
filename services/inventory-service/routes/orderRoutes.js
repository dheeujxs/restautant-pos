// routes/orderRoutes.js
import express from 'express';
import {
  getOrders,
  getOrdersUnified,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePayment,
  cancelOrder,
  addItemsToOrder,
  requestBill,
  cancelOrderWithBill,
  processRefund,
  changeOrderTable,
  kitchenAcknowledgeOrder,
  requestReady,
  rejectReady,
  approveReady
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { protectStaff, authorizeStaffRoles } from '../middleware/staffAuthMiddleware.js';

const router = express.Router();

// ✅ STAFF ROUTES – MUST COME BEFORE ADMIN ROUTES
const staffRouter = express.Router();
staffRouter.use(protectStaff);

// ✅ Define specific routes first
staffRouter.get('/orders', getOrdersUnified);  // ✅ MUST be before /:id
staffRouter.get('/orders/:id', getOrderById);
staffRouter.patch('/orders/:id/status', authorizeStaffRoles('chef', 'cook', 'section_chef'), updateOrderStatus);
staffRouter.post('/orders/:id/request-ready', authorizeStaffRoles('chef', 'cook', 'section_chef'), requestReady);
staffRouter.patch('/orders/:id/kitchen-acknowledge', authorizeStaffRoles('chef', 'cook', 'section_chef'), kitchenAcknowledgeOrder);
staffRouter.post('/orders/:id/reject-ready', authorizeStaffRoles('chef', 'section_chef'), rejectReady);
staffRouter.post('/orders/:id/approve-ready', authorizeStaffRoles('chef', 'section_chef'), approveReady);

// ✅ Mount staff routes at /staff BEFORE admin routes
router.use('/staff', staffRouter);

// ✅ PROTECTED ROUTES (all routes below require authentication)
router.use(protect);

// Admin/Protected routes - generic routes after specific ones
router.get('/', getOrdersUnified);
router.get('/admin', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/payment', updatePayment);
router.patch('/:id/add-items', addItemsToOrder);
router.patch('/:id/request-bill', requestBill);
router.delete('/:id', cancelOrder);
router.post('/:id/cancel-with-bill', cancelOrderWithBill);
router.post('/:id/refund', processRefund);
router.patch('/:id/table', changeOrderTable);
router.patch('/:id/kitchen-acknowledge', kitchenAcknowledgeOrder);
router.post('/:id/request-ready', requestReady);
router.post('/:id/reject-ready', rejectReady);
router.post('/:id/approve-ready', approveReady);

export default router;