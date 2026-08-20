// routes/super-admin/auditRoutes.js

import express from 'express';
import {
  getAuditLogs,
  getAuditLogById,
  exportAuditLogs,
} from '../../controllers/super-admin/auditController.js';
import { protect, isSuperAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require super admin authentication
router.use(protect, isSuperAdmin);

// Get audit logs with filters
router.get('/', getAuditLogs);

// Get audit log by ID
router.get('/:id', getAuditLogById);

// Export audit logs
router.get('/export', exportAuditLogs);

export default router;