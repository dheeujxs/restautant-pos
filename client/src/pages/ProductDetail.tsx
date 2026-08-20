import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Heart, Star, Shield, Tag, Layers,
  AlertTriangle, Leaf, Coffee, ChevronRight, ChevronDown, ChevronUp,
  Package2, CheckCircle, XCircle, Zap, Award, Info,
  ArrowLeft, Edit2, Trash2, Utensils, Flame, Martini, Salad, Cake,
  ChefHat, Circle
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
  "Main Kitchen": { icon: Utensils, color: "#f97316" },
  "Tandoor":      { icon: Flame, color: "#ef4444" },
  "Bar":          { icon: Martini, color: "#8b5cf6" },
  "Cold Kitchen": { icon: Salad, color: "#0891b2" },
  "Bakery":       { icon: Cake, color: "#ec4899" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function DietaryBadge({ type }) {
  const c = DIETARY_COLORS[type] || DIETARY_COLORS["Veg"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 6,
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
      padding: "3px 9px", borderRadius: 20, fontSize: 11,
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

function RecommendedCard({ dish, onClick }) {
  const diet = DIETARY_COLORS[dish.dietaryType] || DIETARY_COLORS["Veg"];
  const imgUrl = dish.image
    ? (dish.image.startsWith("http") ? dish.image : `/uploads/${dish.image}`)
    : null;
  // Get price from first variant or direct price
  const priceDisplay = dish.variants?.length > 0
    ? `₹${Math.min(...dish.variants.map(v => v.price)).toFixed(2)}+`
    : `₹${(dish.price ?? 0).toFixed(2)}`;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: 12, border: "1px solid #f0ece4",
        overflow: "hidden", cursor: "pointer", transition: "all 0.18s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ height: 100, background: "linear-gradient(135deg,#fef3e2,#fde8d0)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {imgUrl
          ? <img src={imgUrl} alt={dish.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Package2 size={32} color="#f97316" style={{ opacity: 0.25 }} />
        }
        <Circle size={8} fill={diet.dot} color={diet.dot} style={{ position: "absolute", top: 7, right: 7, border: "2px solid #fff" }} />
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dish.name}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af" }}>{dish.categoryName}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#f97316" }}>{priceDisplay}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 16, r = 8, mb = 0 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f0ece4 25%,#faf8f5 50%,#f0ece4 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: mb }} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DishDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dish, setDish] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [wishlist, setWishlist] = useState(false);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [imgError, setImgError] = useState(false);

  // Fetch dish
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSelectedVariant(0);
    setImgError(false);
    setActiveTab("overview");

    api.get(`/dishes/${id}`)
      .then(res => {
        if (res.data.success) {
          setDish(res.data.data);
          console.log("Dish data:", res.data.data);
        } else setError("Dish not found.");
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to load dish.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch recommended
  useEffect(() => {
    if (!dish?.categoryId) return;
    api.get(`/dishes?limit=8&categoryId=${dish.categoryId}`)
      .then(res => {
        if (res.data.success) {
          const others = (res.data.data?.dishes || [])
            .filter(d => d._id !== dish._id)
            .slice(0, 4);
          setRecommended(others);
        }
      })
      .catch(() => {});
  }, [dish]);

  const handleDelete = async () => {
    if (!confirm("Delete this dish? This cannot be undone.")) return;
    try {
      const res = await api.delete(`/dishes/${dish._id}`);
      if (res.data.success) {
        toast.success("Dish deleted successfully");
        navigate("/dishes");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete dish");
    }
  };

  // ── Error state ──
  if (error) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <Package2 size={48} color="#f97316" style={{ opacity: 0.3, marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>Dish not found</h2>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 20px" }}>{error}</p>
        <button onClick={() => navigate("/dishes")}
          style={{ padding: "10px 22px", borderRadius: 10, background: "#f97316", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Back to Dishes
        </button>
      </div>
    );
  }

  const imageUrl = dish?.image
    ? (dish.image.startsWith("http") ? dish.image : `/uploads/${dish.image}`)
    : null;

  const diet = DIETARY_COLORS[dish?.dietaryType] || DIETARY_COLORS["Veg"];
  const kot = dish?.kotStation ? (KOT_MAP[dish.kotStation] || { icon: Utensils, color: "#6b7280" }) : null;
  const KotIcon = kot?.icon || Utensils;
  
  // Get current price from selected variant or direct price
  const hasVariants = dish?.variants && dish.variants.length > 0;
  const currentPrice = hasVariants
    ? (dish.variants[selectedVariant]?.price ?? 0)
    : (dish?.price ?? 0);
  const priceDisplay = hasVariants
    ? `₹${Math.min(...dish.variants.map(v => v.price)).toFixed(2)}+`
    : `₹${(dish?.price ?? 0).toFixed(2)}`;

  // Get ingredients from selected variant or empty
  const currentIngredients = hasVariants && dish.variants[selectedVariant]
    ? dish.variants[selectedVariant].ingredients || []
    : [];

  return (
    <div style={{ fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <button onClick={() => navigate("/dishes")}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={14} /> Dishes
        </button>
        <ChevronRight size={13} color="#d1d5db" />
        {loading
          ? <Skeleton w={120} h={14} />
          : <><span style={{ fontSize: 13, color: "#9ca3af" }}>{dish?.categoryName}</span><ChevronRight size={13} color="#d1d5db" /><span style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{dish?.name}</span></>
        }
      </div>

      {/* Main 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 26, alignItems: "start" }}>

        {/* LEFT: image */}
        <div style={{ position: "sticky", top: 20 }}>
          <div style={{
            background: "linear-gradient(135deg,#fef9f0,#fde8d0)", borderRadius: 20,
            border: "1px solid #fde8c5", aspectRatio: "1/1",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            {loading ? (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg,#f0ece4 25%,#faf8f5 50%,#f0ece4 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
            ) : imageUrl && !imgError ? (
              <img src={imageUrl} alt={dish.name} onError={() => setImgError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Package2 size={80} color="#f97316" style={{ opacity: 0.18 }} />
            )}

            {!loading && (
              <>
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

                <button onClick={() => setWishlist(w => !w)}
                  style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                  <Heart size={16} fill={wishlist ? "#ef4444" : "none"} color={wishlist ? "#ef4444" : "#6b7280"} />
                </button>

                <div style={{ position: "absolute", bottom: 14, left: 14, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.96)", borderRadius: 10, padding: "6px 12px", border: `1.5px solid ${diet.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                  <Circle size={10} fill={diet.dot} color={diet.dot} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: diet.text }}>{dish.dietaryType}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Title block */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid #f0ece4" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Skeleton w="40%" h={20} /><Skeleton w="70%" h={28} /><Skeleton w="50%" h={16} />
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <DietaryBadge type={dish.dietaryType} />
                  {dish.isActive
                    ? <Badge label="Active" color="#15803d" bg="#f0fdf4" />
                    : <Badge label="Inactive" color="#b91c1c" bg="#fef2f2" />
                  }
                  {dish.kotStation && (
                    <Badge 
                      label={`${dish.kotStation}`} 
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
                        <span style={{ fontSize: 32, fontWeight: 900, color: "#f97316", letterSpacing: "-0.02em" }}>
                          {priceDisplay}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 32, fontWeight: 900, color: "#f97316", letterSpacing: "-0.02em" }}>
                        {priceDisplay}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ Inclusive of all taxes</p>
                </div>
              </>
            )}
          </div>

          {/* Variant selector */}
          {!loading && hasVariants && (
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid #f0ece4" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={14} color="#7c3aed" /> Choose Variant
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {dish.variants.map((v, i) => (
                  <button key={i} onClick={() => setSelectedVariant(i)}
                    style={{ flex: 1, minWidth: 100, padding: "10px 8px", borderRadius: 10, cursor: "pointer", border: selectedVariant === i ? "2px solid #f97316" : "1.5px solid #e5e7eb", background: selectedVariant === i ? "#fff7ed" : "#fafafa", transition: "all 0.15s" }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: selectedVariant === i ? "#f97316" : "#374151" }}>{v.name}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: selectedVariant === i ? "#f97316" : "#1f2937" }}>₹{v.price}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick info grid */}
          {!loading && (
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
                    icon: <Coffee size={14} color="#0891b2" />, 
                    label: "Base", 
                    value: dish.baseIngredient 
                  },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                    <span>{item.icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit / Delete Buttons */}
          {!loading && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDelete}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={() => navigate(`/dishes/${dish._id}/edit`)}
                style={{ flex: 2, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f97316,#ef4444)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 2px 8px rgba(249,115,22,0.3)" }}>
                <Edit2 size={14} /> Edit Dish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section */}
      {!loading && dish && (
        <div style={{ marginTop: 32 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#fff", borderRadius: 12, padding: 6, border: "1px solid #f0ece4", width: "fit-content" }}>
            {[
              { id: "overview", label: "Overview" },
              { id: "ingredients", label: `Ingredients (${currentIngredients.length})` },
              ...(hasVariants ? [{ id: "variants", label: "Variants" }] : []),
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: activeTab === t.id ? "#f97316" : "transparent", color: activeTab === t.id ? "#fff" : "#6b7280", transition: "all 0.18s" }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24, alignItems: "start" }}>

            {/* Tab content */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px", border: "1px solid #f0ece4" }}>

              {activeTab === "overview" && (
                <>
                  <SectionHeading><Info size={16} color="#f97316" /> About this dish</SectionHeading>
                  {dish.description
                    ? <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.75, margin: "0 0 24px" }}>{dish.description}</p>
                    : <p style={{ fontSize: 14, color: "#9ca3af", fontStyle: "italic", margin: "0 0 24px" }}>No description provided.</p>
                  }
                  <SectionHeading>Quick Info</SectionHeading>
                  <div>
                    <InfoRow icon={<Tag size={14} />} label="Category" value={dish.categoryName} />
                    <InfoRow icon={<Tag size={14} />} label="Dietary Type" value={dish.dietaryType} />
                    {dish.kotStation && <InfoRow icon={<KotIcon size={14} color={kot?.color || "#6b7280"} />} label="KOT Station" value={dish.kotStation} />}
                    {dish.glassType && <InfoRow icon={<Coffee size={14} />} label="Glass Type" value={dish.glassType} />}
                    {dish.baseIngredient && <InfoRow icon={<Coffee size={14} />} label="Base Ingredient" value={dish.baseIngredient} />}
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
                          style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#f97316", fontSize: 13, fontWeight: 700, padding: "8px 0" }}>
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
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 12, border: selectedVariant === i ? "2px solid #f97316" : "1px solid #f0ece4", background: selectedVariant === i ? "#fff7ed" : "#fafafa", cursor: "pointer", transition: "all 0.15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: selectedVariant === i ? "#fed7aa" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Layers size={16} color={selectedVariant === i ? "#f97316" : "#9ca3af"} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>{v.name}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>Price: ₹{v.price}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: selectedVariant === i ? "#f97316" : "#374151" }}>₹{v.price.toFixed(2)}</p>
                          {selectedVariant === i && <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316" }}>Selected ✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Recommended sidebar */}
            <div>
              {recommended.length > 0 && (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: "0 0 14px", letterSpacing: "-0.01em" }}>
                    You may also like
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {recommended.map(d => (
                      <RecommendedCard key={d._id} dish={d} onClick={() => navigate(`/dishes/${d._id}`)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}