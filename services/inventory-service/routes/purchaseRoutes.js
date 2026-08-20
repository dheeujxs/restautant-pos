import express from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  receivePurchase,
  updatePurchaseStatus,
  deletePurchase
} from '../controllers/purchaseController.js';
import { protect} from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);
router.post('/:id/receive', receivePurchase);
router.patch('/:id/status', updatePurchaseStatus);
router.delete('/:id', deletePurchase);

export default router;