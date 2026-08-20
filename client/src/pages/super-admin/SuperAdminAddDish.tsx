// pages/super-admin/SuperAdminAddDish.tsx - FULL COMBO SUPPORT

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../services/api';
import { 
  Upload, Sparkles, Loader2, Package, Leaf, Coffee, 
  ChevronUp, ChevronDown, ArrowLeft, RefreshCw, Plus, Trash2, 
  AlertCircle, Search, CheckCircle, Info,
  X, Layers, Grid3x3, List, Home, Copy, FolderPlus, PackagePlus,
  Save, Building2, User, Phone, Mail, MapPin, Globe,
  Shield, Key, Eye, EyeOff, Clock, Edit2, Lock,
  Utensils, Truck, Car, Pizza, Salad, Cake, Beer, Wine,
  Tag, Store, ChevronRight, Flame, Martini, UtensilsCrossed,
  Gift, ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type DietaryType = 'Veg' | 'Non-veg' | 'Vegan' | 'Jain' | 'Eggetarian';
type KotStation  = 'Main Kitchen' | 'Tandoor' | 'Bar' | 'Cold Kitchen' | 'Bakery' | 'Grill';

const DIETARY_OPTIONS: DietaryType[] = ['Veg', 'Non-veg', 'Vegan', 'Jain', 'Eggetarian'];
const KOT_STATIONS:    KotStation[]  = ['Main Kitchen', 'Tandoor', 'Bar', 'Cold Kitchen', 'Bakery', 'Grill'];

const KOT_STATION_INFO: Record<KotStation, { icon: React.ElementType; desc: string; color: string }> = {
  'Main Kitchen': { icon: Utensils, desc: 'Curries, gravies, main course',   color: '#f97316' },
  'Tandoor':      { icon: Flame, desc: 'Naan, roti, tandoori items',       color: '#dc2626' },
  'Bar':          { icon: Martini, desc: 'Drinks, cocktails, mocktails',     color: '#7c3aed' },
  'Cold Kitchen': { icon: Salad, desc: 'Salads, cold starters',            color: '#0891b2' },
  'Bakery':       { icon: Cake, desc: 'Desserts, pastries, bread',        color: '#db2777' },
  'Grill':        { icon: UtensilsCrossed, desc: 'Grilled items, BBQ',               color: '#dc2626' },
};

interface Restaurant {
  _id: string;
  name: string;
}

interface ICategory    { _id: string; name: string; }
interface IIngredient  { _id: string; name: string; unit: string; currentStock: number; }

interface IDishForSelect {
  _id: string;
  name: string;
  categoryName: string;
  categoryId: string;
  variants?: any[];
  description?: string;
  image?: string;
  dietaryType?: string;
  kotStation?: string;
  glassType?: string;
  baseIngredient?: string;
  isActive?: boolean;
}

interface IVariantIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

interface IVariant {
  name: string;
  price: number;
  ingredients: IVariantIngredient[];
}

// ─── Combo Types ─────────────────────────────────────────────────────────────
interface IComboDish {
  dishId: string;
  dishName: string;
  variantName: string;
  variantPrice: number;
  variantIndex: number;
}

interface IForm {
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  image: string;
  dietaryType: DietaryType;
  kotStation: KotStation;
  glassType: string;
  baseIngredient: string;
  isActive: boolean;
  variants: IVariant[];
  stockType: string;
  currentStock: number;
  restaurantId: string;
  restaurantName: string;
  basePrice: number;
  // ─── Combo fields ──────────────────────────────────────────────────────
  isCombo: boolean;
  comboPrice: number;
  comboDishes: IComboDish[];
}

const defaultForm = (): IForm => ({
  name: '', description: '', categoryId: '', categoryName: '',
  image: '',
  dietaryType: 'Veg', kotStation: 'Main Kitchen',
  glassType: '', baseIngredient: '',
  isActive: true,
  variants: [{ name: '', price: 0, ingredients: [] }],
  stockType: 'recipe', currentStock: 0,
  restaurantId: '', restaurantName: '',
  basePrice: 0,
  isCombo: false,
  comboPrice: 0,
  comboDishes: [],
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' };
const reqStyle:   React.CSSProperties = { color: '#ef4444', marginLeft: 2 };
const errText:    React.CSSProperties = { fontSize: 11, color: '#ef4444' };
const helperText: React.CSSProperties = { fontSize: 11, color: '#9ca3af', marginTop: 2 };

const inputBase = (err = false): React.CSSProperties => ({
  height: 40, width: '100%', boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '0 12px', fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
});

const selectBase = (err = false): React.CSSProperties => ({
  ...inputBase(err), appearance: 'none', cursor: 'pointer', paddingRight: 32,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
});

// ─── Section Component ────────────────────────────────────────────────────────
function Section({ icon: Icon, iconColor = '#8b5cf6', title, children, defaultOpen = true }: {
  icon: React.ElementType; iconColor?: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(p => !p)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: '#fff', borderBottom: open ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', border: 'none', textAlign: 'left' }}>
        <Icon size={16} color={iconColor} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>{title}</span>
        {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </button>
      {open && <div style={{ padding: '20px 20px 24px' }}>{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminAddDish() {
  const navigate = useNavigate();

  const [form, setForm] = useState<IForm>(defaultForm());
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [allIngredients, setAllIngredients] = useState<IIngredient[]>([]);
  const [allDishes, setAllDishes] = useState<IDishForSelect[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  
  const [showDishModal, setShowDishModal] = useState(false);
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());
  const [selectedCategoryForDishes, setSelectedCategoryForDishes] = useState<string>('');

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setFetching(true);
      const [restaurantsRes, catRes, ingRes, dishesRes] = await Promise.all([
        superAdminApi.get('/super-admin/restaurants?limit=100'),
        superAdminApi.get('/categories?limit=100'),
        superAdminApi.get('/ingredients?limit=200'),
        superAdminApi.get('/dishes?limit=500'),
      ]);

      let restaurantsData = [];
      if (restaurantsRes.data?.success) {
        restaurantsData = restaurantsRes.data.data.restaurants || [];
      }
      setRestaurants(restaurantsData);

      if (catRes.data.success) setCategories(catRes.data.data?.categories || catRes.data.categories || []);
      if (ingRes.data.success) setAllIngredients(ingRes.data.data?.ingredients || []);
      if (dishesRes.data.success) {
        const dishes = dishesRes.data.data?.dishes || dishesRes.data.dishes || [];
        setAllDishes(dishes.map((d: any) => ({ 
          _id: d._id, 
          name: d.name, 
          categoryName: d.categoryName,
          categoryId: d.categoryId,
          variants: d.variants || [],
          description: d.description,
          image: d.image,
          dietaryType: d.dietaryType,
          kotStation: d.kotStation,
          glassType: d.glassType,
          baseIngredient: d.baseIngredient,
          isActive: d.isActive
        })));
      }

      if (restaurantsData.length > 0 && !form.restaurantId) {
        setForm(prev => ({ ...prev, restaurantId: restaurantsData[0]._id, restaurantName: restaurantsData[0].name }));
      }
    } catch (error) {
      console.error('Failed to fetch master data:', error);
      toast.error('Failed to load data');
    } finally {
      setFetching(false);
    }
  };

  const upd = <K extends keyof IForm>(key: K, value: IForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Image Upload ───────────────────────────────────────────────────────────
  const uploadImage = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('image', file);
    
    try {
      const res = await superAdminApi.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      
      if (res.data.success) {
        const imageUrl = res.data.data?.url || res.data.data?.secureUrl || res.data.url || res.data.imageUrl;
        if (imageUrl) return imageUrl;
        return null;
      }
      return null;
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.error || 'Image upload failed');
      return null;
    }
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { 
      setErrors(p => ({ ...p, image: 'Please upload an image file' })); 
      return; 
    }
    if (file.size > 5 * 1024 * 1024) { 
      setErrors(p => ({ ...p, image: 'Image must be less than 5MB' })); 
      return; 
    }
    
    setUploadingImg(true);
    setErrors(p => ({ ...p, image: '' }));
    
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    
    const url = await uploadImage(file);
    
    if (url) {
      upd('image', url);
      toast.success('Image uploaded successfully!');
    } else {
      URL.revokeObjectURL(preview);
      setImagePreview(null);
      setErrors(p => ({ ...p, image: 'Failed to upload image' }));
    }
    
    setUploadingImg(false);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }, []);

  // ── Combo Dish Functions ────────────────────────────────────────────────────
  const toggleDishSelection = (dishId: string) => {
    setSelectedDishIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dishId)) {
        newSet.delete(dishId);
      } else {
        newSet.add(dishId);
      }
      return newSet;
    });
  };

  const addSelectedDishesToCombo = () => {
    const selectedDishes = allDishes.filter(dish => selectedDishIds.has(dish._id));
    const newComboDishes: IComboDish[] = [];

    selectedDishes.forEach(dish => {
      if (dish.variants && dish.variants.length > 0) {
        dish.variants.forEach((variant: any, index: number) => {
          newComboDishes.push({
            dishId: dish._id,
            dishName: dish.name,
            variantName: variant.name,
            variantPrice: variant.price,
            variantIndex: index,
          });
        });
      } else {
        newComboDishes.push({
          dishId: dish._id,
          dishName: dish.name,
          variantName: 'Default',
          variantPrice: dish.variants?.[0]?.price || 0,
          variantIndex: 0,
        });
      }
    });

    // Calculate suggested combo price (sum of all variant prices - 15% discount)
    const totalPrice = newComboDishes.reduce((sum, d) => sum + d.variantPrice, 0);
    const suggestedPrice = Math.round(totalPrice * 0.85);

    // ✅ Add to comboDishes
    upd('comboDishes', [...form.comboDishes, ...newComboDishes]);
    if (form.comboPrice === 0) {
      upd('comboPrice', suggestedPrice);
    }

    setShowDishModal(false);
    setSelectedDishIds(new Set());
    toast.success(`Added ${selectedDishes.length} dish(es) to combo`);
  };

  const removeComboDish = (index: number) => {
    upd('comboDishes', form.comboDishes.filter((_, i) => i !== index));
  };

  const clearComboDishes = () => {
    upd('comboDishes', []);
    upd('comboPrice', 0);
  };

  const getFilteredDishesByCategory = () => {
    if (!selectedCategoryForDishes) return allDishes;
    return allDishes.filter(dish => dish.categoryId === selectedCategoryForDishes);
  };

  // ── Navigation Functions ──────────────────────────────────────────────────
  const handleAddCategory = () => {
    navigate('/super-admin/categories/new?returnTo=dish');
  };

  const handleAddIngredient = () => {
    navigate('/super-admin/ingredients/new?returnTo=dish');
  };

  // ── Variants Management ────────────────────────────────────────────────────
  const addVariant = () =>
    upd('variants', [...form.variants, { name: '', price: 0, ingredients: [] }]);

  const removeVariant = (idx: number) =>
    upd('variants', form.variants.filter((_, i) => i !== idx));

  const updateVariant = (idx: number, field: keyof IVariant, value: string | number) =>
    upd('variants', form.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));

  const addVariantIngredient = (variantIdx: number, ingredient: IVariantIngredient) =>
    upd('variants', form.variants.map((v, i) => i === variantIdx 
      ? { ...v, ingredients: [...v.ingredients, ingredient] } 
      : v));

  const removeVariantIngredient = (variantIdx: number, ingredientIdx: number) =>
    upd('variants', form.variants.map((v, i) => i === variantIdx 
      ? { ...v, ingredients: v.ingredients.filter((_, idx) => idx !== ingredientIdx) } 
      : v));

  // ── Validate & Submit ──────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    
    // Common validations
    if (!form.name.trim()) e.name = 'Dish name is required';
    if (!form.categoryId) e.categoryId = 'Category is required';
    if (!form.restaurantId) e.restaurantId = 'Please select a restaurant';
    
    // 🔥 Combo vs Regular validation
    if (form.isCombo) {
      // Combo validations
      if (form.comboDishes.length === 0) {
        e.comboDishes = 'Please add at least one dish to the combo';
      }
      if (form.comboPrice <= 0) {
        e.comboPrice = 'Combo price must be greater than 0';
      }
    } else {
      // Regular dish validations
      if (form.basePrice <= 0) e.basePrice = 'Base price must be greater than 0';
      if (!form.variants.length) e.variants = 'Add at least one variant';
      form.variants.forEach((v, i) => {
        if (!v.name) e[`v${i}name`] = 'Variant name required';
        if (v.price <= 0) e[`v${i}price`] = 'Valid price required';
        if (v.ingredients.length === 0) e[`v${i}ingredients`] = 'At least one ingredient required';
      });
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (uploadingImg) { toast.error('Please wait for image to finish uploading'); return; }
    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }
    setLoading(true);
    try {
      const selectedCategory = categories.find(c => c._id === form.categoryId);
      
      // ─── Build payload ──────────────────────────────────────────────────────
      let payload: any = {
        name: form.name.trim(),
        description: form.description?.trim() || '',
        categoryId: form.categoryId,
        categoryName: selectedCategory?.name || '',
        image: form.image || '',
        dietaryType: form.dietaryType,
        kotStation: form.kotStation,
        glassType: form.glassType || '',
        baseIngredient: form.baseIngredient || '',
        isActive: form.isActive,
        stockType: form.stockType || 'recipe',
        currentStock: Number(form.currentStock) || 0,
        restaurantId: form.restaurantId,
        restaurantName: form.restaurantName,
        isCombo: form.isCombo,
      };

      // ─── Combo or Regular ──────────────────────────────────────────────────
      if (form.isCombo) {
        // 🔥 COMBO MODE
        payload.comboPrice = Number(form.comboPrice) || 0;
        payload.comboVariants = form.comboDishes.map((d, index) => ({
          variantIndex: index,
          variantName: d.variantName,
          variantPrice: d.variantPrice,
        }));
        payload.hasVariants = false;
        payload.variants = [];
        payload.price = Number(form.comboPrice) || 0;
        payload.basePrice = Number(form.comboPrice) || 0;
        
        console.log('📤 Combo payload:', {
          isCombo: payload.isCombo,
          comboPrice: payload.comboPrice,
          comboVariants: payload.comboVariants.length,
        });
      } else {
        // 🔥 REGULAR DISH MODE
        payload.hasVariants = true;
        payload.variants = form.variants.map(v => ({
          ...v,
          ingredients: v.ingredients.map(ing => ({
            ingredientId: ing.ingredientId || '',
            ingredientName: ing.ingredientName || '',
            quantity: Number(ing.quantity) || 0,
            unit: ing.unit || 'pcs',
          }))
        }));
        payload.price = 0;
        payload.basePrice = Number(form.basePrice) || 0;
        payload.comboPrice = 0;
        payload.comboVariants = [];
        
        console.log('📤 Regular payload:', {
          hasVariants: payload.hasVariants,
          variants: payload.variants.length,
        });
      }

      console.log('📤 Full payload:', JSON.stringify(payload, null, 2));
      
      const res = await superAdminApi.post('/super-admin/dishes', payload);
      if (res.data.success) {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        toast.success(`${form.isCombo ? 'Combo' : 'Dish'} created successfully!`);
        navigate('/super-admin/dishes');
      } else {
        setErrors({ submit: res.data.error || 'Failed to create dish' });
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      setErrors({ submit: err.response?.data?.error || 'Failed to create dish' });
    } finally {
      setLoading(false);
    }
  };

  const kotInfo = KOT_STATION_INFO[form.kotStation];
  const filteredDishes = getFilteredDishesByCategory();
  const KotIcon = kotInfo.icon;
  const totalComboPrice = form.comboDishes.reduce((sum, d) => sum + d.variantPrice, 0);

  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
        <p style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>Loading dish data...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
        .switch {
          position: relative;
          width: 44px;
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .switch.active {
          background: #8b5cf6;
        }
        .switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .switch.active::after {
          transform: translateX(20px);
        }
        .combo-card {
          transition: all 0.2s;
        }
        .combo-card:hover {
          transform: translateX(4px);
        }
      `}</style>

      {/* Navbar */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/super-admin/dishes')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '0 16px',
              height: 36,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} />
            Back to Dishes
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add New {form.isCombo ? 'Combo' : 'Dish'}</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              {form.isCombo ? 'Create a combo with multiple dishes' : 'Create a new menu item with variants'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Restaurant Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            <Building2 size={14} color="#6b7280" />
            <select
              value={form.restaurantId}
              onChange={(e) => {
                const restaurant = restaurants.find(r => r._id === e.target.value);
                upd('restaurantId', e.target.value);
                upd('restaurantName', restaurant?.name || '');
              }}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: '#fff',
                fontSize: 12,
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                outline: 'none',
                minWidth: 160,
              }}
            >
              <option value="">Select Restaurant</option>
              {restaurants.map(r => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddCategory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 34,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#8b5cf6',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <FolderPlus size={14} />
            Category
          </button>

          <button
            onClick={handleAddIngredient}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 34,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#22c55e',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <PackagePlus size={14} />
            Ingredient
          </button>

          {!form.isCombo && (
            <button
              onClick={() => setShowDishModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 14px',
                height: 34,
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#f97316',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Copy size={14} />
              Add from Dishes
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px', maxWidth: 1000, margin: '0 auto' }}>

        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Image Section */}
          <Section icon={Upload} iconColor="#8b5cf6" title="Dish Image">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !imagePreview && !uploadingImg && document.getElementById('fileInput')?.click()}
              style={{ border: `2px dashed ${isDragging ? '#8b5cf6' : errors.image ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 10, background: '#fafafa', cursor: imagePreview || uploadingImg ? 'default' : 'pointer' }}
            >
              {uploadingImg ? (
                <div style={{ padding: 36, textAlign: 'center' }}>
                  <Loader2 size={26} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>Uploading…</p>
                </div>
              ) : imagePreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
                  <img src={imagePreview} alt="Preview" style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 10 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>Image ready ✓</p>
                    <button onClick={() => { setImagePreview(null); upd('image', ''); }} style={{ marginTop: 8, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Remove image
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <Upload size={20} color="#d1d5db" />
                  <p style={{ fontSize: 13, marginTop: 8 }}>Drop image here or <span style={{ color: '#8b5cf6', fontWeight: 600 }}>browse</span></p>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>JPG, PNG, WebP — max 5 MB</p>
                </div>
              )}
            </div>
            <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
            {errors.image && <p style={errText}>{errors.image}</p>}
          </Section>

          {/* Restaurant Assignment */}
          <Section icon={Building2} iconColor="#8b5cf6" title="Restaurant Assignment">
            <div>
              <label style={labelStyle}>Restaurant <span style={reqStyle}>*</span></label>
              <select
                value={form.restaurantId}
                onChange={(e) => {
                  const restaurant = restaurants.find(r => r._id === e.target.value);
                  upd('restaurantId', e.target.value);
                  upd('restaurantName', restaurant?.name || '');
                }}
                style={selectBase(!!errors.restaurantId)}
              >
                <option value="">Select a restaurant</option>
                {restaurants.map(r => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
              {errors.restaurantId && <span style={errText}>{errors.restaurantId}</span>}
              <span style={helperText}>Dish will be available across all branches of this restaurant</span>
            </div>
          </Section>

          {/* Basic Information */}
          <Section icon={Package} iconColor="#8b5cf6" title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Dish Name <span style={reqStyle}>*</span></label>
                <input type="text" value={form.name} onChange={e => upd('name', e.target.value)} placeholder={form.isCombo ? "e.g., Family Combo, Special Thali" : "e.g., Dal Tadka, Butter Chicken"} style={inputBase(!!errors.name)} />
                {errors.name && <span style={errText}>{errors.name}</span>}
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={3} value={form.description} onChange={e => upd('description', e.target.value)} placeholder="Describe the dish…" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={labelStyle}>Category <span style={reqStyle}>*</span></label>
                    <button
                      onClick={handleAddCategory}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 10px',
                        borderRadius: 4,
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        color: '#8b5cf6',
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <FolderPlus size={10} /> New
                    </button>
                  </div>
                  <select value={form.categoryId} onChange={e => upd('categoryId', e.target.value)} style={selectBase(!!errors.categoryId)}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  {errors.categoryId && <span style={errText}>{errors.categoryId}</span>}
                </div>
                
                {/* 🔥 Base Price - Only for Regular Dishes */}
                {!form.isCombo && (
                  <div>
                    <label style={labelStyle}>Base Price (₹) <span style={reqStyle}>*</span></label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.basePrice}
                      onChange={(e) => upd('basePrice', parseFloat(e.target.value) || 0)}
                      placeholder="149.99"
                      style={inputBase(!!errors.basePrice)}
                    />
                    {errors.basePrice && <span style={errText}>{errors.basePrice}</span>}
                    <span style={helperText}>Base price for the dish (used as reference)</span>
                  </div>
                )}
              </div>

              {/* ─── Combo Toggle ────────────────────────────────────────────── */}
              <div style={{ 
                background: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: 10, 
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isCombo}
                    onChange={e => {
                      const isCombo = e.target.checked;
                      if (isCombo) {
                        upd('isCombo', true);
                        upd('basePrice', 0);
                        upd('variants', []);
                        // Clear regular dish errors
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.basePrice;
                          delete newErrors.variants;
                          form.variants.forEach((_, i) => {
                            delete newErrors[`v${i}name`];
                            delete newErrors[`v${i}price`];
                            delete newErrors[`v${i}ingredients`];
                          });
                          return newErrors;
                        });
                      } else {
                        upd('isCombo', false);
                        upd('comboDishes', []);
                        upd('comboPrice', 0);
                        upd('variants', [{ name: '', price: 0, ingredients: [] }]);
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.comboDishes;
                          delete newErrors.comboPrice;
                          return newErrors;
                        });
                      }
                    }}
                    style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                    <Gift size={16} style={{ display: 'inline', marginRight: 6 }} />
                    This is a Combo (multiple dishes in one)
                  </span>
                </label>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Combine existing dishes into a combo meal</span>
              </div>

              {/* ─── COMBO SECTION ────────────────────────────────────────────── */}
              {form.isCombo ? (
                <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShoppingBag size={14} color="#8b5cf6" /> Combo Dishes
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {form.comboDishes.length > 0 && (
                        <button
                          onClick={clearComboDishes}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 6,
                            border: '1px solid #fca5a5',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          Clear All
                        </button>
                      )}
                      <button
                        onClick={() => setShowDishModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#8b5cf6',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={13} /> Add Dishes
                      </button>
                    </div>
                  </div>

                  <div className={errors.comboDishes ? 'error-field' : ''}>
                    {errors.comboDishes && <span style={errText}>{errors.comboDishes}</span>}
                  </div>

                  {form.comboDishes.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '24px', 
                      color: '#9ca3af', 
                      fontSize: 13,
                      border: '1px dashed #e5e7eb',
                      borderRadius: 8
                    }}>
                      <ShoppingBag size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                      No dishes added to combo yet. Click "Add Dishes" to select from existing menu.
                    </div>
                  ) : (
                    <div>
                      {/* Combo Dishes List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {form.comboDishes.map((dish, idx) => (
                          <div key={idx} className="combo-card" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#fff',
                            borderRadius: 6,
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: '50%', 
                                background: '#8b5cf6', 
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 700
                              }}>
                                {idx + 1}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                                {dish.dishName}
                              </span>
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                ({dish.variantName})
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#8b5cf6' }}>
                                ₹{dish.variantPrice}
                              </span>
                              <button
                                onClick={() => removeComboDish(idx)}
                                style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Combo Price Summary */}
                      <div style={{
                        background: '#fff',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        padding: '12px 16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>Total individual price:</span>
                            <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>
                              ₹{totalComboPrice}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>Combo Price:</span>
                            <div className={errors.comboPrice ? 'error-field' : ''}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.comboPrice}
                                onChange={e => upd('comboPrice', parseFloat(e.target.value) || 0)}
                                style={{
                                  width: 120,
                                  height: 36,
                                  border: `1px solid ${errors.comboPrice ? '#fca5a5' : '#e5e7eb'}`,
                                  borderRadius: 6,
                                  padding: '0 10px',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: '#111827',
                                  outline: 'none'
                                }}
                              />
                              {errors.comboPrice && <span style={errText}>{errors.comboPrice}</span>}
                            </div>
                          </div>
                        </div>
                        {totalComboPrice > form.comboPrice && form.comboPrice > 0 && (
                          <div style={{
                            marginTop: 8,
                            padding: '6px 12px',
                            background: '#fef3c7',
                            borderRadius: 6,
                            fontSize: 12,
                            color: '#92400e'
                          }}>
                            💰 Customers save ₹{totalComboPrice - form.comboPrice} ({(Math.round((1 - form.comboPrice / totalComboPrice) * 100))}% off)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // ─── Regular Variants Section ──────────────────────────────────
                <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={14} color="#8b5cf6" /> Dish Variants
                    </p>
                    <button onClick={addVariant}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={13} /> Add Variant
                    </button>
                  </div>
                  
                  {errors.variants && <span style={errText}>{errors.variants}</span>}

                  {form.variants.map((variant, idx) => (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>Variant {idx + 1}</span>
                        {form.variants.length > 1 && (
                          <button onClick={() => removeVariant(idx)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Name</label>
                          <input type="text" value={variant.name} onChange={e => updateVariant(idx, 'name', e.target.value)} placeholder="Half Plate" style={inputBase()} />
                          {errors[`v${idx}name`] && <span style={errText}>{errors[`v${idx}name`]}</span>}
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Price (₹)</label>
                          <input type="number" step="0.01" value={variant.price} onChange={e => updateVariant(idx, 'price', parseFloat(e.target.value) || 0)} placeholder="149" style={inputBase()} />
                          {errors[`v${idx}price`] && <span style={errText}>{errors[`v${idx}price`]}</span>}
                        </div>
                      </div>

                      {/* Ingredient Picker */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Ingredients</label>
                          <button
                            onClick={handleAddIngredient}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 10px',
                              borderRadius: 4,
                              border: '1px solid #e5e7eb',
                              background: '#f9fafb',
                              color: '#22c55e',
                              fontSize: 10,
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            <PackagePlus size={10} /> New
                          </button>
                        </div>
                        
                        <IngredientPicker
                          ingredients={variant.ingredients}
                          onAddIngredient={(ing) => addVariantIngredient(idx, ing)}
                          onRemoveIngredient={(ingIdx) => removeVariantIngredient(idx, ingIdx)}
                          allIngredients={allIngredients}
                          errors={errors}
                        />
                      </div>
                      {errors[`v${idx}ingredients`] && <p style={errText}>{errors[`v${idx}ingredients`]}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
                <div
                  className={`switch ${form.isActive ? 'active' : ''}`}
                  onClick={() => upd('isActive', !form.isActive)}
                />
                <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                  Active
                </label>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Available for ordering</span>
              </div>
            </div>
          </Section>

          {/* Dietary Information */}
          <Section icon={Leaf} iconColor="#16a34a" title="Dietary Information">
            <div>
              <label style={labelStyle}>Dietary Type <span style={reqStyle}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {DIETARY_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => upd('dietaryType', opt)}
                    style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: form.dietaryType === opt ? '#8b5cf6' : '#f3f4f6', color: form.dietaryType === opt ? '#fff' : '#6b7280' }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Kitchen Information */}
          <Section icon={Coffee} iconColor="#7c3aed" title="Kitchen Information">
            <div>
              <label style={labelStyle}>KOT Station</label>
              <select value={form.kotStation} onChange={e => upd('kotStation', e.target.value as KotStation)} style={selectBase()}>
                {KOT_STATIONS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <div style={{ background: `${kotInfo.color}0d`, border: `1px solid ${kotInfo.color}30`, borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <KotIcon size={24} color={kotInfo.color} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: kotInfo.color }}>{form.kotStation}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{kotInfo.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              onClick={() => navigate('/super-admin/dishes')}
              style={{
                height: 44,
                padding: '0 28px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                fontSize: 14,
                fontWeight: 500,
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading || uploadingImg}
              style={{ 
                height: 44, 
                padding: '0 32px', 
                borderRadius: 8, 
                border: 'none', 
                background: loading || uploadingImg ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(139,92,246,0.35)'
              }}
            >
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Save size={18} /> Create {form.isCombo ? 'Combo' : 'Dish'}</>}
            </button>
          </div>

        </div>
      </div>

      {/* ─── Combo Dish Selection Modal ────────────────────────────────────── */}
      {showDishModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          onClick={() => setShowDishModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '85vh', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #f3f4f6', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {form.isCombo ? 'Select Dishes for Combo' : 'Select Dishes to Add as Variants'}
                  </h3>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                    {form.isCombo ? 'Choose dishes to include in this combo' : 'Choose dishes and their variants will be added'}
                  </p>
                </div>
                <button onClick={() => setShowDishModal(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <select
                value={selectedCategoryForDishes}
                onChange={(e) => setSelectedCategoryForDishes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', maxHeight: '60vh' }}>
              {filteredDishes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                  <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p>No dishes found in this category</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredDishes.map(dish => {
                    const isSelected = selectedDishIds.has(dish._id);
                    const variantCount = dish.variants?.length || 1;
                    const price = dish.variants?.[0]?.price || 0;
                    
                    return (
                      <div
                        key={dish._id}
                        onClick={() => toggleDishSelection(dish._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: `1px solid ${isSelected ? '#8b5cf6' : '#e5e7eb'}`,
                          background: isSelected ? '#f5f3ff' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{dish.name}</p>
                          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                            {variantCount} variant(s) · Starting ₹{price}
                          </p>
                        </div>
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          border: `2px solid ${isSelected ? '#8b5cf6' : '#d1d5db'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? '#8b5cf6' : 'transparent'
                        }}>
                          {isSelected && <CheckCircle size={12} color="#fff" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #f3f4f6', padding: '12px 20px', display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowDishModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={addSelectedDishesToCombo}
                disabled={selectedDishIds.size === 0}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  border: 'none',
                  background: selectedDishIds.size === 0 ? '#e5e7eb' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: selectedDishIds.size === 0 ? '#9ca3af' : '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: selectedDishIds.size === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Plus size={16} />
                Add Selected ({selectedDishIds.size} dish{selectedDishIds.size !== 1 ? 'es' : ''})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ingredient Picker Component ──────────────────────────────────────────────
function IngredientPicker({ 
  ingredients, 
  onAddIngredient, 
  onRemoveIngredient,
  allIngredients,
  errors 
}: { 
  ingredients: IVariantIngredient[];
  onAddIngredient: (ing: IVariantIngredient) => void;
  onRemoveIngredient: (idx: number) => void;
  allIngredients: IIngredient[];
  errors?: Record<string, string>;
}) {
  const [ingName, setIngName] = useState('');
  const [ingQty, setIngQty] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedIng, setSelectedIng] = useState<IIngredient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ingRef = useRef<HTMLDivElement>(null);

  const units = ['g', 'kg', 'ml', 'L', 'pcs', 'tbsp', 'tsp', 'cup'];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ingRef.current && !ingRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredIngredients = allIngredients.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddIngredient = () => {
    const qty = parseFloat(ingQty);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    if (!selectedUnit) {
      toast.error('Please select a unit');
      return;
    }
    
    let ingredientId = '';
    let ingredientName = '';
    
    if (selectedIng) {
      ingredientId = selectedIng._id;
      ingredientName = selectedIng.name;
    } else if (ingName.trim()) {
      ingredientName = ingName.trim();
    } else {
      toast.error('Please select or type an ingredient name');
      return;
    }
    
    onAddIngredient({
      ingredientId: ingredientId,
      ingredientName: ingredientName,
      quantity: qty,
      unit: selectedUnit,
    });
    
    setIngName('');
    setIngQty('');
    setSelectedIng(null);
    setSelectedUnit('');
    setSearchTerm('');
    toast.success(`Added ${qty} ${selectedUnit} of ${ingredientName}`);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Ingredients for this variant</p>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div ref={ingRef} style={{ flex: 2, minWidth: 180, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Type ingredient name or select from list..."
            value={selectedIng ? selectedIng.name : ingName}
            onFocus={() => { setShowDropdown(true); if (selectedIng) { setSelectedIng(null); setIngName(''); } }}
            onChange={e => { 
              setIngName(e.target.value); 
              setSelectedIng(null); 
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            style={{ ...inputBase(!!errors?.ing), paddingRight: selectedIng ? 32 : 12, width: '100%' }} 
          />
          {selectedIng && (
            <button onClick={() => { setSelectedIng(null); setIngName(''); setSearchTerm(''); }}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={14} />
            </button>
          )}
          
          {showDropdown && !selectedIng && filteredIngredients.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
              {filteredIngredients.map(ing => (
                <button key={ing._id}
                  onClick={() => { 
                    setSelectedIng(ing); 
                    setIngName(ing.name);
                    setShowDropdown(false); 
                  }}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{ing.name}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{ing.unit}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ width: 100 }}>
          <input 
            type="number" 
            step="0.001" 
            min="0.001" 
            value={ingQty} 
            onChange={e => setIngQty(e.target.value)} 
            placeholder="Qty" 
            style={inputBase()} 
          />
        </div>
        
        <select 
          value={selectedUnit}
          onChange={e => setSelectedUnit(e.target.value)}
          style={{ width: 80, height: 40, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, padding: '0 8px' }}
        >
          <option value="">Unit</option>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        
        <button onClick={handleAddIngredient}
          style={{ height: 40, width: 40, borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={16} />
        </button>
      </div>

      {ingredients.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Ingredient</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Quantity</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Unit</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 10px' }}>{ing.ingredientName}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{ing.quantity}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{ing.unit}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <button onClick={() => onRemoveIngredient(idx)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontSize: 12, border: '1px dashed #e5e7eb', borderRadius: 8 }}>
          No ingredients added for this variant
        </div>
      )}
    </div>
  );
}