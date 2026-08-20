import express from 'express';
import { 
  register, 
  login, 
  forgotPassword, 
  verifyOTP, 
  resetPassword,
  updateProfileImage ,
  getProfile,
  updateProfile,
  changePassword
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile-image', protect, updateProfileImage); 
router.put('/change-password', protect, changePassword);

export default router;