import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Plus, Trash2, ChefHat, Package, Layers, Sparkles, Loader2 } from 'lucide-react';

interface IProduct { _id: string; name: string; }
interface IIngredient { _id: string; name: string; unit: string; costPrice: number; }

export default function EditRecipePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    productId: "", productName: "", yieldQuantity: 1, yieldUnit: "plate",
    ingredients: [] as any[], wastagePercentage: 0, isActive: true,
  });

  useEffect(() => {
    Promise.all([api.get('/products?limit=100'), api.get('/ingredients?limit=100'), api.get(`/recipes/${id}`)])
      .then(([pRes, iRes, rRes]) => {
        setProducts(pRes.data?.data?.products ?? []);
        setIngredients(iRes.data?.data?.ingredients ?? []);
        if (rRes.data.success) {
          const recipe = rRes.data.data;
          setForm({
            productId: recipe.productId || "", productName: recipe.productName || "",
            yieldQuantity: recipe.yieldQuantity || 1, yieldUnit: recipe.yieldUnit || "plate",
            ingredients: recipe.ingredients || [], wastagePercentage: recipe.wastagePercentage || 0,
            isActive: recipe.isActive !== false,
          });
        } else setError("Recipe not found");
      }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const addIngredient = () => setForm(prev => ({ ...prev, ingredients: [...prev.ingredients, { ingredientId: "", ingredientName: "", quantity: 0, unit: "", costPrice: 0 }] }));
  const updateIngredient = (idx: number, field: string, val: any) => {
    const updated = [...form.ingredients];
    updated[idx][field] = val;
    if (field === "ingredientId") {
      const ing = ingredients.find(i => i._id === val);
      if (ing) { updated[idx].ingredientName = ing.name; updated[idx].unit = ing.unit; updated[idx].costPrice = ing.costPrice; }
    }
    setForm(prev => ({ ...prev, ingredients: updated }));
  };
  const removeIngredient = (idx: number) => setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }));
  const totalCost = form.ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.costPrice), 0);

  const handleSubmit = async () => {
    if (!form.productId) { setError("Select a product"); return; }
    if (form.ingredients.length === 0) { setError("Add at least one ingredient"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await api.patch(`/recipes/${id}`, form);
      if (res.data.success) navigate('/recipes');
    } catch (err: any) { setError(err.response?.data?.error || "Failed to update"); }
    finally { setSubmitting(false); }
  };

  const yieldUnits = ["plate", "piece", "glass", "bowl", "cup", "portion"];

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf9f7] to-[#f5f3ef]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg border bg-white flex"><ArrowLeft size={18} /></button><div><h1 className="text-xl font-bold text-stone-800">Edit Recipe</h1><p className="text-xs text-stone-400">Update product recipe</p></div></div>
          <div className="flex gap-2"><button onClick={() => navigate(-1)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2">{submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{submitting ? "Updating..." : "Update Recipe"}</button></div>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border rounded-xl text-red-600">{error}</div>}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5"><label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Select Product *</label><select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, productName: products.find(p => p._id === e.target.value)?.name || "" })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Select</option>{products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
          <div className="bg-white rounded-xl border p-5"><label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Yield</label><div className="grid grid-cols-2 gap-4"><input type="number" value={form.yieldQuantity} onChange={(e) => setForm({ ...form, yieldQuantity: parseInt(e.target.value) || 1 })} className="px-3 py-2 border rounded-lg text-sm" /><select value={form.yieldUnit} onChange={(e) => setForm({ ...form, yieldUnit: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">{yieldUnits.map(u => <option key={u} value={u}>{u}</option>)}</select></div></div>
          <div className="bg-white rounded-xl border p-5"><div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Ingredients</h3><button onClick={addIngredient} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm">+ Add Ingredient</button></div>{form.ingredients.length === 0 ? <div className="text-center py-8 text-stone-400">No ingredients added yet</div> : form.ingredients.map((ing, idx) => (<div key={idx} className="border rounded-lg p-3 mb-3"><div className="grid grid-cols-3 gap-2"><select value={ing.ingredientId} onChange={(e) => updateIngredient(idx, "ingredientId", e.target.value)} className="px-2 py-1.5 border rounded text-sm"><option value="">Select</option>{ingredients.map(i => <option key={i._id} value={i._id}>{i.name} (₹{i.costPrice}/{i.unit})</option>)}</select><input type="number" placeholder="Qty" value={ing.quantity} onChange={(e) => updateIngredient(idx, "quantity", parseFloat(e.target.value) || 0)} className="px-2 py-1.5 border rounded text-sm" /><input type="text" value={`₹${(ing.quantity * ing.costPrice).toFixed(2)}`} disabled className="px-2 py-1.5 border rounded text-sm bg-stone-50" /><button onClick={() => removeIngredient(idx)} className="text-red-500"><Trash2 size={18} /></button></div></div>))}</div>
          <div className="bg-white rounded-xl border p-5"><label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Wastage %</label><input type="number" value={form.wastagePercentage} onChange={(e) => setForm({ ...form, wastagePercentage: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-200"><div className="flex justify-between"><span className="font-medium">Total Cost (per {form.yieldUnit})</span><span className="text-xl font-bold text-red-600">₹{totalCost.toFixed(2)}</span></div><div className="flex justify-between mt-2"><span className="text-sm">With Wastage ({form.wastagePercentage}%)</span><span className="font-semibold text-red-600">₹{(totalCost * (1 + form.wastagePercentage/100)).toFixed(2)}</span></div></div>
          <div className="bg-white rounded-xl border p-5"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded" /><span>Active</span></label></div>
        </div>
      </div>
    </div>
  );
}