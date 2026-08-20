// routes/super-admin/restaurantRoutes.js - Add verification route

import express from 'express';
import {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  addBranch,
  updateBranch,
  deleteBranch,
  updateRestaurantStatus,
  updateRestaurantVerification, // ✅ Add this
} from '../../controllers/super-admin/restaurantController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(isSuperAdmin);

router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);
router.post('/', createRestaurant);
router.put('/:id', updateRestaurant);
router.delete('/:id', deleteRestaurant);
router.patch('/:id/status', updateRestaurantStatus);
router.patch('/:id/verification', updateRestaurantVerification); // ✅ Add this route

router.post('/:id/branches', addBranch);
router.put('/:id/branches/:branchId', updateBranch);
router.delete('/:id/branches/:branchId', deleteBranch);

export default router;