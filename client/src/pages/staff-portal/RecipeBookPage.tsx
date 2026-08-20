import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Search, Filter, ChefHat, Clock, Users,
  Package, Utensils, Eye, Edit, Plus, X,
  Loader2, RefreshCw, AlertCircle, CheckCircle,
  Printer, Download, Star, Heart, Coffee, Pizza,
  Salad, Cake, Sandwich, Soup, Flame, Crown,
  Info, AlertTriangle, Thermometer, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Ingredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

interface Variant {
  name: string;
  price: number;
  ingredients: Ingredient[];
  prepTime?: number;
  cookingInstructions?: string;
}

interface Recipe {
  _id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  image: string;
  dietaryType: 'Veg' | 'Non-veg' | 'Vegan' | 'Jain' | 'Eggetarian';
  variants: Variant[];
  price: number;
  totalPrepTime: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isActive: boolean;
  createdAt: string;
  kotStation: string;
  glassType: string;
  baseIngredient: string;
  stockType: 'recipe' | 'product';
  currentStock: number;
  allergens?: string[];
  servingSize?: number;
  cookingMethod?: string;
  cuisine?: string;
}

interface Category {
  _id: string;
  name: string;
}

const DIETARY_COLORS = {
  'Veg': 'bg-green-100 text-green-700',
  'Non-veg': 'bg-red-100 text-red-700',
  'Vegan': 'bg-emerald-100 text-emerald-700',
  'Jain': 'bg-yellow-100 text-yellow-700',
  'Eggetarian': 'bg-orange-100 text-orange-700',
};

const DIETARY_ICONS = {
  'Veg': '🌿',
  'Non-veg': '🍖',
  'Vegan': '🌱',
  'Jain': '🪷',
  'Eggetarian': '🥚',
};

const DIFFICULTY_CONFIG = {
  'Easy': { icon: '⭐', color: 'bg-green-100 text-green-700', label: 'Easy' },
  'Medium': { icon: '⭐⭐', color: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
  'Hard': { icon: '⭐⭐⭐', color: 'bg-red-100 text-red-700', label: 'Hard' },
};

export default function RecipeBookPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [recipes, searchTerm, dietaryFilter, categoryFilter, difficultyFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const staffToken = localStorage.getItem('staffToken');
      const headers = { Authorization: `Bearer ${staffToken}` };

      const [recipesRes, categoriesRes] = await Promise.all([
        api.get('/dishes?limit=500', { headers }),
        api.get('/categories', { headers }),
      ]);

      const dishes = recipesRes.data.data?.dishes || [];
      setRecipes(dishes);
      setCategories(categoriesRes.data.data?.categories || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const filterRecipes = () => {
    let filtered = [...recipes];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.categoryName?.toLowerCase().includes(term) ||
        r.cuisine?.toLowerCase().includes(term)
      );
    }

    if (dietaryFilter !== 'all') {
      filtered = filtered.filter(r => r.dietaryType === dietaryFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.categoryId === categoryFilter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(r => r.difficulty === difficultyFilter);
    }

    setFilteredRecipes(filtered);
  };

  const getDietaryBadge = (dietary: string) => {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIETARY_COLORS[dietary as keyof typeof DIETARY_COLORS] || 'bg-gray-100 text-gray-700'}`}>
        {DIETARY_ICONS[dietary as keyof typeof DIETARY_ICONS]} {dietary}
      </span>
    );
  };

  const getDifficultyBadge = (difficulty: string) => {
    const config = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
    if (!config) return null;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(2)}`;
  };

  const formatTime = (minutes: number) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
    setExpandedVariant(null);
  };

  const getTotalIngredients = (recipe: Recipe) => {
    let total = 0;
    recipe.variants?.forEach(variant => {
      total += variant.ingredients?.length || 0;
    });
    return total;
  };

  const getStockStatus = (recipe: Recipe) => {
    if (recipe.stockType === 'product') {
      if (recipe.currentStock <= 0) return { label: 'Out of Stock', color: 'text-red-600' };
      if (recipe.currentStock <= 5) return { label: 'Low Stock', color: 'text-yellow-600' };
      return { label: 'In Stock', color: 'text-green-600' };
    }
    return { label: 'Recipe Based', color: 'text-blue-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen size={24} className="text-orange-500" />
              Recipe Book
            </h1>
            <p className="text-gray-500 text-sm mt-1">View all kitchen recipes with ingredients and variants</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-800">{recipes.length}</p>
            <p className="text-xs text-gray-500">Total Recipes</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-green-600">{recipes.filter(r => r.dietaryType === 'Veg').length}</p>
            <p className="text-xs text-gray-500">Vegetarian</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-red-600">{recipes.filter(r => r.dietaryType === 'Non-veg').length}</p>
            <p className="text-xs text-gray-500">Non-Vegetarian</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-purple-600">{recipes.filter(r => r.variants?.length > 0).length}</p>
            <p className="text-xs text-gray-500">With Variants</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-orange-600">{recipes.reduce((sum, r) => sum + (r.variants?.length || 0), 0)}</p>
            <p className="text-xs text-gray-500">Total Variants</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-blue-600">{recipes.filter(r => r.isActive).length}</p>
            <p className="text-xs text-gray-500">Active Recipes</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search recipes by name, cuisine, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Dietary</option>
              <option value="Veg">🌿 Veg</option>
              <option value="Non-veg">🍖 Non-veg</option>
              <option value="Vegan">🌱 Vegan</option>
              <option value="Jain">🪷 Jain</option>
              <option value="Eggetarian">🥚 Eggetarian</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Difficulty</option>
              <option value="Easy">⭐ Easy</option>
              <option value="Medium">⭐⭐ Medium</option>
              <option value="Hard">⭐⭐⭐ Hard</option>
            </select>

            {(searchTerm || dietaryFilter !== 'all' || categoryFilter !== 'all' || difficultyFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setDietaryFilter('all'); setCategoryFilter('all'); setDifficultyFilter('all'); }}
                className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Recipes Grid */}
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">No recipes found</h3>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRecipes.map((recipe) => {
              const stockStatus = getStockStatus(recipe);
              return (
                <div
                  key={recipe._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer group"
                  onClick={() => handleViewRecipe(recipe)}
                >
                  {/* Recipe Image / Header */}
                  <div className="h-40 bg-gradient-to-r from-orange-100 to-orange-200 flex items-center justify-center relative">
                    {recipe.image ? (
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Utensils size={40} className="text-orange-300 mx-auto" />
                        <p className="text-xs text-orange-400 mt-2">No image</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getDietaryBadge(recipe.dietaryType)}
                    </div>
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {recipe.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle size={10} className="inline mr-1" /> Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertCircle size={10} className="inline mr-1" /> Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Recipe Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg line-clamp-1">{recipe.name}</h3>
                        <p className="text-xs text-gray-400">{recipe.categoryName || 'Uncategorized'}</p>
                      </div>
                      <span className="text-lg font-bold text-orange-500">
                        {recipe.variants?.[0]?.price ? formatPrice(recipe.variants[0].price) : formatPrice(recipe.price)}
                      </span>
                    </div>

                    {recipe.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{recipe.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package size={12} />
                        {getTotalIngredients(recipe)} ingredients
                      </span>
                      {recipe.totalPrepTime && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(recipe.totalPrepTime)}
                        </span>
                      )}
                      {recipe.difficulty && getDifficultyBadge(recipe.difficulty)}
                      <span className="flex items-center gap-1">
                        <Flame size={12} />
                        {recipe.kotStation || 'Main Kitchen'}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewRecipe(recipe); }}
                        className="flex-1 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition flex items-center justify-center gap-1"
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recipe Detail Modal */}
      {showRecipeModal && selectedRecipe && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowRecipeModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowRecipeModal(false)} />
            
            <div className="relative bg-white rounded-xl max-w-4xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className={`p-5 border-b flex justify-between items-center bg-gradient-to-r from-orange-50 to-orange-100`}>
                <div className="flex items-center gap-3">
                  <ChefHat size={24} className="text-orange-500" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedRecipe.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      {selectedRecipe.categoryName}
                      {selectedRecipe.cuisine && <span className="text-gray-400">• {selectedRecipe.cuisine}</span>}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowRecipeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {/* Quick Info Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedRecipe.dietaryType && getDietaryBadge(selectedRecipe.dietaryType)}
                  {selectedRecipe.difficulty && getDifficultyBadge(selectedRecipe.difficulty)}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedRecipe.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedRecipe.isActive ? '✅ Active' : '❌ Inactive'}
                  </span>
                  {selectedRecipe.kotStation && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      🔥 {selectedRecipe.kotStation}
                    </span>
                  )}
                  {selectedRecipe.glassType && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      🥂 {selectedRecipe.glassType}
                    </span>
                  )}
                  {selectedRecipe.baseIngredient && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      🧅 Base: {selectedRecipe.baseIngredient}
                    </span>
                  )}
                </div>

                {/* Description */}
                {selectedRecipe.description && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">{selectedRecipe.description}</p>
                  </div>
                )}

                {/* Recipe Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {selectedRecipe.totalPrepTime && (
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-400">Prep Time</p>
                      <p className="font-semibold text-gray-800">{formatTime(selectedRecipe.totalPrepTime)}</p>
                    </div>
                  )}
                  {selectedRecipe.servingSize && (
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-400">Serving Size</p>
                      <p className="font-semibold text-gray-800">{selectedRecipe.servingSize} people</p>
                    </div>
                  )}
                  {selectedRecipe.cookingMethod && (
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-400">Cooking Method</p>
                      <p className="font-semibold text-gray-800">{selectedRecipe.cookingMethod}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-400">Stock Type</p>
                    <p className="font-semibold text-gray-800">{selectedRecipe.stockType === 'recipe' ? '📋 Recipe Based' : '📦 Product'}</p>
                  </div>
                </div>

                {/* Allergens */}
                {selectedRecipe.allergens && selectedRecipe.allergens.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                      <AlertTriangle size={14} /> Allergens:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedRecipe.allergens.map((allergen, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variants */}
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package size={16} className="text-orange-500" />
                  Variants ({selectedRecipe.variants?.length || 0})
                </h4>

                {selectedRecipe.variants?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRecipe.variants.map((variant, idx) => {
                      const isExpanded = expandedVariant === `${idx}`;
                      return (
                        <div key={idx} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                          <div
                            className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition"
                            onClick={() => setExpandedVariant(isExpanded ? null : `${idx}`)}
                          >
                            <div>
                              <span className="font-medium text-gray-800">{variant.name}</span>
                              <span className="text-sm text-gray-500 ml-2">({variant.ingredients?.length || 0} ingredients)</span>
                              {variant.prepTime && (
                                <span className="text-xs text-gray-400 ml-2">⏱ {formatTime(variant.prepTime)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-orange-500">{formatPrice(variant.price)}</span>
                              <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-3 border-t border-gray-200 bg-white">
                              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Ingredients</h5>
                              <div className="space-y-1">
                                {variant.ingredients?.map((ing, i) => (
                                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                    <span className="text-gray-600">{ing.ingredientName}</span>
                                    <span className="font-medium text-gray-800">
                                      {ing.quantity} {ing.unit}
                                    </span>
                                  </div>
                                ))}
                                {(!variant.ingredients || variant.ingredients.length === 0) && (
                                  <p className="text-sm text-gray-400 text-center py-2">No ingredients listed</p>
                                )}
                              </div>

                              {variant.cookingInstructions && (
                                <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                                  <p className="text-xs font-semibold text-yellow-700">👨‍🍳 Cooking Instructions:</p>
                                  <p className="text-sm text-gray-700 mt-1">{variant.cookingInstructions}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No variants available</p>
                )}

                {/* Summary */}
                <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-700">
                    <strong>📊 Summary:</strong> {getTotalIngredients(selectedRecipe)} ingredients across {selectedRecipe.variants?.length || 0} variants
                  </p>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-5 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowRecipeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                >
                  <Printer size={16} /> Print Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}