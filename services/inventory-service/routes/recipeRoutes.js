import express from 'express';
import { getRecipes, getRecipeById, getRecipeByProductId, createRecipe, updateRecipe, deleteRecipe } from '../controllers/recipeController.js';

const router = express.Router();

router.get('/', getRecipes);
router.get('/:id', getRecipeById);
router.get('/product/:productId', getRecipeByProductId);
router.post('/', createRecipe);
router.patch('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);

export default router;