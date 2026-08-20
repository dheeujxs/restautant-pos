// pages/dishes/EditDishPage.tsx - COMPLETE FIXED WITH COMBO SUPPORT

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { 
  Upload, Sparkles, Loader2, Package, Leaf, Coffee, 
  ChevronUp, ChevronDown, ArrowLeft, Plus, Trash2, 
  AlertCircle, X, Layers, Image as ImageIcon, Check,
  RefreshCw, Utensils, Flame, Martini, Salad, Cake,
  Gift, ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  uploadImageWithProgress,
  validateImageFile,
  createImagePreview,
  revokeImagePreview,
} from '../../utils/imageUpload';

// ─── Types ────────────────────────────────────────────────────────────────────
type DietaryType = 'Veg' | 'Non-veg' | 'Vegan' | 'Jain' | 'Eggetarian';
type KotStation  = 'Main Kitchen' | 'Tandoor' | 'Bar' | 'Cold Kitchen' | 'Bakery';

const DIETARY_OPTIONS: DietaryType[] = ['Veg', 'Non-veg', 'Vegan', 'Jain', 'Eggetarian'];
const KOT_STATIONS: KotStation[] = ['Main Kitchen', 'Tandoor', 'Bar', 'Cold Kitchen', 'Bakery'];

const KOT_STATION_INFO: Record<KotStation, { icon: React.ElementType; desc: string; color: string }> = {
  'Main Kitchen': { icon: Utensils, desc: 'Curries, gravies, main course',   color: '#f97316' },
  'Tandoor':      { icon: Flame, desc: 'Naan, roti, tandoori items',       color: '#dc2626' },
  'Bar':          { icon: Martini, desc: 'Drinks, cocktails, mocktails',     color: '#7c3aed' },
  'Cold Kitchen': { icon: Salad, desc: 'Salads, cold starters',            color: '#0891b2' },
  'Bakery':       { icon: Cake, desc: 'Desserts, pastries, bread',        color: '#db2777' },
};

interface ICategory { _id: string; name: string; }
interface IIngredient { _id: string; name: string; unit: string; currentStock: number; costPrice: number; }

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

interface IComboVariant {
  variantIndex: number;
  variantName: string;
  variantPrice: number;
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
  // ─── Combo fields ──────────────────────────────────────────────────────
  isCombo: boolean;
  comboPrice: number;
  comboVariants: IComboVariant[];
}

// ─── Design tokens ────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' };
const reqStyle: React.CSSProperties = { color: '#ef4444', marginLeft: 2 };
const errText: React.CSSProperties = { fontSize: 11, color: '#ef4444' };

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

// ─── Image Upload Section Component ──────────────────────────────────────────
function ImageUploadSection({ 
  image, 
  onImageChange, 
  error,
  onUploadStart,
  onUploadEnd,
  onProgress,
}: { 
  image: string | null; 
  onImageChange: (url: string | null) => void; 
  error?: string;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  onProgress?: (pct: number) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localUploading, setLocalUploading] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(image || null);
  }, [image]);

  const handleFileSelect = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const previewUrl = createImagePreview(file);
    setPreview(previewUrl);

    setLocalUploading(true);
    setLocalProgress(0);
    onUploadStart?.();

    const result = await uploadImageWithProgress(
      file,
      adminApi,
      (progress) => {
        setLocalProgress(progress);
        onProgress?.(progress);
      }
    );

    setLocalUploading(false);
    onUploadEnd?.();

    if (result.success && result.url) {
      onImageChange(result.url);
      toast.success('Image uploaded successfully!');
    } else {
      revokeImagePreview(previewUrl);
      setPreview(image || null);
      toast.error(result.error || 'Failed to upload image');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const removeImage = () => {
    if (preview && preview.startsWith('blob:')) {
      revokeImagePreview(preview);
    }
    setPreview(null);
    onImageChange(null);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !localUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${error ? '#fca5a5' : isDragging ? '#f97316' : preview ? '#22c55e' : '#e5e7eb'}`,
          borderRadius: 10,
          background: isDragging ? '#fff7ed' : preview ? '#f0fdf4' : '#fafafa',
          cursor: localUploading ? 'default' : 'pointer',
          padding: preview ? '16px' : '30px 20px',
          transition: 'all 0.2s',
          minHeight: preview ? 'auto' : 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {localUploading ? (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <Loader2 size={32} color="#f97316" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <div style={{ 
              marginTop: 12, 
              width: '100%', 
              maxWidth: 300, 
              height: 4, 
              background: '#e5e7eb', 
              borderRadius: 2, 
              overflow: 'hidden',
              margin: '12px auto 0',
            }}>
              <div style={{ 
                height: '100%', 
                width: `${localProgress}%`, 
                background: 'linear-gradient(90deg, #f97316, #ef4444)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
              {localProgress < 30 ? 'Optimizing image...' : 
               localProgress < 60 ? 'Uploading...' : 
               localProgress < 90 ? 'Processing...' : 'Almost done!'}
            </p>
          </div>
        ) : preview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
            <img 
              src={preview} 
              alt="Dish preview" 
              style={{ 
                width: 80, 
                height: 80, 
                objectFit: 'cover', 
                borderRadius: 10,
                border: '1px solid #e5e7eb',
              }} 
              onError={() => setPreview(null)}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={16} color="#22c55e" />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#22c55e' }}>
                  {preview.startsWith('blob:') ? 'Image ready' : 'Image loaded'}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(); }}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Remove image
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <ImageIcon size={28} color="#d1d5db" style={{ margin: '0 auto' }} />
            <p style={{ fontSize: 13, marginTop: 8, color: '#6b7280' }}>
              Drop image here or <span style={{ color: '#f97316', fontWeight: 600 }}>browse</span>
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              JPG, PNG, WebP — max 5MB (will be optimized)
            </p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      {error && <p style={errText}>{error}</p>}
    </div>
  );
}

// ─── Ingredient Picker Component ─────────────────────────────────────────────
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
  const [selectedUnit, setSelectedUnit] = useState('g');
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
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        
        <button onClick={handleAddIngredient}
          style={{ height: 40, width: 40, borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

// ─── Section Component ──────────────────────────────────────────────────────
function Section({ icon: Icon, iconColor = '#f97316', title, children, defaultOpen = true }: {
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

// ─── Main Edit Component ──────────────────────────────────────────────────────
export default function EditDishPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState<IForm | null>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [allIngredients, setAllIngredients] = useState<IIngredient[]>([]);

  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Fetch dish data ──────────────────────────────────────────────────────
// ─── Fetch dish data ──────────────────────────────────────────────────────
useEffect(() => {
  const fetchData = async () => {
    try {
      const [dishRes, catRes, ingRes] = await Promise.all([
        adminApi.get(`/dishes/${id}`),
        adminApi.get('/categories?limit=100'),
        adminApi.get('/ingredients?limit=200'),
      ]);

      if (dishRes.data.success) {
        const dish = dishRes.data.data;
        console.log('✅ Dish data loaded:', dish);
        console.log('📸 Is Combo:', dish.isCombo);
        console.log('📸 Combo Variants:', dish.comboVariants);
        console.log('📸 Regular Variants:', dish.variants);
        
        // ─── 🔥 CRITICAL FIX: Handle combo vs regular ────────────────────
        let variants: IVariant[] = [];
        let comboVariants: IComboVariant[] = [];
        
        // ✅ FIRST: Check if it's a COMBO dish
        if (dish.isCombo === true) {
          // COMBO DISH: Use comboVariants, clear variants
          variants = [];  // 🔥 EMPTY array for combo
          comboVariants = dish.comboVariants || [];
          console.log('🎯 This is a COMBO dish - using comboVariants, variants cleared');
        } else {
          // REGULAR DISH: Use variants, clear comboVariants
          variants = dish.variants && dish.variants.length > 0 
            ? dish.variants 
            : [{ name: '', price: 0, ingredients: [] }];
          comboVariants = [];
          console.log('🍽️ This is a REGULAR dish - using variants');
        }
        
        const formData: IForm = {
          name: dish.name || '',
          description: dish.description || '',
          categoryId: dish.categoryId || '',
          categoryName: dish.categoryName || '',
          image: dish.image || '',
          dietaryType: dish.dietaryType || 'Veg',
          kotStation: dish.kotStation || 'Main Kitchen',
          glassType: dish.glassType || '',
          baseIngredient: dish.baseIngredient || '',
          isActive: dish.isActive !== false,
          variants: variants,        // 🔥 Empty for combo, filled for regular
          stockType: dish.stockType || 'recipe',
          currentStock: dish.currentStock || 0,
          // ─── Combo fields ──────────────────────────────────────────────
          isCombo: dish.isCombo || false,
          comboPrice: dish.comboPrice || 0,
          comboVariants: comboVariants,  // 🔥 Filled for combo, empty for regular
        };
        
        console.log('📝 Form data created:', {
          isCombo: formData.isCombo,
          variantsCount: formData.variants.length,
          comboVariantsCount: formData.comboVariants.length,
        });
        
        setForm(formData);
      } else {
        toast.error('Dish not found');
        navigate('/dishes');
      }

      if (catRes.data.success) setCategories(catRes.data.data?.categories || catRes.data.categories || []);
      if (ingRes.data.success) setAllIngredients(ingRes.data.data?.ingredients || ingRes.data.ingredients || []);
      
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Error loading dish:', err);
      toast.error(err.response?.data?.error || 'Failed to load dish data');
      navigate('/dishes');
    }
  };

  fetchData();
}, [id, navigate]);

  const upd = <K extends keyof IForm>(key: K, value: IForm[K]) => {
    if (form) setForm(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleImageChange = (url: string | null) => {
    if (form) {
      setForm(prev => prev ? { ...prev, image: url || '' } : null);
    }
  };

  // ─── Variants Management ────────────────────────────────────────────────────
  const addVariant = () => {
    if (form) {
      upd('variants', [...form.variants, { name: '', price: 0, ingredients: [] }]);
    }
  };

  const removeVariant = (idx: number) => {
    if (form && form.variants.length > 1) {
      upd('variants', form.variants.filter((_, i) => i !== idx));
    }
  };

  const updateVariant = (idx: number, field: keyof IVariant, value: string | number) => {
    if (form) {
      upd('variants', form.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
    }
  };

  const addVariantIngredient = (variantIdx: number, ingredient: IVariantIngredient) => {
    if (form) {
      upd('variants', form.variants.map((v, i) => i === variantIdx 
        ? { ...v, ingredients: [...v.ingredients, ingredient] } 
        : v));
    }
  };

  const removeVariantIngredient = (variantIdx: number, ingredientIdx: number) => {
    if (form) {
      upd('variants', form.variants.map((v, i) => i === variantIdx 
        ? { ...v, ingredients: v.ingredients.filter((_, idx) => idx !== ingredientIdx) } 
        : v));
    }
  };

  // ─── Combo Management ──────────────────────────────────────────────────────
  const addComboVariant = () => {
    if (form) {
      const newComboVariant = {
        variantIndex: form.comboVariants.length,
        variantName: '',
        variantPrice: 0,
      };
      upd('comboVariants', [...form.comboVariants, newComboVariant]);
    }
  };

  const removeComboVariant = (idx: number) => {
    if (form && form.comboVariants.length > 1) {
      upd('comboVariants', form.comboVariants.filter((_, i) => i !== idx));
    }
  };

  const updateComboVariant = (idx: number, field: keyof IComboVariant, value: string | number) => {
    if (form) {
      upd('comboVariants', form.comboVariants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
    }
  };

  // ─── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form) return false;
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Dish name is required';
    if (!form.categoryId) e.categoryId = 'Category is required';
    
    if (form.isCombo) {
      // Combo validation
      if (form.comboPrice <= 0) e.comboPrice = 'Combo price must be greater than 0';
      if (form.comboVariants.length === 0) e.comboVariants = 'Add at least one item to the combo';
      form.comboVariants.forEach((v, i) => {
        if (!v.variantName.trim()) e[`cv${i}name`] = `Combo item ${i + 1}: Name is required`;
        if (v.variantPrice <= 0) e[`cv${i}price`] = `Combo item ${i + 1}: Valid price required`;
      });
    } else {
      // Regular dish validation
      if (!form.variants.length) e.variants = 'Add at least one variant';
      form.variants.forEach((v, i) => {
        if (!v.name) e[`v${i}name`] = `Variant ${i + 1}: Name is required`;
        if (v.price <= 0) e[`v${i}price`] = `Variant ${i + 1}: Valid price required`;
        if (v.ingredients.length === 0) e[`v${i}ingredients`] = `Variant ${i + 1}: At least one ingredient required`;
      });
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form) return;
    if (uploadingImg) { 
      toast.error('Please wait for image to finish uploading'); 
      return; 
    }
    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }
    
    setSaving(true);
    try {
      const selectedCategory = categories.find(c => c._id === form.categoryId);
      
      const payload: any = {
        name: form.name.trim(),
        description: form.description?.trim() || '',
        categoryId: form.categoryId,
        categoryName: selectedCategory?.name || form.categoryName,
        image: form.image || '',
        dietaryType: form.dietaryType,
        kotStation: form.kotStation,
        glassType: form.glassType || '',
        baseIngredient: form.baseIngredient || '',
        isActive: form.isActive,
        stockType: form.stockType || 'recipe',
        currentStock: Number(form.currentStock) || 0,
        isCombo: form.isCombo,
      };

      if (form.isCombo) {
        // ✅ COMBO: Send combo data, clear variants
        payload.comboPrice = Number(form.comboPrice) || 0;
        payload.comboVariants = form.comboVariants.map((v, index) => ({
          variantIndex: index,
          variantName: v.variantName.trim(),
          variantPrice: Number(v.variantPrice) || 0,
        }));
        payload.hasVariants = false;
        payload.variants = [];
        payload.price = Number(form.comboPrice) || 0;
        payload.basePrice = Number(form.comboPrice) || 0;
        console.log('📤 Updating COMBO:', payload);
      } else {
        // ✅ REGULAR: Send variants, clear combo
        const validVariants = form.variants.map(v => ({
          ...v,
          ingredients: v.ingredients.map(ing => ({
            ingredientId: ing.ingredientId || '',
            ingredientName: ing.ingredientName || '',
            quantity: Number(ing.quantity) || 0,
            unit: ing.unit || 'pcs',
          }))
        }));
        payload.hasVariants = true;
        payload.variants = validVariants;
        payload.price = 0;
        payload.basePrice = 0;
        payload.comboVariants = [];
        payload.comboPrice = 0;
        console.log('📤 Updating REGULAR DISH:', payload);
      }

      const res = await adminApi.patch(`/dishes/${id}`, payload);
      
      if (res.data.success) {
        toast.success(`${form.isCombo ? 'Combo' : 'Dish'} updated successfully!`);
        navigate('/dishes');
      } else {
        setErrors({ submit: res.data.error || 'Failed to update dish' });
        toast.error(res.data.error || 'Failed to update dish');
      }
    } catch (err: any) {
      console.error('❌ Update error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update dish';
      setErrors({ submit: errorMsg });
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} color="#f97316" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const kotInfo = KOT_STATION_INFO[form.kotStation];
  const KotIcon = kotInfo.icon;
  const isCombo = form.isCombo;

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
      `}</style>

      {/* Navbar */}
      <div style={{ padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/dishes')}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={15} color="#6b7280" />
          </button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              {isCombo ? 'Edit Combo' : 'Edit Dish'}
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              {isCombo ? 'Update combo meal details' : 'Update menu item details'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCombo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: '#fff7ed',
              border: '1px solid #f97316',
              color: '#f97316',
              fontSize: 11,
              fontWeight: 700,
            }}>
              <Gift size={14} /> Combo Pack
            </div>
          )}
          <button 
            onClick={() => navigate('/dishes')}
            style={{ 
              height: 36, 
              padding: '0 18px', 
              borderRadius: 8, 
              border: '1px solid #e5e7eb', 
              background: '#fff', 
              color: '#374151', 
              fontSize: 13, 
              fontWeight: 500, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ArrowLeft size={14} /> Back to Dishes
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>

        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Image Section */}
          <Section icon={Upload} title="Dish Image">
            <ImageUploadSection
              image={form.image}
              onImageChange={handleImageChange}
              error={errors.image}
              onUploadStart={() => setUploadingImg(true)}
              onUploadEnd={() => setUploadingImg(false)}
              onProgress={setUploadProgress}
            />
          </Section>

          {/* Basic Information */}
          <Section icon={Package} title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Name <span style={reqStyle}>*</span></label>
                <input type="text" value={form.name} onChange={e => upd('name', e.target.value)} placeholder={isCombo ? "e.g., Family Combo, Special Thali" : "e.g., Dal Tadka, Butter Chicken"} style={inputBase(!!errors.name)} />
                {errors.name && <span style={errText}>{errors.name}</span>}
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={3} value={form.description} onChange={e => upd('description', e.target.value)} placeholder="Describe the dish…" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div>
                <label style={labelStyle}>Category <span style={reqStyle}>*</span></label>
                <select value={form.categoryId} onChange={e => upd('categoryId', e.target.value)} style={selectBase(!!errors.categoryId)}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <span style={errText}>{errors.categoryId}</span>}
              </div>

              {/* ─── COMBO SECTION ────────────────────────────────────────────── */}
              {isCombo ? (
                <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Gift size={14} color="#f97316" /> Combo Items
                    </p>
                    <button onClick={addComboVariant}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={13} /> Add Item
                    </button>
                  </div>

                  {errors.comboVariants && <p style={errText}>{errors.comboVariants}</p>}

                  {form.comboVariants.map((item, idx) => (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Item {idx + 1}</span>
                        {form.comboVariants.length > 1 && (
                          <button onClick={() => removeComboVariant(idx)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Item Name</label>
                          <input type="text" value={item.variantName} onChange={e => updateComboVariant(idx, 'variantName', e.target.value)} placeholder="e.g., Butter Chicken" style={inputBase(!!errors[`cv${idx}name`])} />
                          {errors[`cv${idx}name`] && <span style={errText}>{errors[`cv${idx}name`]}</span>}
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Price (₹)</label>
                          <input type="number" step="0.01" value={item.variantPrice} onChange={e => updateComboVariant(idx, 'variantPrice', parseFloat(e.target.value) || 0)} placeholder="299" style={inputBase(!!errors[`cv${idx}price`])} />
                          {errors[`cv${idx}price`] && <span style={errText}>{errors[`cv${idx}price`]}</span>}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Combo Price */}
                  <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '14px', marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Combo Price <span style={reqStyle}>*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.comboPrice}
                        onChange={e => upd('comboPrice', parseFloat(e.target.value) || 0)}
                        style={{ width: 160, height: 40, border: `1px solid ${errors.comboPrice ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 8, padding: '0 12px', fontSize: 14, outline: 'none' }}
                        placeholder="499"
                      />
                    </div>
                    {errors.comboPrice && <span style={errText}>{errors.comboPrice}</span>}
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 0' }}>
                      Total individual price: ₹{form.comboVariants.reduce((sum, v) => sum + v.variantPrice, 0).toFixed(2)}
                      {form.comboPrice > 0 && form.comboPrice < form.comboVariants.reduce((sum, v) => sum + v.variantPrice, 0) && (
                        <span style={{ color: '#16a34a', marginLeft: 8 }}>
                          (Save ₹{(form.comboVariants.reduce((sum, v) => sum + v.variantPrice, 0) - form.comboPrice).toFixed(2)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                // ─── VARIANTS SECTION (Regular Dish) ──────────────────────────
                <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={14} color="#f97316" /> Dish Variants
                    </p>
                    <button onClick={addVariant}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={13} /> Add Variant
                    </button>
                  </div>
                  
                  {errors.variants && <p style={errText}>{errors.variants}</p>}

                  {form.variants.map((variant, idx) => (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Variant {idx + 1}</span>
                        {form.variants.length > 1 && (
                          <button onClick={() => removeVariant(idx)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Name</label>
                          <input type="text" value={variant.name} onChange={e => updateVariant(idx, 'name', e.target.value)} placeholder="Half Plate" style={inputBase(!!errors[`v${idx}name`])} />
                          {errors[`v${idx}name`] && <span style={errText}>{errors[`v${idx}name`]}</span>}
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Price (₹)</label>
                          <input type="number" step="0.01" value={variant.price} onChange={e => updateVariant(idx, 'price', parseFloat(e.target.value) || 0)} placeholder="149" style={inputBase(!!errors[`v${idx}price`])} />
                          {errors[`v${idx}price`] && <span style={errText}>{errors[`v${idx}price`]}</span>}
                        </div>
                      </div>

                      <IngredientPicker
                        ingredients={variant.ingredients}
                        onAddIngredient={(ing) => addVariantIngredient(idx, ing)}
                        onRemoveIngredient={(ingIdx) => removeVariantIngredient(idx, ingIdx)}
                        allIngredients={allIngredients}
                        errors={errors}
                      />
                      {errors[`v${idx}ingredients`] && <p style={errText}>{errors[`v${idx}ingredients`]}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.isActive} onChange={e => upd('isActive', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#f97316' }} />
                <label style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Active <span style={{ color: '#9ca3af' }}>(visible on menu)</span></label>
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
                    style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: form.dietaryType === opt ? '#f97316' : '#f3f4f6', color: form.dietaryType === opt ? '#fff' : '#6b7280' }}>
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

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button 
              onClick={() => navigate('/dishes')}
              style={{ 
                height: 40, 
                padding: '0 24px', 
                borderRadius: 8, 
                border: '1px solid #e5e7eb', 
                background: '#fff', 
                fontSize: 13, 
                fontWeight: 500, 
                color: '#6b7280', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowLeft size={14} /> Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={saving || uploadingImg}
              style={{ 
                height: 40, 
                padding: '0 24px', 
                borderRadius: 8, 
                border: 'none', 
                background: saving || uploadingImg ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', 
                color: '#fff', 
                fontSize: 13, 
                fontWeight: 600, 
                cursor: saving || uploadingImg ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 7, 
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              }}
            >
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Sparkles size={14} /> Update {isCombo ? 'Combo' : 'Dish'}</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}