import Ingredient from '../models/Ingredient.js';
import Recipe from '../models/Recipe.js';

const calculateTotalCost = (ingredients) => {
  return ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.costPrice), 0);
};

export const getRecipes = async (req, res) => {
  try {
    const search = req.query.search || '';
    const filter = {};
    if (search) filter.$text = { $search: search };
    const recipes = await Recipe.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { recipes } });
  } catch (err) {
    console.error('[GET /api/recipes]', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch recipes' });
  }
};



export const getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).lean();
    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }
    return res.json({ success: true, data: recipe });
  } catch (err) {
    console.error('[GET /api/recipes/:id]', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch recipe' });
  }
};


export const getRecipeByProductId = async (req, res) => {
  try {
    const recipe = await Recipe.findOne({ productId: req.params.productId }).lean();
    return res.json({ success: true, data: recipe });
  } catch (err) {
    console.error('[GET /api/recipes/product/:productId]', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch recipe' });
  }
};

export const createRecipe = async (req, res) => {
  try {
    const body = req.body;
    if (!body.productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    if (!body.ingredients || body.ingredients.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one ingredient is required' });
    }
    const existing = await Recipe.findOne({ productId: body.productId });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Recipe already exists for this product' });
    }
    const totalCost = calculateTotalCost(body.ingredients);
    const recipe = await Recipe.create({ ...body, totalCost });
    return res.status(201).json({ success: true, data: recipe.toObject(), message: 'Recipe created successfully' });
  } catch (err) {
    console.error('[POST /api/recipes]', err);
    return res.status(500).json({ success: false, error: 'Failed to create recipe' });
  }
};

export const updateRecipe = async (req, res) => {
  try {
    const body = req.body;
    if (body.ingredients) {
      body.totalCost = calculateTotalCost(body.ingredients);
    }
    const updated = await Recipe.findByIdAndUpdate(req.params.id, { $set: body }, { new: true, runValidators: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }
    return res.json({ success: true, data: updated, message: 'Recipe updated successfully' });
  } catch (err) {
    console.error('[PATCH /api/recipes/:id]', err);
    return res.status(500).json({ success: false, error: 'Failed to update recipe' });
  }
};

export const deleteRecipe = async (req, res) => {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }
    return res.json({ success: true, data: null, message: 'Recipe deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/recipes/:id]', err);
    return res.status(500).json({ success: false, error: 'Failed to delete recipe' });
  }
};