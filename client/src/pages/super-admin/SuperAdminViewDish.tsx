// pages/super-admin/SuperAdminViewDish.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {superAdminApi} from "../../services/api";
import {
  Heart, Star, Shield, Tag, Layers,
  AlertTriangle, Leaf, Coffee, ChevronRight, ChevronDown, ChevronUp,
  Package2, CheckCircle, XCircle, Zap, Award, Info,
  ArrowLeft, Edit2, Trash2, Building2, MapPin, Clock, Utensils,
  Eye, Copy, Printer, Download, Circle, Flame, Martini, Salad, Cake
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const DIETARY_COLORS = {
  "Veg":        { bg: "#f0fdf4", border: "#16a34a", dot: "#16a34a", text: "#15803d" },
  "Non-veg":    { bg: "#fef2f2", border: "#dc2626", dot: "#dc2626", text: "#b91c1c" },
  "Vegan":      { bg: "#f0fdf4", border: "#15803d", dot: "#15803d", text: "#14532d" },
  "Jain":       { bg: "#fffbeb", border: "#b45309", dot: "#b45309", text: "#92400e" },
  "Eggetarian": { bg: "#fefce8", border: "#ca8a04", dot: "#ca8a04", text: "#854d0e" },
};

const KOT_MAP = {
  "Main Kitchen": { icon: Utensils, color: "#f97316", desc: "Curries, gravies, main course" },
  "Tandoor":      { icon: Flame, color: "#ef4444", desc: "Naan, roti, tandoori items" },
  "Bar":          { icon: Martini, color: "#8b5cf6", desc: "Drinks, cocktails, mocktails" },
  "Cold Kitchen": { icon: Salad, color: "#0891b2", desc: "Salads, cold starters" },
  "Bakery":       { icon: Cake, color: "#ec4899", desc: "Desserts, pastries, bread" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function DietaryBadge({ type }) {
  const c = DIETARY_COLORS[type] || DIETARY_COLORS["Veg"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20,
      background: c.bg, border: `1.5px solid ${c.border}`,
      fontSize: 12, fontWeight: 700, color: c.text, letterSpacing: "0.03em",
    }}>
      <Circle size={8} fill={c.dot} color={c.dot} />
      {type}
    </span>
  );
}

function Badge({ label, color = "#f97316", bg = "#fff7ed" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 20, fontSize: 11,
      fontWeight: 700, color, background: bg, letterSpacing: "0.04em",
    }}>
      {label}
    </span>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7280", fontSize: 13 }}>
        {icon} {label}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{value}</span>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 14px", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
      {children}
    </h3>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminViewDish() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSelectedVariant(0);
    setImgError(false);
    setActiveTab("overview");

    superAdminApi.get(`/super-admin/dishes/${id}`)
      .then(res => {
        if (res.data.success) {
          setDish(res.data.data);
        } else setError("Dish not found.");
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to load dish.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this dish? This cannot be undone.")) return;
    try {
      const res = await superAdminApi.delete(`/super-admin/dishes/${dish._id}`);
      if (res.data.success) {
        toast.success("Dish deleted successfully");
        navigate("/super-admin/dishes");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete dish");
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #f0ece4", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading dish...</p>
        </div>
      </div>
    );
  }

  if (error || !dish) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <Package2 size={48} color="#8b5cf6" style={{ opacity: 0.3, marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>Dish not found</h2>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 20px" }}>{error}</p>
        <button onClick={() => navigate("/super-admin/dishes")}
          style={{ padding: "10px 22px", borderRadius: 10, background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Back to Dishes
        </button>
      </div>
    );
  }

  const imageUrl = dish.image
    ? (dish.image.startsWith("http") ? dish.image : `/uploads/${dish.image}`)
    : null;

  const diet = DIETARY_COLORS[dish.dietaryType] || DIETARY_COLORS["Veg"];
  const kot = dish.kotStation ? (KOT_MAP[dish.kotStation] || { icon: Utensils, color: "#6b7280", desc: "" }) : null;
  const KotIcon = kot?.icon || Utensils;
  
  const hasVariants = dish.variants && dish.variants.length > 0;
  const priceDisplay = hasVariants
    ? `₹${Math.min(...dish.variants.map(v => v.price)).toFixed(2)}+`
    : `₹${(dish.price ?? 0).toFixed(2)}`;

  const currentIngredients = hasVariants && dish.variants[selectedVariant]
    ? dish.variants[selectedVariant].ingredients || []
    : [];

  return (
    <div style={{ fontFamily: "'DM Sans','Inter',sans-serif", padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <button onClick={() => navigate("/super-admin/dishes")}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={14} /> Dishes
        </button>
        <ChevronRight size={13} color="#d1d5db" />
        <span style={{ fontSize: 13, color: "#9ca3af" }}>{dish.categoryName}</span>
        <ChevronRight size={13} color="#d1d5db" />
        <span style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{dish.name}</span>
      </div>

      {/* Top Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate(`/super-admin/dishes/${dish._id}/edit`)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Edit2 size={14} /> Edit
        </button>
        <button onClick={handleDelete}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* Main 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 26, alignItems: "start" }}>

        {/* LEFT: image */}
        <div style={{ position: "sticky", top: 20 }}>
          <div style={{
            background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", borderRadius: 20,
            border: "1px solid #e5e7eb", aspectRatio: "1/1",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            {imageUrl && !imgError ? (
              <img src={imageUrl} alt={dish.name} onError={() => setImgError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Package2 size={80} color="#8b5cf6" style={{ opacity: 0.18 }} />
            )}

            {/* Status Badge */}
            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: dish.isActive ? "rgba(22,163,74,0.9)" : "rgba(220,38,38,0.9)",
                padding: "5px 11px", borderRadius: 20,
              }}>
                {dish.isActive ? <CheckCircle size={12} color="#fff" /> : <XCircle size={12} color="#fff" />}
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>
                  {dish.isActive ? "AVAILABLE" : "UNAVAILABLE"}
                </span>
              </span>
            </div>

            {/* Dietary Badge */}
            <div style={{ position: "absolute", bottom: 14, left: 14, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.96)", borderRadius: 10, padding: "6px 12px", border: `1.5px solid ${diet.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <Circle size={10} fill={diet.dot} color={diet.dot} />
              <span style={{ fontSize: 12, fontWeight: 700, color: diet.text }}>{dish.dietaryType}</span>
            </div>

            {/* Created By Badge */}
            <div style={{ position: "absolute", bottom: 14, right: 14 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: 20,
                background: dish.createdBy ? "rgba(59,130,246,0.9)" : "rgba(139,92,246,0.9)",
                fontSize: 10, fontWeight: 700, color: "#fff"
              }}>
                <Shield size={12} />
                {dish.createdBy ? 'Admin' : 'Super Admin'}
              </span>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
            <div style={{ background: "#f5f3ff", borderRadius: 10, padding: "12px", textAlign: "center" }}>
              <Building2 size={16} color="#8b5cf6" style={{ margin: "0 auto 4px" }} />
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Restaurant</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{dish.restaurantName}</p>
            </div>
            <div style={{ background: "#f3f4f6", borderRadius: 10, padding: "12px", textAlign: "center" }}>
              <MapPin size={16} color="#6b7280" style={{ margin: "0 auto 4px" }} />
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Branch</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{dish.branchName || 'All Branches'}</p>
            </div>
          </div>
        </div>

        {/* RIGHT: details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Title block */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid #f0ece4" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <DietaryBadge type={dish.dietaryType} />
              {dish.isActive
                ? <Badge label="Active" color="#15803d" bg="#f0fdf4" />
                : <Badge label="Inactive" color="#b91c1c" bg="#fef2f2" />
              }
              {dish.kotStation && (
                <Badge 
                  label={dish.kotStation} 
                  color="#6b7280" 
                  bg="#f9fafb" 
                />
              )}
              {hasVariants && <Badge label="Multiple Sizes" color="#7c3aed" bg="#f5f3ff" />}
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
              {dish.name}
            </h1>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#9ca3af" }}>
              {dish.categoryName}
            </p>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                {hasVariants ? (
                  <>
                    <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>Starting from</span>
                    <span style={{ fontSize: 32, fontWeight: 900, color: "#8b5cf6", letterSpacing: "-0.02em" }}>
                      {priceDisplay}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 32, fontWeight: 900, color: "#8b5cf6", letterSpacing: "-0.02em" }}>
                    {priceDisplay}
                  </span>
                )}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ Inclusive of all taxes</p>
            </div>
          </div>

          {/* Variant selector */}
          {hasVariants && (
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid #f0ece4" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={14} color="#7c3aed" /> Choose Variant
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {dish.variants.map((v, i) => (
                  <button key={i} onClick={() => setSelectedVariant(i)}
                    style={{ flex: 1, minWidth: 100, padding: "10px 8px", borderRadius: 10, cursor: "pointer", border: selectedVariant === i ? "2px solid #8b5cf6" : "1.5px solid #e5e7eb", background: selectedVariant === i ? "#f5f3ff" : "#fafafa", transition: "all 0.15s" }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: selectedVariant === i ? "#8b5cf6" : "#374151" }}>{v.name}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: selectedVariant === i ? "#8b5cf6" : "#1f2937" }}>₹{v.price}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick info grid */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid #f0ece4" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                dish.kotStation && { 
                  icon: <KotIcon size={14} color={kot?.color || "#6b7280"} />, 
                  label: "KOT Station", 
                  value: dish.kotStation 
                },
                dish.glassType && { 
                  icon: <Coffee size={14} color="#0891b2" />, 
                  label: "Glass Type", 
                  value: dish.glassType 
                },
                dish.baseIngredient && { 
                  icon: <Leaf size={14} color="#16a34a" />, 
                  label: "Base", 
                  value: dish.baseIngredient 
                },
                dish.prepTimeMinutes && { 
                  icon: <Clock size={14} color="#f97316" />, 
                  label: "Prep Time", 
                  value: `${dish.prepTimeMinutes} min` 
                },
                dish.hasVariants && { 
                  icon: <Layers size={14} color="#7c3aed" />, 
                  label: "Variants", 
                  value: `${dish.variants.length} variants` 
                },
                dish.currentStock !== undefined && { 
                  icon: <Package2 size={14} color="#6b7280" />, 
                  label: "Stock", 
                  value: `${dish.currentStock} ${dish.stockType || 'units'}` 
                },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                  <span style={{ width: 20, textAlign: "center" }}>{item.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - Tabs */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#fff", borderRadius: 12, padding: 6, border: "1px solid #f0ece4", width: "fit-content" }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "ingredients", label: `Ingredients (${currentIngredients.length})` },
            ...(hasVariants ? [{ id: "variants", label: "Variants" }] : []),
            { id: "metadata", label: "Metadata" },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: activeTab === t.id ? "#8b5cf6" : "transparent", color: activeTab === t.id ? "#fff" : "#6b7280", transition: "all 0.18s" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: "24px", border: "1px solid #f0ece4" }}>

          {activeTab === "overview" && (
            <>
              <SectionHeading><Info size={16} color="#8b5cf6" /> About this dish</SectionHeading>
              {dish.description
                ? <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.75, margin: "0 0 24px" }}>{dish.description}</p>
                : <p style={{ fontSize: 14, color: "#9ca3af", fontStyle: "italic", margin: "0 0 24px" }}>No description provided.</p>
              }
              <SectionHeading>Details</SectionHeading>
              <div>
                <InfoRow icon={<Tag size={14} />} label="Category" value={dish.categoryName} />
                <InfoRow icon={<Utensils size={14} />} label="Dietary Type" value={dish.dietaryType} />
                {dish.kotStation && <InfoRow icon={<KotIcon size={14} color={kot?.color || "#6b7280"} />} label="KOT Station" value={dish.kotStation} />}
                {dish.glassType && <InfoRow icon={<Coffee size={14} />} label="Glass Type" value={dish.glassType} />}
                {dish.baseIngredient && <InfoRow icon={<Leaf size={14} />} label="Base Ingredient" value={dish.baseIngredient} />}
                {dish.prepTimeMinutes && <InfoRow icon={<Clock size={14} />} label="Prep Time" value={`${dish.prepTimeMinutes} minutes`} />}
                <InfoRow
                  icon={<CheckCircle size={14} color={dish.isActive ? "#16a34a" : "#dc2626"} />}
                  label="Status"
                  value={dish.isActive ? "Active" : "Inactive"}
                />
                {hasVariants && (
                  <InfoRow
                    icon={<Layers size={14} color="#7c3aed" />}
                    label="Variants"
                    value={`${dish.variants.length} variants available`}
                  />
                )}
              </div>
            </>
          )}

          {activeTab === "ingredients" && (
            <>
              <SectionHeading><Leaf size={16} color="#16a34a" /> Recipe Ingredients</SectionHeading>
              {currentIngredients.length > 0 ? (
                <>
                  <div style={{ border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", borderBottom: "1px solid #e5e7eb" }}>Ingredient</th>
                          <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#9ca3af", borderBottom: "1px solid #e5e7eb" }}>Quantity</th>
                          <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#9ca3af", borderBottom: "1px solid #e5e7eb" }}>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllIngredients ? currentIngredients : currentIngredients.slice(0, 6)).map((ing, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f9fafb", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "#111827" }}>{ing.ingredientName}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "#374151", textAlign: "right", fontWeight: 600 }}>{ing.quantity}</td>
                            <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af", textAlign: "right" }}>{ing.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {currentIngredients.length > 6 && (
                    <button onClick={() => setShowAllIngredients(s => !s)}
                      style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#8b5cf6", fontSize: 13, fontWeight: 700, padding: "8px 0" }}>
                      {showAllIngredients
                        ? <><ChevronUp size={15} /> Show Less</>
                        : <><ChevronDown size={15} /> Show All {currentIngredients.length} Ingredients</>}
                    </button>
                  )}
                </>
              ) : (
                <p style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>No ingredients listed for this variant.</p>
              )}
            </>
          )}

          {activeTab === "variants" && hasVariants && (
            <>
              <SectionHeading><Layers size={16} color="#7c3aed" /> Available Variants</SectionHeading>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {dish.variants.map((v, i) => (
                  <div key={i} onClick={() => setSelectedVariant(i)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 12, border: selectedVariant === i ? "2px solid #8b5cf6" : "1px solid #f0ece4", background: selectedVariant === i ? "#f5f3ff" : "#fafafa", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: selectedVariant === i ? "#e9d5ff" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Layers size={16} color={selectedVariant === i ? "#8b5cf6" : "#9ca3af"} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>{v.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>Ingredients: {v.ingredients?.length || 0}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: selectedVariant === i ? "#8b5cf6" : "#374151" }}>₹{v.price.toFixed(2)}</p>
                      {selectedVariant === i && <span style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6" }}>Selected ✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "metadata" && (
            <>
              <SectionHeading><Info size={16} color="#8b5cf6" /> Metadata</SectionHeading>
              <div>
                <InfoRow icon={<Shield size={14} />} label="Created By" value={dish.createdBy ? 'Admin' : 'Super Admin'} />
                <InfoRow icon={<Shield size={14} />} label="Created Name" value={dish.createdByName || 'N/A'} />
                <InfoRow icon={<Clock size={14} />} label="Created At" value={new Date(dish.createdAt).toLocaleString()} />
                <InfoRow icon={<Clock size={14} />} label="Last Updated" value={new Date(dish.updatedAt).toLocaleString()} />
                <InfoRow icon={<Package2 size={14} />} label="Stock Type" value={dish.stockType || 'recipe'} />
                <InfoRow icon={<Package2 size={14} />} label="Current Stock" value={dish.currentStock || 0} />
                <InfoRow icon={<Building2 size={14} />} label="Restaurant" value={dish.restaurantName} />
                <InfoRow icon={<MapPin size={14} />} label="Branch" value={dish.branchName || 'All Branches'} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}