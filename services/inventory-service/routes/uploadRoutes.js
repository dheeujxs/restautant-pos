// routes/uploadRoutes.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  uploadImage, 
  uploadMultipleImagesController, 
  deleteImage,
  getImageInfo,
  updateImageMetadata 
} from '../controllers/uploadController.js';

const router = express.Router();

// ✅ All routes require authentication
router.post('/', protect, uploadImage);
router.post('/multiple', protect, uploadMultipleImagesController);
router.delete('/', protect, deleteImage);
router.get('/:publicId', protect, getImageInfo);
router.patch('/:publicId/metadata', protect, updateImageMetadata);

export default router;