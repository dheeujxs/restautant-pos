import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Edit2, Trash2, Eye, ChefHat, Search, X, RefreshCw, Package, Layers, DollarSign } from 'lucide-react';

interface IRecipe {
  _id: string;
  productId: string;
  productName: string;
  yieldQuantity: number;
  yieldUnit: string;
  ingredients: any[];
  totalCost: number;
  wastagePercentage: number;
  isActive: boolean;
}

export default function RecipesPage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<IRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<IRecipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/recipes?search=${search}`);
      const data = res.data?.data?.recipes ?? res.data?.recipes ?? [];
      if (res.data.success) setRecipes(data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recipe?")) return;
    try {
      const res = await api.delete(`/recipes/${id}`);
      if (res.data.success) setRecipes(prev => prev.filter(r => r._id !== id));
    } catch (error) { console.error(error); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-stone-800">Recipes</h1><p className="text-stone-500 text-sm">Manage product recipes (BOM)</p></div>
        <button onClick={() => navigate("/add-recipe")} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md"><Plus size={18} /> Add Recipe</button>
      </div>

      <div className="bg-white rounded-xl p-4 mb-6 border">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Search recipes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" /></div>
          {search && <button onClick={() => setSearch("")} className="px-3 py-2 text-red-500"><X size={18} /></button>}
          <button onClick={fetchRecipes} className="px-3 py-2 border rounded-lg"><RefreshCw size={18} /></button>
        </div>
      </div>

      {loading ? <div className="flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div> : recipes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center"><ChefHat size={48} className="mx-auto text-stone-300 mb-3" /><h3 className="text-lg font-semibold">No recipes found</h3><button onClick={() => navigate("/add-recipe")} className="mt-4 px-5 py-2 bg-orange-500 text-white rounded-lg">Add first recipe</button></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]"><thead className="bg-stone-50 border-b"><tr><th className="px-4 py-3 text-left text-xs uppercase">Product</th><th className="px-4 py-3 text-center text-xs uppercase">Yield</th><th className="px-4 py-3 text-center text-xs uppercase">Ingredients</th><th className="px-4 py-3 text-right text-xs uppercase">Total Cost</th><th className="px-4 py-3 text-center text-xs uppercase">Status</th><th className="px-4 py-3 text-center text-xs uppercase">Actions</th></tr></thead>
            <tbody>{recipes.map((recipe, idx) => (<tr key={recipe._id} className={`border-b hover:bg-stone-50 ${idx === recipes.length-1 ? 'border-b-0' : ''}`}><td className="px-4 py-3 font-medium">{recipe.productName}</td><td className="px-4 py-3 text-center text-sm">{recipe.yieldQuantity} {recipe.yieldUnit}</td><td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs">{recipe.ingredients.length} items</span></td><td className="px-4 py-3 text-right font-medium">₹{recipe.totalCost}</td><td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${recipe.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{recipe.isActive ? "Active" : "Inactive"}</span></td><td className="px-4 py-3 text-center"><div className="flex gap-2 justify-center"><button onClick={() => { setSelectedRecipe(recipe); setIsModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-purple-50"><Eye size={16} className="text-purple-600" /></button><button onClick={() => navigate(`/recipes/${recipe._id}/edit`)} className="p-1.5 rounded-lg hover:bg-stone-100"><Edit2 size={16} /></button><button onClick={() => handleDelete(recipe._id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={16} className="text-red-500" /></button></div></td></tr>))}</tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-stone-50 p-4 border-b flex justify-between items-center"><h2 className="text-xl font-bold">{selectedRecipe.productName}</h2><button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-stone-200"><X size={18} /></button></div>
            <div className="p-6 space-y-6">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200"><div className="flex justify-between"><span className="text-sm text-stone-600">Yield:</span><span className="font-semibold">{selectedRecipe.yieldQuantity} {selectedRecipe.yieldUnit}</span></div><div className="flex justify-between mt-2"><span className="text-sm text-stone-600">Wastage:</span><span className="font-semibold text-orange-600">{selectedRecipe.wastagePercentage}%</span></div></div>
              <div><h3 className="font-semibold mb-3">Ingredients</h3><div className="space-y-2">{selectedRecipe.ingredients.map((ing, i) => (<div key={i} className="flex justify-between items-center p-2 bg-stone-50 rounded-lg"><span>{ing.ingredientName}</span><span>{ing.quantity} {ing.unit}</span><span className="font-medium">₹{(ing.quantity * ing.costPrice).toFixed(2)}</span></div>))}</div></div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200"><div className="flex justify-between"><span className="text-sm text-stone-600">Total Cost:</span><span className="text-xl font-bold text-red-600">₹{selectedRecipe.totalCost}</span></div><div className="flex justify-between mt-2"><span className="text-sm text-stone-600">With Wastage:</span><span className="font-semibold text-red-600">₹{(selectedRecipe.totalCost * (1 + selectedRecipe.wastagePercentage/100)).toFixed(2)}</span></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}