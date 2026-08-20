import express from 'express';
import {
  getTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  forceFreeTable,
  getTablesWithOrders
} from '../controllers/tableController.js';
import Order from '../models/Order.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ All routes require authentication
router.use(protect);

// ✅ Specific routes FIRST
router.get('/with-orders', getTablesWithOrders);   // <-- moved up
router.get('/', getTables);
router.post('/', createTable);

// ✅ Generic routes with :id AFTER
router.get('/:id', getTableById);
router.patch('/:id', updateTable);
router.delete('/:id', deleteTable);
router.post('/:id/free', forceFreeTable);
router.patch('/:id/status', updateTableStatus);

export default router;