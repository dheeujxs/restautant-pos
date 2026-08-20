import express from 'express';
import { 
  getUnits, 
  getUnitById, 
  createUnit, 
  updateUnit, 
  deleteUnit,
  toggleUnitStatus,
  bulkCreateUnits,
  getUnitBySymbol
} from '../controllers/unitController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES (No authentication required) ──────────────────────────
router.get('/', getUnits);
router.get('/:id', getUnitById);
router.get('/symbol/:symbol', getUnitBySymbol);

// ─── PROTECTED ROUTES (Authentication required) ──────────────────────────
router.post('/', protect, createUnit);
router.patch('/:id', protect, updateUnit);
router.delete('/:id', protect, deleteUnit);
router.patch('/:id/toggle', protect, toggleUnitStatus);
router.post('/bulk', protect, bulkCreateUnits);

export default router;