import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Sparkles, Loader2, Plus, Trash2, ChefHat, Package, Layers, RefreshCw } from 'lucide-react';

interface IProduct {
  _id: string;
  name: string;
}

interface IIngredient {
  _id: string;
  name: string;
  unit: string;
  costPrice: number;
}

interface IIngredientItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPrice: number;
}

const sectionStyle = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  overflow: "hidden" as const,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const sectionHeaderStyle = {
  padding: "14px 20px",
  borderBottom: "1px solid #f3f4f6",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 6,
  display: "block",
};

const inputStyle = (hasError = false): React.CSSProperties => ({
  width: "100%",
  height: 40,
  border: `1px solid ${hasError ? "#fca5a5" : "#e5e7eb"}`,
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 14,
  background: "#fff",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
});

const selectStyle = (hasError = false): React.CSSProperties => ({
  ...inputStyle(hasError),
  cursor: "pointer",
  appearance: "auto" as any,
});

const defaultFormState = () => ({
  productId: "",
  productName: "",
  yieldQuantity: 1,
  yieldUnit: "plate",
  ingredients: [] as IIngredientItem[],
  wastagePercentage: 0,
  isActive: true,
});

export default function AddRecipePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(defaultFormState());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, ingredientsRes] = await Promise.all([
          api.get('/products?limit=100'),
          api.get('/ingredients?limit=100'),
        ]);
        if (productsRes.data.success) setProducts(productsRes.data.data?.products || productsRes.data.products || []);
        if (ingredientsRes.data.success) setIngredients(ingredientsRes.data.data?.ingredients || ingredientsRes.data.ingredients || []);
      } catch (err) {
        setError("Failed to load products and ingredients");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const updateField = (key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "productId") {
        const product = products.find(p => p._id === value);
        if (product) next.productName = product.name;
      }
      return next;
    });
  };

  const addIngredient = () => setForm(prev => ({
    ...prev,
    ingredients: [...prev.ingredients, { ingredientId: "", ingredientName: "", quantity: 0, unit: "", costPrice: 0 }],
  }));

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...form.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "ingredientId") {
      const ing = ingredients.find(i => i._id === value);
      if (ing) {
        updated[index].ingredientName = ing.name;
        updated[index].unit = ing.unit;
        updated[index].costPrice = ing.costPrice;
      }
    }
    setForm(prev => ({ ...prev, ingredients: updated }));
  };

  const removeIngredient = (index: number) =>
    setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));

  const totalCost = form.ingredients.reduce((sum, ing) => sum + ing.quantity * ing.costPrice, 0);

  const handleSubmit = async () => {
    if (!form.productId) { setError("Please select a product"); return; }
    if (form.ingredients.length === 0) { setError("Please add at least one ingredient"); return; }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const res = await api.post('/recipes', form);
      if (res.data.success) {
        setSuccess("Recipe created successfully!");
        setTimeout(() => { navigate('/recipes'); }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create recipe");
    } finally {
      setSubmitting(false);
    }
  };

  const yieldUnits = ["plate", "piece", "glass", "bowl", "cup", "portion"];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf9f7" }}>
        <Loader2 size={36} color="#f97316" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f7", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
      `}</style>

<div style={{ padding: "0 24px 40px" }}>

        {/* Navbar */}
        <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ArrowLeft size={15} color="#6b7280" />
            </button>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Add New Recipe</h1>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Link products with ingredients (BOM)</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => { setForm(defaultFormState()); setError(""); setSuccess(""); }}
              style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <RefreshCw size={14} color="#6b7280" />
            </button>
            <button onClick={() => navigate(-1)} style={{ height: 36, padding: "0 18px", borderRadius: 8, border: "none", background: "#1f2937", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={13} /> Back to Recipes
            </button>
          </div>
        </div>

        {/* Error / Success banners */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "11px 16px", borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "11px 16px", borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
            {success}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Product Selection */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <Package size={15} color="#f97316" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Product Selection</span>
            </div>
            <div style={{ padding: 20 }}>
              <label style={labelStyle}>Select Product <span style={{ color: "#ef4444" }}>*</span></label>
              <select value={form.productId} onChange={e => updateField("productId", e.target.value)} style={selectStyle()}>
                <option value="">Select a product</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Yield Information */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <Layers size={15} color="#f97316" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Yield Information</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                <div>
                  <label style={labelStyle}>Yield Quantity</label>
                  <input type="number" min="1" value={form.yieldQuantity} onChange={e => updateField("yieldQuantity", parseInt(e.target.value) || 1)} style={inputStyle()} />
                </div>
                <div>
                  <label style={labelStyle}>Yield Unit</label>
                  <select value={form.yieldUnit} onChange={e => updateField("yieldUnit", e.target.value)} style={selectStyle()}>
                    {yieldUnits.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div style={sectionStyle}>
            <div style={{ ...sectionHeaderStyle, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ChefHat size={15} color="#f97316" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Ingredients</span>
              </div>
              <button type="button" onClick={addIngredient} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, color: "#f97316", cursor: "pointer" }}>
                <Plus size={13} /> Add Ingredient
              </button>
            </div>
            <div style={{ padding: 20 }}>
              {form.ingredients.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, background: "#fafafa", borderRadius: 10, border: "2px dashed #e5e7eb" }}>
                  <ChefHat size={32} color="#d1d5db" />
                  <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>No ingredients added yet.</p>
                  <button onClick={addIngredient} style={{ marginTop: 12, padding: "7px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#f97316,#ef4444)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Add First Ingredient
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {form.ingredients.map((ing, idx) => (
                    <div key={idx} style={{ background: "#fafafa", borderRadius: 10, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr auto", gap: 12, alignItems: "end" }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 4, display: "block" }}>Ingredient</label>
                          <select value={ing.ingredientId} onChange={e => updateIngredient(idx, "ingredientId", e.target.value)}
                            style={{ width: "100%", height: 36, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#fff", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                            <option value="">Select</option>
                            {ingredients.map(i => <option key={i._id} value={i._id}>{i.name} (₹{i.costPrice}/{i.unit})</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 4, display: "block" }}>Quantity</label>
                          <input type="number" min="0" step="0.01" value={ing.quantity} onChange={e => updateIngredient(idx, "quantity", parseFloat(e.target.value) || 0)}
                            style={{ width: "100%", height: 36, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 4, display: "block" }}>Cost (₹)</label>
                          <input type="text" value={`₹${(ing.quantity * ing.costPrice).toFixed(2)}`} disabled
                            style={{ width: "100%", height: 36, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#f3f4f6", color: "#6b7280", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <button onClick={() => removeIngredient(idx)} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cost Summary */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <Layers size={15} color="#f97316" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Cost Summary</span>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Wastage Percentage (%)</label>
                <input type="number" min="0" max="100" value={form.wastagePercentage} onChange={e => updateField("wastagePercentage", parseFloat(e.target.value) || 0)} style={inputStyle()} />
              </div>
              <div style={{ background: "#fef2f2", borderRadius: 10, padding: 16, border: "1px solid #fecaca" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>Total Cost (per {form.yieldUnit})</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>₹{totalCost.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>With Wastage ({form.wastagePercentage}%)</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#dc2626" }}>₹{(totalCost * (1 + form.wastagePercentage / 100)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div style={sectionStyle}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => updateField("isActive", e.target.checked)} style={{ width: 16, height: 16, accentColor: "#f97316", cursor: "pointer" }} />
                <label htmlFor="isActive" style={{ fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" }}>
                  Active <span style={{ color: "#9ca3af" }}>(Recipe will be used for stock calculation)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button onClick={() => navigate(-1)} style={{ height: 40, padding: "0 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 500, color: "#6b7280", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ height: 40, padding: "0 24px", borderRadius: 8, border: "none", background: submitting ? "#fdba74" : "linear-gradient(135deg,#f97316,#ef4444)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 2px 8px rgba(249,115,22,0.35)" }}>
              {submitting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Creating…</> : <><Sparkles size={14} /> Create Recipe</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}