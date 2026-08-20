// routes/staffOrdersRoutes.js
import express from 'express';
import {
  getStaffMenu,
  createStaffOrder,
} from '../controllers/staff-orders/staffOrderController.js';
import { protectStaff } from '../middleware/staffAuthMiddleware.js';

const router = express.Router();

// All routes require staff authentication
router.use(protectStaff);

// Menu
router.get('/menu', getStaffMenu);

// Orders
router.post('/orders', createStaffOrder);

export default router;