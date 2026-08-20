// routes/settingsRoutes.js
import express from 'express';
import {
  getSettings,
  updateSettings,
  resetSettings
} from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ✅ Add admin check middleware
router.use((req, res, next) => {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }
  
  const isAdmin = user.isAdmin === true || 
                  user.role === 'admin' || 
                  user.role === 'superadmin' ||
                  user.userType === 'Admin';
  
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }
  
  next();
});

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/reset', resetSettings);

export default router;