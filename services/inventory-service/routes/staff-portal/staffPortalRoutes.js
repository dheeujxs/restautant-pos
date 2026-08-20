// routes/staff-portal/staffPortalRoutes.js - COMPLETE FIXED VERSION WITH PUT ROUTE

import express from 'express';
import {
  staffLogin,
  verifyStaffToken,
  getStaffDashboard,
  getStaffProfile,
  updateStaffProfile,
  getStaffBills,
  getStaffReports,
  updateOrderStatusStaff,
  getStaffSalary,
  getStaffAttendance,
  getStaffTables,
  getCashierDashboard,
} from '../../controllers/staff-portal/staffPortalController.js';

// ✅ FIXED IMPORT PATH: Changed from staff-portal to staff
import {
  getStaffSettings,
  updateStaffSettings,
  resetStaffSettings,
} from '../../controllers/staff-portal/settingsController.js';

import {
  getStaffKotStats,
  getStaffKotQueue,
  updateKotStatus,
  getKotById,
  bulkUpdateKotStatus,
} from '../../controllers/staff-portal/kotStaffController.js';

import {
  getStaffOrders,
  updateOrderStatus,
  getOrderDetails,
  requestBill,
  getStaffMenu,
  cancelOrder,
  kitchenAcknowledgeOrder,
  createStaffOrder,
  generateBillForOrder
} from '../../controllers/staff-portal/ordersStaffController.js';

import { protectStaff } from '../../middleware/staffAuthMiddleware.js';

const router = express.Router();

console.log('📋 [ROUTES] Staff Portal Routes Loading...');

// ─── Public routes ──────────────────────────────────────────────────────
router.post('/login', staffLogin);
router.post('/verify', verifyStaffToken);

// ─── Protected routes ──────────────────────────────────────────────────
router.use(protectStaff);

console.log('✅ [ROUTES] Staff authentication middleware applied');

// ✅ Settings Routes (MUST come before generic routes)
router.get('/settings', (req, res, next) => {
  console.log('📊 [ROUTES] GET /settings route handler called');
  next();
}, getStaffSettings);

router.patch('/settings', (req, res, next) => {
  console.log('📊 [ROUTES] PATCH /settings route handler called');
  next();
}, updateStaffSettings);

// 🔥 ADDED: PUT route for full settings update
router.put('/settings', (req, res, next) => {
  console.log('📊 [ROUTES] PUT /settings route handler called');
  next();
}, updateStaffSettings);

router.post('/settings/reset', (req, res, next) => {
  console.log('📊 [ROUTES] POST /settings/reset route handler called');
  next();
}, resetStaffSettings);

console.log('✅ [ROUTES] Settings routes registered');

// ✅ Cashier Dashboard (MUST come before generic routes)
router.get('/cashier-dashboard', getCashierDashboard);

// Dashboard & Profile
router.get('/dashboard', getStaffDashboard);
router.get('/profile', getStaffProfile);
router.patch('/profile', updateStaffProfile);

// Bills & Reports
router.get('/bills', getStaffBills);
router.get('/reports', getStaffReports);

// Salary & Attendance
router.get('/salary', getStaffSalary);
router.get('/attendance', getStaffAttendance);

// Staff Tables
router.get('/tables', getStaffTables);

// Staff Orders
router.get('/orders', getStaffOrders);
router.get('/orders/:orderId', getOrderDetails);
router.post('/orders', createStaffOrder);
router.put('/orders/:orderId/status', updateOrderStatus);
router.patch('/orders/:orderId/request-bill', requestBill);
router.put('/orders/:orderId/cancel', cancelOrder);
router.patch('/orders/:orderId/kitchen-acknowledge', kitchenAcknowledgeOrder);

// Staff Menu
router.get('/menu', getStaffMenu);

// Staff KOT
router.get('/kot/stats', getStaffKotStats);
router.get('/kot/queue', getStaffKotQueue);
router.get('/kot/:kotId', getKotById);
router.post('/orders/:orderId/generate-bill', generateBillForOrder);
router.put('/kot/:kotId/status', updateKotStatus);
router.put('/kot/bulk/status', bulkUpdateKotStatus);

console.log('✅ [ROUTES] All Staff Portal routes registered successfully');

export default router;