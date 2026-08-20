// pages/dishes/AddDishPage.tsx - FIXED: Combo mode works with backend

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { useAuth } from '../../utils/AuthContext';
import { 
  Upload, Sparkles, Loader2, Package, Leaf, Coffee, 
  ChevronUp, ChevronDown, ArrowLeft, RefreshCw, Plus, Trash2, 
  AlertCircle, Search, CheckCircle, Info,
  X, Layers, Copy, FolderPlus, PackagePlus,
  Building2, Image as ImageIcon, Check,
  Star, Clock, Tag, Award, Shield, Zap,
  Utensils, Flame, Coffee as CoffeeIcon, 
  Beer, Cake, Salad, GlassWater, Martini,
  Grid3x3, List, Home, Copy as CopyIcon,
  Save, User, Phone, Mail, MapPin, Globe,
  ShoppingBag, Gift, Percent, Calculator
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
const KOT_STATIONS:    KotStation[]  = ['Main Kitchen', 'Tandoor', 'Bar', 'Cold Kitchen', 'Bakery'];

const KOT_STATION_INFO: Record<KotStation, { icon: React.ElementType; desc: string; color: string }> = {
  'Main Kitchen': { icon: Utensils, desc: 'Curries, gravies, main course', color: '#f97316' },
  'Tandoor':      { icon: Flame, desc: 'Naan, roti, tandoori items', color: '#dc2626' },
  'Bar':          { icon: Martini, desc: 'Drinks, cocktails, mocktails', color: '#7c3aed' },
  'Cold Kitchen': { icon: Salad, desc: 'Salads, cold starters', color: '#0891b2' },
  'Bakery':       { icon: Cake, desc: 'Desserts, pastries, bread', color: '#db2777' },
};

interface ICategory    { _id: string; name: string; }
interface IIngredient  { _id: string; name: string; unit: string; currentStock: number; }

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
  height: 40,
  width: '100%', boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '0 12px',
  fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
});

const selectBase = (err = false): React.CSSProperties => ({
  ...inputBase(err), appearance: 'none', cursor: 'pointer', paddingRight: 32,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
});

// ─── Section Component ────────────────────────────────────────────────────────
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

// ─── Image Upload Component ─────────────────────────────────────────────────
function ImageUploadSection({ 
  image, 
  onImageChange, 
  error,
  uploading,
  uploadProgress,
}: { 
  image: string | null; 
  onImageChange: (url: string | null) => void; 
  error?: string;
  uploading: boolean;
  uploadProgress: number;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (image) {
      setPreview(image);
    } else {
      setPreview(null);
    }
  }, [image]);

  const handleFileSelect = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(`❌ ${validation.error}`, { duration: 4000, position: 'top-center' });
      return;
    }

    const previewUrl = createImagePreview(file);
    setPreview(previewUrl);

    const result = await uploadImageWithProgress(
      file,
      adminApi,
      (progress) => {
        console.log(`Upload progress: ${progress}%`);
      }
    );

    if (result.success && result.url) {
      onImageChange(result.url);
      toast.success('✅ Image uploaded successfully!', { duration: 3000, position: 'top-center' });
    } else {
      revokeImagePreview(previewUrl);
      setPreview(image || null);
      toast.error(`❌ ${result.error || 'Failed to upload image'}`, { duration: 4000, position: 'top-center' });
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
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${error ? '#fca5a5' : isDragging ? '#f97316' : preview ? '#22c55e' : '#e5e7eb'}`,
          borderRadius: 10,
          background: isDragging ? '#fff7ed' : preview ? '#f0fdf4' : '#fafafa',
          cursor: uploading ? 'default' : 'pointer',
          padding: preview ? '16px' : '30px 20px',
          transition: 'all 0.2s',
          minHeight: preview ? 'auto' : 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uploading ? (
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
                width: `${uploadProgress}%`, 
                background: 'linear-gradient(90deg, #f97316, #ef4444)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
              {uploadProgress < 30 ? 'Optimizing image...' : 
               uploadProgress < 60 ? 'Uploading...' : 
               uploadProgress < 90 ? 'Processing...' : 'Almost done!'}
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
              onError={() => {
                setPreview(null);
                onImageChange(null);
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={16} color="#22c55e" />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#22c55e' }}>Image ready</span>
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddDishPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<IForm>(defaultForm());
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [allIngredients, setAllIngredients] = useState<IIngredient[]>([]);
  const [allDishes, setAllDishes] = useState<any[]>([]);

  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');

  const restaurantId = user?.restaurantId || '';
  const restaurantName = user?.restaurantName || '';

  useEffect(() => {
    const initialForm = defaultForm();
    const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);
    setHasUnsavedChanges(hasChanges);
  }, [form]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, ingRes, dishRes] = await Promise.all([
          adminApi.get('/categories?limit=100'),
          adminApi.get('/ingredients?limit=200'),
          adminApi.get('/dishes?limit=500'),
        ]);
        if (catRes.data.success) setCategories(catRes.data.data?.categories || catRes.data.categories || []);
        if (ingRes.data.success) setAllIngredients(ingRes.data.data?.ingredients || []);
        if (dishRes.data.success) {
          const dishes = dishRes.data.data?.dishes || dishRes.data.dishes || [];
          setAllDishes(dishes);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('❌ Failed to load data', { duration: 4000, position: 'top-center' });
      }
    };
    fetchData();
  }, []);

  const upd = <K extends keyof IForm>(key: K, value: IForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error for this field when user makes changes
    if (errors[key as string]) {
      setErrors(prev => ({ ...prev, [key as string]: '' }));
    }
  };

  const handleImageChange = (url: string | null) => {
    upd('image', url || '');
  };

  const handleNavigateBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/dishes');
      }
    } else {
      navigate('/dishes');
    }
  };

  const handleAddCategory = () => {
    navigate('/add-category?returnTo=/dishes/add', { state: { draft: form } });
  };

  const handleAddIngredient = () => {
    navigate('/add-ingredient?returnTo=/dishes/add', { state: { draft: form } });
  };

  // ─── Variants Management ────────────────────────────────────────────────────
  const addVariant = () => {
    upd('variants', [...form.variants, { name: '', price: 0, ingredients: [] }]);
  };

  const removeVariant = (idx: number) => {
    upd('variants', form.variants.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, field: keyof IVariant, value: string | number) => {
    upd('variants', form.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const addVariantIngredient = (variantIdx: number, ingredient: IVariantIngredient) => {
    upd('variants', form.variants.map((v, i) => i === variantIdx 
      ? { ...v, ingredients: [...v.ingredients, ingredient] } 
      : v));
  };

  const removeVariantIngredient = (variantIdx: number, ingredientIdx: number) => {
    upd('variants', form.variants.map((v, i) => i === variantIdx 
      ? { ...v, ingredients: v.ingredients.filter((_, idx) => idx !== ingredientIdx) } 
      : v));
  };

  // ─── Combo Management ──────────────────────────────────────────────────────
  const toggleComboDishSelection = (dishId: string) => {
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
          variantPrice: dish.price || 0,
          variantIndex: 0,
        });
      }
    });

    // Calculate suggested combo price (sum of all variant prices)
    const totalPrice = newComboDishes.reduce((sum, d) => sum + d.variantPrice, 0);
    const suggestedPrice = Math.round(totalPrice * 0.85); // 15% discount

    upd('comboDishes', [...form.comboDishes, ...newComboDishes]);
    if (form.comboPrice === 0) {
      upd('comboPrice', suggestedPrice);
    }

    setShowComboModal(false);
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

  const getFilteredDishesForCombo = () => {
    if (!selectedCategoryFilter) return allDishes;
    return allDishes.filter(dish => dish.categoryId === selectedCategoryFilter);
  };

  // ─── Validate & Submit ──────────────────────────────────────────────────────
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    
    // Common validations - ALWAYS required
    if (!form.name.trim()) {
      e.name = 'Dish name is required';
    }
    
    if (!form.categoryId) {
      e.categoryId = 'Category is required';
    }
    
    // Combo vs Regular validation
    if (form.isCombo) {
      // ✅ Combo validations - ONLY combo fields
      if (form.comboDishes.length === 0) {
        e.comboDishes = 'Please add at least one dish to the combo';
      }
      
      if (form.comboPrice <= 0) {
        e.comboPrice = 'Combo price must be greater than 0';
      }
    } else {
      // ✅ Regular dish validations - ONLY when NOT combo
      if (form.basePrice <= 0) {
        e.basePrice = 'Base price must be greater than 0';
      }
      
      if (form.variants.length === 0) {
        e.variants = 'Add at least one variant';
      } else {
        form.variants.forEach((v, i) => {
          if (!v.name || v.name.trim() === '') {
            e[`v${i}name`] = `Variant ${i + 1}: Name is required`;
          }
          if (v.price <= 0) {
            e[`v${i}price`] = `Variant ${i + 1}: Valid price required`;
          }
          if (v.ingredients.length === 0) {
            e[`v${i}ingredients`] = `Variant ${i + 1}: At least one ingredient required`;
          }
        });
      }
    }
    
    setErrors(e);
    return e;
  };

  // ─── Scroll to first error ──────────────────────────────────────────────────
  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstErrorField = document.querySelector('.error-field');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the input
        const input = firstErrorField.querySelector('input, select, textarea');
        if (input) {
          (input as HTMLElement).focus();
          (input as HTMLElement).style.borderColor = '#ef4444';
          setTimeout(() => {
            (input as HTMLElement).style.borderColor = '';
          }, 3000);
        }
      }
    }, 100);
  };

  const handleSubmit = async () => {
    if (uploadingImg) {
      toast.error('⏳ Please wait for image to finish uploading', { duration: 3500, position: 'top-center' });
      return;
    }

    const validationErrors = validate();
    const errorKeys = Object.keys(validationErrors);
    const errorMessages = Object.values(validationErrors);

    if (errorKeys.length > 0) {
      // Show all errors in toast
      toast.error(
        `❌ Please fix ${errorKeys.length} error${errorKeys.length > 1 ? 's' : ''} before submitting`,
        { duration: 4000, position: 'top-center' }
      );

      // Show each error as a separate toast
      errorMessages.forEach((msg, idx) => {
        setTimeout(() => {
          toast.error(`⚠️ ${msg}`, { duration: 4500, position: 'top-center' });
        }, (idx + 1) * 200);
      });

      // Scroll to first error
      scrollToFirstError();
      return;
    }

    const loadingToastId = toast.loading('⏳ Creating your dish...', {
      duration: 10000,
    });

    setLoading(true);

    try {
      const selectedCategory = categories.find(c => c._id === form.categoryId);

      let payload: any = {
        restaurantId: restaurantId,
        restaurantName: restaurantName,
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
        isCombo: form.isCombo,
      };

      if (form.isCombo) {
        // ✅ Send comboVariants - the backend will use these as the source of truth
        payload.comboPrice = Number(form.comboPrice) || 0;
        payload.comboVariants = form.comboDishes.map((d, index) => ({
          variantIndex: index,
          variantName: d.variantName,
          variantPrice: d.variantPrice,
        }));
        
        // ✅ IMPORTANT: Send hasVariants: false so backend knows this is a combo
        payload.hasVariants = false;
        payload.variants = [];
        payload.price = Number(form.comboPrice) || 0;
        payload.basePrice = Number(form.comboPrice) || 0;
        
        console.log('📤 Combo payload:', {
          isCombo: payload.isCombo,
          hasVariants: payload.hasVariants,
          comboPrice: payload.comboPrice,
          comboVariants: payload.comboVariants,
          variantCount: payload.comboVariants.length,
        });
      } else {
        // Regular dish - use actual variants with ingredients
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
        payload.basePrice = Number(form.basePrice) || 0;
        payload.comboPrice = 0;
        payload.comboVariants = [];
        
        console.log('📤 Regular dish payload:', {
          hasVariants: payload.hasVariants,
          variants: payload.variants.length,
        });
      }

      console.log('📤 Full payload:', JSON.stringify(payload, null, 2));

      const res = await adminApi.post('/dishes', payload);

      toast.dismiss(loadingToastId);

      if (res.data.success) {
        toast.success(`✅ ${form.isCombo ? 'Combo' : 'Dish'} "${form.name}" has been created!`, {
          duration: 4000,
          icon: form.isCombo ? '🔄' : '🍽️',
          position: 'top-center',
        });

        setForm(defaultForm());
        setHasUnsavedChanges(false);

        setTimeout(() => {
          navigate('/dishes');
        }, 1500);
      } else {
        toast.error(`❌ ${res.data.error || 'Failed to create dish'}`, {
          duration: 5000,
          position: 'top-center',
        });
      }
    } catch (err: any) {
      toast.dismiss(loadingToastId);
      console.error('❌ Error creating dish:', err);
      console.error('❌ Response data:', err.response?.data);
      
      // Show detailed error from server
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create dish';
      toast.error(`❌ ${errorMsg}`, {
        duration: 5000,
        position: 'top-center',
      });
      
      // If there are field-specific errors from server
      if (err.response?.data?.errors) {
        const serverErrors = err.response.data.errors;
        if (Array.isArray(serverErrors)) {
          serverErrors.forEach((error: string, idx: number) => {
            setTimeout(() => {
              toast.error(`⚠️ ${error}`, {
                duration: 4500,
                position: 'top-center',
              });
            }, (idx + 1) * 200);
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const kotInfo = KOT_STATION_INFO[form.kotStation];
  const KotIcon = kotInfo.icon;
  const filteredDishes = getFilteredDishesForCombo();
  const totalComboPrice = form.comboDishes.reduce((sum, d) => sum + d.variantPrice, 0);

  // ─── Error display helper ──────────────────────────────────────────────────
  const renderError = (field: string) => {
    if (errors[field]) {
      return <span style={errText}>{errors[field]}</span>;
    }
    return null;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
        .error-field input, .error-field select, .error-field textarea {
          border-color: #fca5a5 !important;
        }
        .error-field input:focus, .error-field select:focus, .error-field textarea:focus {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.12) !important;
        }
      `}</style>

      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={handleNavigateBack}
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasUnsavedChanges && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              padding: '0 12px',
              height: 28,
              borderRadius: 6,
              background: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: 10,
              fontWeight: 500,
            }}>
              <span>●</span> Unsaved
            </div>
          )}
          
          {restaurantName && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              padding: '0 12px',
              height: 36,
              borderRadius: 8,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: 12,
              fontWeight: 500,
            }}>
              <Building2 size={14} />
              {restaurantName}
            </div>
          )}
          
          <button
            onClick={handleAddCategory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 16px',
              height: 36,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#8b5cf6',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <FolderPlus size={14} />
            Add Category
          </button>

          <button
            onClick={handleAddIngredient}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 16px',
              height: 36,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#22c55e',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <PackagePlus size={14} />
            Add Ingredient
          </button>
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 24px 40px' }}>
        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ─── Image Section ──────────────────────────────────────────────── */}
          <Section icon={Upload} title="Dish Image">
            <ImageUploadSection
              image={form.image}
              onImageChange={handleImageChange}
              error={errors.image}
              uploading={uploadingImg}
              uploadProgress={uploadProgress}
            />
          </Section>

          {/* ─── Basic Information ──────────────────────────────────────────── */}
          <Section icon={Package} title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div className={errors.name ? 'error-field' : ''}>
                <label style={labelStyle}>Name <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => upd('name', e.target.value)} 
                  placeholder={form.isCombo ? "e.g., Family Combo, Special Thali" : "e.g., Dal Tadka, Butter Chicken"} 
                  style={inputBase(!!errors.name)} 
                />
                {renderError('name')}
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea 
                  rows={3} 
                  value={form.description} 
                  onChange={e => upd('description', e.target.value)} 
                  placeholder="Describe the dish…" 
                  style={{ 
                    width: '100%', 
                    border: `1px solid ${errors.description ? '#fca5a5' : '#e5e7eb'}`, 
                    borderRadius: 8, 
                    padding: '10px 12px', 
                    fontSize: 14, 
                    resize: 'vertical', 
                    fontFamily: 'inherit',
                    outline: 'none',
                  }} 
                />
                {renderError('description')}
              </div>

              {/* ─── Category - ALWAYS VISIBLE ──────────────────────────────── */}
              <div className={errors.categoryId ? 'error-field' : ''}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={labelStyle}>Category <span style={reqStyle}>*</span></label>
                  <button
                    onClick={handleAddCategory}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      color: '#8b5cf6',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    <FolderPlus size={12} /> New Category
                  </button>
                </div>
                <select 
                  value={form.categoryId} 
                  onChange={e => upd('categoryId', e.target.value)} 
                  style={selectBase(!!errors.categoryId)}
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {renderError('categoryId')}
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
                        // ✅ Switching to combo - clear variants and set empty array
                        upd('isCombo', true);
                        upd('basePrice', 0);
                        upd('variants', []); // Clear variants
                        // Clear regular dish errors
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.basePrice;
                          delete newErrors.variants;
                          // Clear variant errors
                          form.variants.forEach((_, i) => {
                            delete newErrors[`v${i}name`];
                            delete newErrors[`v${i}price`];
                            delete newErrors[`v${i}ingredients`];
                          });
                          return newErrors;
                        });
                      } else {
                        // ✅ Switching to regular - restore default variant
                        upd('isCombo', false);
                        upd('comboDishes', []);
                        upd('comboPrice', 0);
                        upd('variants', [{ name: '', price: 0, ingredients: [] }]); // Add default variant
                        // Clear combo errors
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.comboDishes;
                          delete newErrors.comboPrice;
                          return newErrors;
                        });
                      }
                    }}
                    style={{ width: 18, height: 18, accentColor: '#f97316', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                    <Gift size={16} style={{ display: 'inline', marginRight: 6 }} />
                    This is a Combo (multiple dishes in one)
                  </span>
                </label>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Combine existing dishes into a combo meal</span>
              </div>

              {form.isCombo ? (
                // ─── Combo Section ────────────────────────────────────────────
                <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShoppingBag size={14} color="#f97316" /> Combo Dishes
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
                        onClick={() => setShowComboModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#f97316',
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
                    {renderError('comboDishes')}
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
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#fff',
                            borderRadius: 6,
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                                {dish.dishName}
                              </span>
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                ({dish.variantName})
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>
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
                              {renderError('comboPrice')}
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
                // ─── Regular Dish Fields ──────────────────────────────────────
                <>
                  {/* Base Price */}
                  <div className={errors.basePrice ? 'error-field' : ''}>
                    <label style={labelStyle}>Base Price <span style={reqStyle}>*</span></label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={form.basePrice || 0} 
                      onChange={e => upd('basePrice', parseFloat(e.target.value) || 0)} 
                      placeholder="149.99" 
                      style={inputBase(!!errors.basePrice)} 
                    />
                    {renderError('basePrice')}
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>Base price for this dish (used as reference price)</p>
                  </div>

                  {/* Variants Section */}
                  <div className={errors.variants ? 'error-field' : ''} style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6', padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Layers size={14} color="#f97316" /> Dish Variants <span style={reqStyle}>*</span>
                      </p>
                      <button onClick={addVariant}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <Plus size={13} /> Add Variant
                      </button>
                    </div>
                    {renderError('variants')}
                    
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
                          <div className={errors[`v${idx}name`] ? 'error-field' : ''}>
                            <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Name <span style={reqStyle}>*</span></label>
                            <input 
                              type="text" 
                              value={variant.name} 
                              onChange={e => updateVariant(idx, 'name', e.target.value)} 
                              placeholder="Half Plate" 
                              style={inputBase(!!errors[`v${idx}name`])} 
                            />
                            {renderError(`v${idx}name`)}
                          </div>
                          <div className={errors[`v${idx}price`] ? 'error-field' : ''}>
                            <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Price (₹) <span style={reqStyle}>*</span></label>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={variant.price} 
                              onChange={e => updateVariant(idx, 'price', parseFloat(e.target.value) || 0)} 
                              placeholder="149" 
                              style={inputBase(!!errors[`v${idx}price`])} 
                            />
                            {renderError(`v${idx}price`)}
                          </div>
                        </div>

                        <IngredientPicker
                          ingredients={variant.ingredients}
                          onAddIngredient={(ing) => addVariantIngredient(idx, ing)}
                          onRemoveIngredient={(ingIdx) => removeVariantIngredient(idx, ingIdx)}
                          allIngredients={allIngredients}
                          errors={errors}
                          variantIndex={idx}
                        />
                        {renderError(`v${idx}ingredients`)}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Active Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input 
                  type="checkbox" 
                  checked={form.isActive} 
                  onChange={e => upd('isActive', e.target.checked)} 
                  style={{ width: 16, height: 16, accentColor: '#f97316' }} 
                />
                <label style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Active <span style={{ color: '#9ca3af' }}>(visible on menu)</span></label>
              </div>
            </div>
          </Section>

          {/* ─── Dietary Information ────────────────────────────────────────── */}
          <Section icon={Leaf} iconColor="#16a34a" title="Dietary Information">
            <div>
              <label style={labelStyle}>Dietary Type <span style={reqStyle}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {DIETARY_OPTIONS.map(opt => (
                  <button 
                    key={opt} 
                    onClick={() => upd('dietaryType', opt)}
                    style={{ 
                      padding: '6px 16px', 
                      borderRadius: 20, 
                      fontSize: 13, 
                      fontWeight: 600, 
                      border: 'none', 
                      cursor: 'pointer', 
                      background: form.dietaryType === opt ? '#f97316' : '#f3f4f6', 
                      color: form.dietaryType === opt ? '#fff' : '#6b7280' 
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* ─── Kitchen Information ────────────────────────────────────────── */}
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

          {/* ─── Actions ──────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              onClick={handleNavigateBack}
              style={{
                height: 40,
                padding: '0 24px',
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
                height: 40, 
                padding: '0 28px', 
                borderRadius: 8, 
                border: 'none', 
                background: loading || uploadingImg ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)'
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Sparkles size={16} /> Create {form.isCombo ? 'Combo' : 'Dish'}</>}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Combo Dish Selection Modal ────────────────────────────────────── */}
      {showComboModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 50, 
          padding: 16 
        }}
        onClick={() => setShowComboModal(false)}>
          <div style={{ 
            background: '#fff', 
            borderRadius: 16, 
            width: '100%', 
            maxWidth: 560, 
            maxHeight: '85vh', 
            overflow: 'hidden' 
          }}
          onClick={e => e.stopPropagation()}>
            <div style={{ 
              position: 'sticky', 
              top: 0, 
              background: '#fff', 
              borderBottom: '1px solid #f3f4f6', 
              padding: '16px 20px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Select Dishes for Combo</h3>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Choose dishes to include in this combo</p>
                </div>
                <button onClick={() => setShowComboModal(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
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
                  <p>No dishes found</p>
                  <button
                    onClick={handleAddCategory}
                    style={{
                      marginTop: 8,
                      padding: '6px 16px',
                      borderRadius: 6,
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      color: '#8b5cf6',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    <FolderPlus size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Create Category
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredDishes.map(dish => {
                    const isSelected = selectedDishIds.has(dish._id);
                    const price = dish.variants?.[0]?.price || dish.price || 0;
                    const variantCount = dish.variants?.length || 1;
                    
                    return (
                      <div
                        key={dish._id}
                        onClick={() => toggleComboDishSelection(dish._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: `1px solid ${isSelected ? '#f97316' : '#e5e7eb'}`,
                          background: isSelected ? '#fff7ed' : '#fff',
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
                          border: `2px solid ${isSelected ? '#f97316' : '#d1d5db'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? '#f97316' : 'transparent'
                        }}>
                          {isSelected && <Check size={12} color="#fff" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ 
              position: 'sticky', 
              bottom: 0, 
              background: '#fff', 
              borderTop: '1px solid #f3f4f6', 
              padding: '12px 20px', 
              display: 'flex', 
              gap: 12 
            }}>
              <button
                onClick={() => setShowComboModal(false)}
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
                  background: selectedDishIds.size === 0 ? '#e5e7eb' : 'linear-gradient(135deg, #f97316, #ef4444)',
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

// ─── Ingredient Picker Component ──────────────────────────────────────────
function IngredientPicker({ 
  ingredients, 
  onAddIngredient, 
  onRemoveIngredient,
  allIngredients,
  errors,
  variantIndex
}: { 
  ingredients: IVariantIngredient[];
  onAddIngredient: (ing: IVariantIngredient) => void;
  onRemoveIngredient: (idx: number) => void;
  allIngredients: IIngredient[];
  errors?: Record<string, string>;
  variantIndex?: number;
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
      toast.error('❌ Please enter a valid quantity', { duration: 3500, position: 'top-center' });
      return;
    }
    
    if (!selectedUnit) {
      toast.error('❌ Please select a unit', { duration: 3500, position: 'top-center' });
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
      toast.error('❌ Please select or type an ingredient name', { duration: 3500, position: 'top-center' });
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
    toast.success(`✅ Added ${qty} ${selectedUnit} of ${ingredientName}`, { duration: 2500, position: 'top-center' });
  };

  const errorKey = variantIndex !== undefined ? `v${variantIndex}ingredients` : 'ingredients';
  const hasError = errors && errors[errorKey];

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
        Ingredients for this variant <span style={reqStyle}>*</span>
      </p>
      
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
            style={{ ...inputBase(), paddingRight: selectedIng ? 32 : 12, width: '100%' }} 
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
          style={{ height: 40, width: 40, borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={16} />
        </button>
      </div>

      {hasError && <p style={errText}>{errors[errorKey]}</p>}

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
          No ingredients added for this variant. Add at least one ingredient.
        </div>
      )}
    </div>
  );
}