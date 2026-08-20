// routes/master-admin/masterAdminRoutes.js - COMPLETE WITH RESTAURANT ROUTES

import express from 'express';
import {
  registerMasterAdmin,
  verifyMasterAdminEmail,
  resendVerificationEmail,
  loginMasterAdmin,
  logoutMasterAdmin,
  getMasterAdminProfile,
} from '../../controllers/master-admin/authController.js';

import {
  createSuperAdmin,
  getSuperAdmins,
  getSuperAdminById,
  getSuperAdminPermissions,
  updateSuperAdmin,
  updateSuperAdminPermissions,
  toggleSuperAdminStatus,
  deleteSuperAdmin,
} from '../../controllers/master-admin/superAdminController.js';

// ✅ Import Restaurant Controllers
import {
  getAllRestaurants,        // ← ADD THIS
  getRestaurantById,        // ← ADD THIS
  approveRestaurant,
  rejectRestaurant,
  suspendRestaurant,
  unsuspendRestaurant,
} from '../../controllers/master-admin/restaurantController.js';

import { protectMasterAdmin } from '../../middleware/masterAdminAuth.js';

const router = express.Router();

// ─── Public Routes ──────────────────────────────────────────────────────
router.post('/register', registerMasterAdmin);
router.get('/verify/:token', verifyMasterAdminEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/login', loginMasterAdmin);

// ─── Protected Routes ──────────────────────────────────────────────────
router.use(protectMasterAdmin);

// ─── Auth ──────────────────────────────────────────────────────────────
router.post('/logout', logoutMasterAdmin);
router.get('/profile', getMasterAdminProfile);

// ─── Super Admin Management ────────────────────────────────────────────
router.get('/super-admins', getSuperAdmins);
router.get('/super-admins/:id', getSuperAdminById);
router.get('/super-admins/:id/permissions', getSuperAdminPermissions);
router.post('/super-admins', createSuperAdmin);
router.put('/super-admins/:id', updateSuperAdmin);
router.put('/super-admins/:id/permissions', updateSuperAdminPermissions);
router.patch('/super-admins/:id/toggle-status', toggleSuperAdminStatus);
router.delete('/super-admins/:id', deleteSuperAdmin);

// ─── ✅ Restaurant Management (Master Admin Only) ────────────────────────
// GET routes - for listing and viewing restaurants
router.get('/restaurants', getAllRestaurants);                    // ← ADD THIS
router.get('/restaurants/:id', getRestaurantById);               // ← ADD THIS

// POST routes - for approval actions
router.post('/restaurants/:id/approve', approveRestaurant);
router.post('/restaurants/:id/reject', rejectRestaurant);
router.post('/restaurants/:id/suspend', suspendRestaurant);
router.post('/restaurants/:id/unsuspend', unsuspendRestaurant);

export default router;