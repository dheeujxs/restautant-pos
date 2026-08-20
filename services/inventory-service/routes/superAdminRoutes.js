// routes/superAdminRoutes.js - COMPLETE FIXED VERSION

import express from 'express';
import paymentRoutes from './super-admin/paymentRoutes.js';

// ─── Auth Controllers ──────────────────────────────────────────────────
import {
  superAdminRegister,
  verifySuperAdminEmail,
  resendVerificationEmail,
  superAdminLogin,
  superAdminLogout,
  getSuperAdminProfile,
  updateSuperAdminProfile,
  changeSuperAdminPassword,
  refreshSuperAdminToken,
  forgotSuperAdminPassword,
  devVerifyAdmin,
  resetSuperAdminPassword,
} from '../controllers/super-admin/superAdminAuthController.js';

// ─── Dashboard Controllers ─────────────────────────────────────────────
import {
  getDashboardStats,
  getRecentOrders,
  getRecentStaff,
} from '../controllers/super-admin/dashboardController.js';

// ─── Revenue Controllers ──────────────────────────────────────────────
import {
  getRevenueOverview,
  getRevenueAnalytics,
  getRevenueReports,
} from '../controllers/super-admin/revenueController.js';

// ─── Report Controllers ────────────────────────────────────────────────
import {
  getReports,
  getRestaurantReports,
  getOrderReports,
  getItemReports,
} from '../controllers/super-admin/reportController.js';

// ─── Restaurant Controllers ────────────────────────────────────────────
import {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from '../controllers/super-admin/restaurantController.js';

// ─── Branch Controllers ────────────────────────────────────────────────
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../controllers/super-admin/branchController.js';

// ─── Staff Controllers ─────────────────────────────────────────────────
import {
  getAllStaffForSuperAdmin,
  getStaffByRestaurant,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffStatus,
  transferStaffBranch,
  getBranchTransferHistory,
} from '../controllers/super-admin/staffController.js';

// ─── Admin Controllers ─────────────────────────────────────────────────
import {
  createBranchAdmin,
  getBranchAdmins,
  getBranchAdminById,
  updateAdminBranch,
  deleteBranchAdmin,
} from '../controllers/super-admin/adminController.js';

// ─── Dish Controllers ──────────────────────────────────────────────────
import {
  getDishes,
  getDishById,
  createDish,
  updateDish,
  deleteDish,
} from '../controllers/super-admin/dishController.js';

// ─── Settings Controllers ──────────────────────────────────────────────
import {
  getSettings,
  updateSettings,
} from '../controllers/super-admin/settingsController.js';

// ─── Payment Controllers ────────────────────────────────────────────────
import {
  getAllPayments,
} from '../controllers/super-admin/paymentController.js';

// ─── Super Admin Middleware ──────────────────────────────────────────
import { protectSuperAdmin, restrictTo } from '../middleware/superAdminAuth.js';

const router = express.Router();

// ============================================================
//  ─── PUBLIC ROUTES (No authentication required) ────────────
// ============================================================

// Auth routes
router.post('/register', superAdminRegister);
router.post('/login', superAdminLogin);
router.post('/refresh-token', refreshSuperAdminToken);
router.post('/forgot-password', forgotSuperAdminPassword);
router.post('/reset-password', resetSuperAdminPassword);
router.get('/verify/:token', verifySuperAdminEmail);
router.post('/resend-verification', resendVerificationEmail);

// ─── Development Routes ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/verify', devVerifyAdmin);
}

// ============================================================
//  ─── PROTECTED ROUTES (Authentication required) ─────────────
// ============================================================

// ✅ Apply Super Admin auth middleware to ALL routes below this line
router.use(protectSuperAdmin);

// ─── Auth ──────────────────────────────────────────────────────────────
router.post('/logout', superAdminLogout);
router.get('/profile', getSuperAdminProfile);
router.put('/profile', updateSuperAdminProfile);
router.put('/change-password', changeSuperAdminPassword);

// ─── Dashboard ──────────────────────────────────────────────────────────
router.get('/dashboard/stats', getDashboardStats);
router.get('/orders/recent', getRecentOrders);
router.get('/staff/recent', getRecentStaff);

// ─── Revenue Routes ──────────────────────────────────────────────────
router.get('/revenue/overview', getRevenueOverview);
router.get('/revenue/analytics', getRevenueAnalytics);
router.get('/revenue/reports', getRevenueReports);

// ─── Reports ────────────────────────────────────────────────────────────
router.get('/reports', getReports);
router.get('/reports/restaurants', getRestaurantReports);
router.get('/reports/orders', getOrderReports);
router.get('/reports/items', getItemReports);

// ─── Restaurants ──────────────────────────────────────────────────────
router.get('/restaurants', getRestaurants);
router.get('/restaurants/:id', getRestaurantById);
router.post('/restaurants', createRestaurant);
router.put('/restaurants/:id', updateRestaurant);
router.delete('/restaurants/:id', deleteRestaurant);

// ─── Branches ──────────────────────────────────────────────────────────
router.get('/branches', getBranches);
router.get('/branches/:id', getBranchById);
router.post('/branches', createBranch);
router.put('/branches/:id', updateBranch);
router.delete('/branches/:id', deleteBranch);

// ─── ✅ STAFF ROUTES - CORRECT ORDER ──────────────────────────────────
// IMPORTANT: Route order matters! Specific routes before generic.

// GET /staff/all - Get all staff
router.get('/staff/all', getAllStaffForSuperAdmin);

// GET /staff/restaurant/:restaurantId - Get staff by restaurant
router.get('/staff/restaurant/:restaurantId', getStaffByRestaurant);

// POST /staff - Create staff
router.post('/staff', createStaff);

// POST /staff/:id/transfer-branch - Transfer branch (specific)
router.post('/staff/:id/transfer-branch', transferStaffBranch);

// GET /staff/:id/branch-history - Get branch history (specific)
router.get('/staff/:id/branch-history', getBranchTransferHistory);

// PATCH /staff/:id/toggle-status - Toggle staff status
router.patch('/staff/:id/toggle-status', toggleStaffStatus);

// PUT /staff/:id - Update staff
router.put('/staff/:id', updateStaff);

// DELETE /staff/:id - Delete staff
router.delete('/staff/:id', deleteStaff);

// GET /staff/:id - Get staff by ID (generic - MUST BE LAST)
router.get('/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const Staff = await import('../models/Staff.js').then(m => m.default);
    const staff = await Staff.findById(id)
      .populate('role')
      .populate('roles')
      .populate('restaurantId', 'name')
      .populate('branchId', 'name')
      .lean();
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('[GET /super-admin/staff/:id] ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff',
    });
  }
});

// ─── Admins (Branch Admins) ────────────────────────────────────────────
router.get('/admins', getBranchAdmins);
router.get('/admins/:id', getBranchAdminById);
router.post('/admins', createBranchAdmin);
router.put('/admins/:id', updateAdminBranch);
router.delete('/admins/:id', deleteBranchAdmin);

// ─── Dishes ────────────────────────────────────────────────────────────
router.get('/dishes', getDishes);
router.get('/dishes/:id', getDishById);
router.post('/dishes', createDish);
router.put('/dishes/:id', updateDish);
router.delete('/dishes/:id', deleteDish);

// ─── Settings ──────────────────────────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// ─── Payments ──────────────────────────────────────────────────────────
router.get('/payments', getAllPayments);
router.use('/payments', paymentRoutes);

export default router;