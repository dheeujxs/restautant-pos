// routes/salaryRoutes.js
import express from 'express';
import {
  getSalaries,
  getSalaryById,
  getStaffSalaries,
  createSalary,
  updateSalary,
  approveSalary,
  paySalary,
  rejectSalary,
  deleteSalary,
  getSalaryStats,
} from '../controllers/salaryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats route first (before :id routes)
router.get('/stats', getSalaryStats);

// Get salaries for specific staff
router.get('/staff/:staffId', getStaffSalaries);

// Main routes
router.get('/', getSalaries);
router.post('/', createSalary);

// Single salary routes
router.get('/:id', getSalaryById);
router.patch('/:id', updateSalary);
router.patch('/:id/approve', approveSalary);
router.patch('/:id/pay', paySalary);
router.patch('/:id/reject', rejectSalary);
router.delete('/:id', deleteSalary);

export default router;