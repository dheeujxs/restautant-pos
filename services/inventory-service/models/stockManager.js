// utils/stockManager.js
import Ingredient from '../models/Ingredient.js';
import Dish from '../models/Dish.js';
import Order from '../models/Order.js';

/**
 * Deduct ingredients stock when order is placed
 */
export const deductIngredientsStock = async (items, orderId = null) => {
  const stockUpdates = [];
  const errors = [];

  for (const item of items) {
    // Fetch the dish with its variants
    const dish = await Dish.findById(item.productId);
    
    if (!dish) {
      errors.push({ productName: item.productName, error: 'Dish not found' });
      continue;
    }

    // Find the correct variant (match by price)
    let variant = null;
    if (dish.variants && dish.variants.length > 0) {
      variant = dish.variants.find(v => v.price === item.unitPrice) || dish.variants[0];
    }

    if (variant && variant.ingredients && variant.ingredients.length > 0) {
      for (const ingredient of variant.ingredients) {
        if (ingredient.ingredientId) {
          const requiredQty = ingredient.quantity * item.quantity;
          
          stockUpdates.push({
            ingredientId: ingredient.ingredientId,
            ingredientName: ingredient.ingredientName,
            requiredQty: requiredQty,
            unit: ingredient.unit,
            orderItem: item,
            dishName: dish.name
          });
        }
      }
    }
  }

  // Perform stock deductions
  for (const update of stockUpdates) {
    try {
      const ingredient = await Ingredient.findById(update.ingredientId);
      
      if (!ingredient) {
        errors.push({ 
          ingredientName: update.ingredientName, 
          error: 'Ingredient not found' 
        });
        continue;
      }

      if (ingredient.currentStock < update.requiredQty) {
        errors.push({
          ingredientName: ingredient.name,
          required: update.requiredQty,
          available: ingredient.currentStock,
          unit: ingredient.unit,
          dishName: update.dishName
        });
        continue;
      }

      // Deduct stock
      ingredient.currentStock -= update.requiredQty;
      await ingredient.save();

      // Log stock transaction (optional but recommended)
      console.log(`[STOCK] Deducted ${update.requiredQty} ${update.unit} of ${ingredient.name} for ${update.dishName}`);
      
    } catch (err) {
      errors.push({ ingredientName: update.ingredientName, error: err.message });
    }
  }

  return { success: errors.length === 0, errors };
};

/**
 * Check if dish is available based on ingredient stock
 */
export const checkDishAvailability = async (dishId, quantity = 1) => {
  const dish = await Dish.findById(dishId);
  
  if (!dish) {
    return { available: false, reason: 'Dish not found' };
  }

  if (dish.stockType === 'product') {
    const available = dish.currentStock >= quantity;
    return {
      available,
      reason: available ? null : `Only ${dish.currentStock} left in stock`
    };
  }

  // Recipe type - check ingredients
  if (!dish.variants || dish.variants.length === 0) {
    return { available: true, reason: null };
  }

  // Check first variant's ingredients
  const variant = dish.variants[0];
  const insufficientIngredients = [];

  for (const ing of variant.ingredients) {
    if (ing.ingredientId) {
      const ingredient = await Ingredient.findById(ing.ingredientId);
      
      if (!ingredient) {
        insufficientIngredients.push({
          name: ing.ingredientName,
          required: ing.quantity * quantity,
          available: 0,
          unit: ing.unit
        });
        continue;
      }

      const requiredQty = ing.quantity * quantity;
      
      if (ingredient.currentStock < requiredQty) {
        insufficientIngredients.push({
          name: ingredient.name,
          required: requiredQty,
          available: ingredient.currentStock,
          unit: ingredient.unit
        });
      }
    }
  }

  return {
    available: insufficientIngredients.length === 0,
    insufficientIngredients,
    reason: insufficientIngredients.length > 0 
      ? `Insufficient ingredients: ${insufficientIngredients.map(i => i.name).join(', ')}`
      : null
  };
};

/**
 * Auto-update dish availability based on stock
 */
export const updateDishAvailability = async () => {
  const dishes = await Dish.find({ isActive: true });
  const updates = [];

  for (const dish of dishes) {
    const availability = await checkDishAvailability(dish._id, 1);
    
    if (!availability.available && dish.isActive) {
      // Auto-disable dish if ingredients are insufficient
      dish.isActive = false;
      await dish.save();
      updates.push({ name: dish.name, status: 'disabled' });
      console.log(`[AUTO] Dish "${dish.name}" disabled due to low stock`);
    } else if (availability.available && !dish.isActive) {
      // Re-enable dish when stock is available
      dish.isActive = true;
      await dish.save();
      updates.push({ name: dish.name, status: 'enabled' });
      console.log(`[AUTO] Dish "${dish.name}" re-enabled`);
    }
  }

  return updates;
};