// routes/dishCategoryRoutes.js
import express from 'express';
import { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getCategoriesByCourseType 
} from '../controllers/categoryController.js';

const router = express.Router();

// These routes map to the same controllers
router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.patch('/:id', updateCategory);
router.get('/by-course-type/:courseTypeId', getCategoriesByCourseType);
router.delete('/:id', deleteCategory);

export default router;