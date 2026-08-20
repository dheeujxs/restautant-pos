// routes/adminRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/adminMiddleware.js';  // ✅ Import from adminMiddleware
import {
  getUsers,
  getUserById,
  updateUserRole,
  updateUser,
  deleteUser,
  makeAdmin,
  getAdminStats
} from '../controllers/adminController.js';

const router = express.Router();

// ─── Apply admin protection to all routes ─────────────────────────────
router.use(protect, isAdmin);

// ─── User Management Routes ────────────────────────────────────────────
router.get('/users', getUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId/role', updateUserRole);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

// ─── Utility Routes ────────────────────────────────────────────────────
router.post('/make-admin', makeAdmin);
router.get('/stats', getAdminStats);

export default router;