// pages/POS.tsx - COMPLETE UPDATED VERSION with bulk stock availability check

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { adminStorage } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';
import {
  ArrowLeft, Plus, Minus, Trash2, Coffee, ShoppingBag,
  Search, Loader2, Package2, X, ChevronDown,
  RotateCcw, ShoppingCart, Zap, Tag,
  AlertCircle, Users, ListOrdered, CheckCircle,
  Crown, Sparkles, Timer, Mail, Table2, Receipt,
  Layers, User, Phone, MapPin, CheckSquare, Square,
  IndianRupee, Clock, ChefHat, Info, Utensils,
  Beef, Leaf, Scale, Thermometer, Droplet, Flame,
  Star, Heart, Shield, Zap as ZapIcon, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

interface IVariant {
  name: string;
  price: number;
  size?: string;
  ingredients?: IIngredient[];
  description?: string;
  calories?: number;
  spiceLevel?: 'Mild' | 'Medium' | 'Hot' | 'Very Hot';
  preparationTime?: number;
  isRecommended?: boolean;
  isPopular?: boolean;
  image?: string;
}

interface IDish {
  _id: string;
  name: string;
  categoryName: string;
  price: number;
  image?: string;
  dietaryType?: string;
  description?: string;
  variants?: IVariant[];
  hasVariants?: boolean;
  preparationTime?: number;
  spiceLevel?: string;
}

interface IProduct {
  _id: string;
  name: string;
  category: string;
  sellingPrice: number;
  unit: string;
  image?: string;
  prepTimeMinutes?: number;
  isVeg?: boolean;
  description?: string;
  variants?: IVariant[];
  hasVariants?: boolean;
  dietaryType?: string;
}

interface ICartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  prepTimeMinutes?: number;
  variantName?: string;
  variantPrice?: number;
}

interface ITable {
  _id: string;
  number: string;
  name: string;
  floorName: string;
  status: string;
}

interface IOrder {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  tableId: string;
  orderType?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: any[];
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  isVip?: boolean;
  vipNotes?: string;
  currentRound?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getImageUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:8000${url.startsWith('/') ? '' : '/uploads/'}${url}`;
};

const CAT_COLORS: Record<string, { bg: string; accent: string; text: string }> = {};
const PALETTE = [
  { bg: '#FFF3F0', accent: '#FF5722', text: '#BF360C' },
  { bg: '#E8F4FF', accent: '#3B82F6', text: '#1E3A5F' },
  { bg: '#EDFFF4', accent: '#22C55E', text: '#145C2F' },
  { bg: '#F5EEFF', accent: '#A855F7', text: '#3B1570' },
  { bg: '#FFF8E8', accent: '#F59E0B', text: '#7A4800' },
  { bg: '#FFE8F0', accent: '#EC4899', text: '#7A1037' },
  { bg: '#E8FFFB', accent: '#14B8A6', text: '#0D5C54' },
  { bg: '#F0F0FF', accent: '#6366F1', text: '#1E1B5E' },
];
let _pi = 0;
const getCatColor = (cat: string) => {
  if (!CAT_COLORS[cat]) CAT_COLORS[cat] = PALETTE[_pi++ % PALETTE.length];
  return CAT_COLORS[cat];
};

const getInitials = (first?: string, last?: string) =>
  `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'U';

const fmt = (n: number) => n.toFixed(2);

const getPriceDisplay = (product: IProduct): string => {
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) return `₹${minPrice}`;
    return `₹${minPrice}+`;
  }
  return `₹${product.sellingPrice || 0}`;
};

// Get spice level icon and color
const getSpiceLevelInfo = (level?: string) => {
  switch(level) {
    case 'Mild':
      return { icon: Leaf, color: '#22c55e', label: 'Mild', bg: '#f0fdf4' };
    case 'Medium':
      return { icon: Thermometer, color: '#f59e0b', label: 'Medium', bg: '#fffbeb' };
    case 'Hot':
      return { icon: Flame, color: '#ef4444', label: 'Hot', bg: '#fef2f2' };
    case 'Very Hot':
      return { icon: ZapIcon, color: '#dc2626', label: 'Very Hot', bg: '#fef2f2' };
    default:
      return { icon: Leaf, color: '#9ca3af', label: 'Not specified', bg: '#f9fafb' };
  }
};

// Get variant info for display
const getVariantInfo = (product: IProduct): { count: number; minPrice: number; maxPrice: number; sizes: string[] } => {
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    const prices = product.variants.map(v => v.price);
    const sizes = product.variants.map(v => v.size || v.name).filter(Boolean);
    return {
      count: product.variants.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      sizes: [...new Set(sizes)]
    };
  }
  return { count: 0, minPrice: 0, maxPrice: 0, sizes: [] };
};

// Get first few variants for preview
const getVariantPreview = (product: IProduct): string => {
  if (!product.variants || product.variants.length === 0) return '';
  const preview = product.variants.slice(0, 3).map(v => v.name).join(', ');
  if (product.variants.length > 3) {
    return `${preview} +${product.variants.length - 3} more`;
  }
  return preview;
};

// ─── Enhanced Variant Selection Modal ───────────────────────────────────────────────
function VariantSelectionModal({
  product,
  onSelect,
  onClose
}: {
  product: IProduct;
  onSelect: (variant: IVariant) => void;
  onClose: () => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState<IVariant | null>(
    product.variants?.[0] || null
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!product.variants || product.variants.length === 0) return null;

  const handleVariantSelect = (variant: IVariant, index: number) => {
    setSelectedVariant(variant);
    setSelectedIndex(index);
  };

  // Get variant image URL
  const getVariantImageUrl = (variant: IVariant) => {
    if (variant.image) return variant.image;
    if (product.image) return product.image;
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header with dish info */}
        <div className="p-5 border-b bg-gradient-to-r from-orange-50 to-white">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {product.isVeg !== undefined && (
                  <div className="w-5 h-5 rounded border-2 flex items-center justify-center" style={{ borderColor: product.isVeg === false ? '#ef4444' : '#22c55e' }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: product.isVeg === false ? '#ef4444' : '#22c55e' }} />
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
                {selectedVariant?.isRecommended && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <Star size={10} /> Recommended
                  </span>
                )}
                {selectedVariant?.isPopular && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <Heart size={10} /> Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{product.description || "Delicious dish prepared with fresh ingredients"}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex h-full">
          {/* Left side - Variant options */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto max-h-[60vh]">
            <div className="p-3 space-y-2">
              {product.variants.map((variant, idx) => {
                const isSelected = selectedVariant?.name === variant.name;
                const variantImage = getVariantImageUrl(variant);
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleVariantSelect(variant, idx)}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Variant Image Thumbnail */}
                      {variantImage && (
                        <img 
                          src={variantImage} 
                          alt={variant.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800">{variant.name}</p>
                            {variant.size && (
                              <p className="text-xs text-gray-400 mt-0.5">Size: {variant.size}</p>
                            )}
                          </div>
                          <p className="text-lg font-bold text-orange-500">₹{variant.price}</p>
                        </div>
                        {variant.isRecommended && (
                          <div className="mt-1">
                            <span className="text-[10px] text-amber-600">⭐ Recommended</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side - Selected variant details */}
          <div className="w-2/3 overflow-y-auto max-h-[60vh]">
            {selectedVariant && (
              <div className="p-4 space-y-4">
                {/* Variant Image (Large) */}
                {getVariantImageUrl(selectedVariant) && (
                  <div className="rounded-xl overflow-hidden">
                    <img 
                      src={getVariantImageUrl(selectedVariant)} 
                      alt={selectedVariant.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                {/* Variant Name & Price Header */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Selected Option</p>
                      <p className="text-xl font-bold text-gray-800 mt-1">{selectedVariant.name}</p>
                      {selectedVariant.size && (
                        <p className="text-sm text-gray-500 mt-1">Size: {selectedVariant.size}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-orange-500">₹{selectedVariant.price}</p>
                      {product.sellingPrice && selectedVariant.price !== product.sellingPrice && (
                        <p className="text-xs text-gray-400 line-through">₹{product.sellingPrice}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedVariant.description && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Info size={12} /> Description
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedVariant.description}</p>
                  </div>
                )}

                {/* Quick Info Grid - Only Spice Level and Calories */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Spice Level */}
                  {selectedVariant.spiceLevel && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {(() => {
                          const { icon: Icon, color } = getSpiceLevelInfo(selectedVariant.spiceLevel);
                          return <Icon size={14} style={{ color }} />;
                        })()}
                        <span className="text-xs font-semibold text-gray-500">Spice Level</span>
                      </div>
                      <p className="text-sm font-bold" style={{ color: getSpiceLevelInfo(selectedVariant.spiceLevel).color }}>
                        {selectedVariant.spiceLevel}
                      </p>
                    </div>
                  )}

                  {/* Calories */}
                  {selectedVariant.calories && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame size={14} className="text-orange-500" />
                        <span className="text-xs font-semibold text-gray-500">Calories</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">~{selectedVariant.calories} kcal</p>
                    </div>
                  )}

                  {/* Dietary Info */}
                  {product.dietaryType && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Leaf size={14} className="text-green-600" />
                        <span className="text-xs font-semibold text-gray-500">Dietary</span>
                      </div>
                      <p className="text-sm font-medium text-green-700">
                        {product.dietaryType === 'Veg' ? 'Vegetarian' :
                         product.dietaryType === 'Non-veg' ? 'Non-Vegetarian' :
                         product.dietaryType === 'Vegan' ? 'Vegan' :
                         product.dietaryType === 'Jain' ? 'Jain' : product.dietaryType}
                      </p>
                    </div>
                  )}
                </div>

                {/* Allergen Info */}
                {selectedVariant.description && (
                  (selectedVariant.description.toLowerCase().includes('nuts') ||
                   selectedVariant.description.toLowerCase().includes('gluten') ||
                   selectedVariant.description.toLowerCase().includes('dairy')) && (
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">
                          ⚠️ Contains allergens. Please check with staff for details.
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => selectedVariant && onSelect(selectedVariant)} 
            className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            Add {selectedVariant?.name} • ₹{selectedVariant?.price}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Multi-Table Selection Modal ──────────────────────────────────────────
function MultiTableSelectionModal({
  tables,
  selectedTables,
  onToggleTable,
  onConfirm,
  onClose
}: {
  tables: ITable[];
  selectedTables: string[];
  onToggleTable: (tableId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Select Tables</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Choose tables for this order</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tables.map(table => {
              const isSelected = selectedTables.includes(table._id);
              const isOccupied = table.status === 'occupied';
              return (
                <button
                  key={table._id}
                  onClick={() => !isOccupied && onToggleTable(table._id)}
                  disabled={isOccupied}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    isSelected ? 'border-orange-500 bg-orange-50'
                      : isOccupied ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {isSelected ? <CheckSquare size={24} className="text-orange-500" /> : <Square size={24} className="text-gray-400" />}
                  </div>
                  <p className="text-xl font-bold text-gray-800">Table {table.number}</p>
                  <p className="text-xs text-gray-500 mt-1">{table.name}</p>
                  <p className={`text-xs mt-1 font-medium ${isOccupied ? 'text-red-500' : 'text-green-500'}`}>
                    {isOccupied ? 'Occupied' : 'Available'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600">
            Confirm ({selectedTables.length} Table{selectedTables.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function POSPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Data
  const [products, setProducts] = useState<IProduct[]>([]);
  const [tables, setTables] = useState<ITable[]>([]);
  const [activeOrders, setActiveOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAll, setSubmittingAll] = useState(false);

  // UI
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [showTableModal, setShowTableModal] = useState(false);
  const [showAddToOrderModal, setShowAddToOrderModal] = useState(false);
  const [selectedExistingOrder, setSelectedExistingOrder] = useState<string | null>(null);

  // Variant selection state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);

  // ✅ Stock availability state – now using bulk check
  const [unavailableDishes, setUnavailableDishes] = useState<Set<string>>(new Set());
  const [checkingStock, setCheckingStock] = useState(false);

  // Order mode
  const [multiTableMode, setMultiTableMode] = useState(false);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');

  // Single order
  const [selectedTable, setSelectedTable] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [cart, setCart] = useState<ICartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [error, setError] = useState('');
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [existingOrderPaymentStatus, setExistingOrderPaymentStatus] = useState<string | null>(null);
  const [existingOrderIsVip, setExistingOrderIsVip] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [existingOrderDetails, setExistingOrderDetails] = useState<any>(null);

  // VIP
  const [isVip, setIsVip] = useState(false);
  const [vipNotes, setVipNotes] = useState('');

  // Multi-table
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableCarts, setTableCarts] = useState<Record<string, ICartItem[]>>({});
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [tableNotes, setTableNotes] = useState<Record<string, string>>({});
  const [tableDiscounts, setTableDiscounts] = useState<Record<string, number>>({});
  const [tableDiscountTypes, setTableDiscountTypes] = useState<Record<string, 'percentage' | 'fixed'>>({});
  const [showMultiTableModal, setShowMultiTableModal] = useState(false);

  // ─── Check Authentication on Mount ──────────────────────────────────────────
  useEffect(() => {
    const token = adminStorage.getToken();
    if (!token) {
      toast.error('Please login again');
      navigate('/login');
      return;
    }
    // Set the token in the API headers
    adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('🔑 Admin token set in POS');
  }, [navigate]);

  // ─── URL params ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');
    const round = params.get('round');
    const tableId = params.get('tableId');

    if (orderId) {
      setExistingOrderId(orderId);
      setCurrentRound(parseInt(round || '1'));
      
      const token = adminStorage.getToken();
      if (token) {
        adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        adminApi.get(`/orders/${orderId}`).then(res => {
          if (res.data.success) {
            const order = res.data.data;
            setExistingOrderPaymentStatus(order.paymentStatus);
            setExistingOrderIsVip(order.isVip || false);
            if (order.paymentStatus === 'paid') {
              toast.success('Previous order was paid. Creating new order.');
            } else {
              toast.success(`Adding Round ${parseInt(round || '1')} to existing order`);
              if (order.isVip) toast.success('⭐ VIP Customer – Priority in Kitchen!');
            }
          }
        }).catch(console.error);
      }
    }
    if (tableId) setSelectedTable(tableId);
  }, [location]);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchActiveOrders = useCallback(async () => {
    try {
      const token = adminStorage.getToken();
      if (!token) {
        console.warn('No admin token for fetching orders');
        return;
      }
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const res = await adminApi.get('/orders?orderType=dine-in&orderStatus=pending,confirmed,preparing,ready');
      if (res.data.success) {
        const orders = res.data.data?.orders || [];
        setActiveOrders(orders);
      }
    } catch (e) { 
      console.error('Failed to fetch active orders:', e);
      try {
        const fallbackRes = await adminApi.get('/orders?orderType=dine-in');
        if (fallbackRes.data.success) {
          const allOrders = fallbackRes.data.data?.orders || [];
          const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
          const activeOrders = allOrders.filter((order: any) => 
            activeStatuses.includes(order.orderStatus)
          );
          setActiveOrders(activeOrders);
        }
      } catch (fallbackErr) {
        console.error('Fallback fetch failed:', fallbackErr);
      }
    }
  }, []);

  // ✅ NEW: Bulk availability check using /dishes/availability
  const checkAllDishesAvailability = useCallback(async () => {
    if (products.length === 0) return;
    setCheckingStock(true);
    try {
      const token = adminStorage.getToken();
      if (!token) return;
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Build items array: { productId, quantity: 1 } for each product
      const items = products.map(p => ({ productId: p._id, quantity: 1 }));
      const res = await adminApi.post('/dishes/availability', { items });

      if (res.data.success) {
        const availabilityData = res.data.data;
        const unavailable = new Set<string>();
        availabilityData.forEach((result: any) => {
          if (!result.available) {
            unavailable.add(result.productId);
          }
        });
        setUnavailableDishes(unavailable);
        console.log(`✅ Stock check: ${unavailable.size} dish(es) unavailable`);
      } else {
        console.warn('Bulk availability check failed:', res.data.error);
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
    } finally {
      setCheckingStock(false);
    }
  }, [products]);

  // ── Check single dish (used on click) ───────────────────────────────────────
  const checkDishAvailability = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const token = adminStorage.getToken();
      if (!token) return false;
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const res = await adminApi.post(`/dishes/${productId}/validate-stock`, { quantity: 1 });
      if (!res.data.success) return false;
      return true;
    } catch (error) {
      console.error('Single stock check failed:', error);
      return false;
    }
  }, []);

  // ── Main fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = adminStorage.getToken();
        if (!token) {
          toast.error('Please login again');
          navigate('/login');
          return;
        }
        // Ensure token is set in headers
        adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('📤 Fetching dishes and tables...');
        
        const [dishesRes, tablesRes] = await Promise.all([
          adminApi.get('/dishes?limit=200'),
          adminApi.get('/tables?status=available'),
        ]);

        if (dishesRes.data.success) {
          const dishes: IDish[] = dishesRes.data.data?.dishes || dishesRes.data.dishes || [];
          const transformedProducts: IProduct[] = dishes.map((dish: IDish) => ({
            _id: dish._id,
            name: dish.name,
            category: dish.categoryName || 'Other',
            sellingPrice: dish.price || 0,
            unit: 'plate',
            image: dish.image,
            prepTimeMinutes: 15,
            isVeg: dish.dietaryType === 'Veg',
            description: dish.description,
            variants: dish.variants || [],
            hasVariants: dish.hasVariants || (dish.variants && dish.variants.length > 0),
            dietaryType: dish.dietaryType,
          }));
          setProducts(transformedProducts);
          const uniqueCategories = ['All', ...new Set(transformedProducts.map(p => p.category).filter(Boolean))];
          setCategories(uniqueCategories);
          console.log('✅ Dishes loaded:', transformedProducts.length);
        }

        if (tablesRes.data.success) {
          setTables(tablesRes.data.data?.tables || []);
          console.log('✅ Tables loaded:', tablesRes.data.data?.tables?.length || 0);
        }
        
        await fetchActiveOrders();
      } catch (err: any) {
        console.error('❌ Fetch error:', err.response?.status, err.response?.data);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          adminStorage.clear();
          navigate('/login');
        } else if (err.response?.status === 403) {
          toast.error('You don\'t have permission to access this data');
        } else {
          toast.error('Failed to load menu items');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchActiveOrders, navigate]);

  // ── After products load, check availability ────────────────────────────────
  useEffect(() => {
    if (products.length > 0 && !loading) {
      checkAllDishesAvailability();
    }
  }, [products, loading, checkAllDishesAvailability]);

  // ── Auto-refresh stock every 60 seconds ────────────────────────────────────
  useEffect(() => {
    if (products.length === 0) return;
    const interval = setInterval(() => {
      checkAllDishesAvailability();
    }, 60000); // ✅ increased to 60 seconds
    return () => clearInterval(interval);
  }, [products, checkAllDishesAvailability]);

  // ── Existing order details ─────────────────────────────────────────────────
  useEffect(() => {
    if (existingOrderId) {
      const token = adminStorage.getToken();
      if (token) {
        adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        adminApi.get(`/orders/${existingOrderId}`)
          .then(res => { if (res.data.success) setExistingOrderDetails(res.data.data); })
          .catch(() => {});
      }
    }
  }, [existingOrderId]);

  // ── Cart helpers ───────────────────────────────────────────────────────────

  const handleProductClick = async (product: IProduct) => {
    // ✅ First, check availability (real-time)
    if (unavailableDishes.has(product._id)) {
      toast.error(`${product.name} is currently unavailable`);
      return;
    }
    const isAvailable = await checkDishAvailability(product._id);
    if (!isAvailable) {
      toast.error(`${product.name} is currently unavailable`);
      // Update the local unavailable set to reflect this
      setUnavailableDishes(prev => new Set(prev).add(product._id));
      return;
    }
    if (product.hasVariants && product.variants && product.variants.length > 1) {
      setSelectedProduct(product);
      setShowVariantModal(true);
    } else if (product.hasVariants && product.variants && product.variants.length === 1) {
      addToCartWithVariant(product, product.variants[0]);
    } else {
      addToCartWithVariant(product, null);
    }
  };

  const addToCartWithVariant = async (product: IProduct, variant: IVariant | null) => {
    const price = variant ? variant.price : product.sellingPrice;
    const variantName = variant ? variant.name : 'Regular';

    if (multiTableMode && activeTableId) {
      setTableCarts(prev => {
        const cur = prev[activeTableId] || [];
        const existingIndex = cur.findIndex(i => i.productId === product._id && i.variantName === variantName);
        if (existingIndex !== -1) {
          const updated = [...cur];
          updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1, totalPrice: (updated[existingIndex].quantity + 1) * price };
          return { ...prev, [activeTableId]: updated };
        } else {
          return { ...prev, [activeTableId]: [...cur, { productId: product._id, productName: product.name, quantity: 1, unitPrice: price, totalPrice: price, prepTimeMinutes: product.prepTimeMinutes || 15, variantName, variantPrice: price }] };
        }
      });
      toast.success(`Added ${product.name} to Table ${tables.find(t => t._id === activeTableId)?.number}`);
    } else {
      setCart(prev => {
        const existingIndex = prev.findIndex(i => i.productId === product._id && i.variantName === variantName);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1, totalPrice: (updated[existingIndex].quantity + 1) * price };
          return updated;
        } else {
          return [...prev, { productId: product._id, productName: product.name, quantity: 1, unitPrice: price, totalPrice: price, prepTimeMinutes: product.prepTimeMinutes || 15, variantName, variantPrice: price }];
        }
      });
      toast.success(`Added ${product.name}`);
    }
  };

  const updateQty = useCallback((id: string, variantName: string, qty: number) => {
    setCart(prev => {
      const itemIndex = prev.findIndex(i => i.productId === id && i.variantName === variantName);
      if (itemIndex === -1) return prev;
      if (qty <= 0) return prev.filter((_, idx) => idx !== itemIndex);
      const updated = [...prev];
      updated[itemIndex] = { ...updated[itemIndex], quantity: qty, totalPrice: qty * updated[itemIndex].unitPrice };
      return updated;
    });
  }, []);

  const removeItem = useCallback((id: string, variantName: string) => {
    setCart(prev => prev.filter(i => !(i.productId === id && i.variantName === variantName)));
  }, []);

  const updateTableQty = (tableId: string, productId: string, variantName: string, qty: number) => {
    setTableCarts(prev => {
      const cur = prev[tableId] || [];
      const itemIndex = cur.findIndex(i => i.productId === productId && i.variantName === variantName);
      if (itemIndex === -1) return prev;
      if (qty <= 0) return { ...prev, [tableId]: cur.filter((_, idx) => idx !== itemIndex) };
      const updated = [...cur];
      updated[itemIndex] = { ...updated[itemIndex], quantity: qty, totalPrice: qty * updated[itemIndex].unitPrice };
      return { ...prev, [tableId]: updated };
    });
  };

  const removeTableItem = (tableId: string, productId: string, variantName: string) => {
    setTableCarts(prev => ({ ...prev, [tableId]: (prev[tableId] || []).filter(i => !(i.productId === productId && i.variantName === variantName)) }));
  };

  // ── Multi-Table ───────────────────────────────────────────────────────────

  const toggleTableForMultiSelect = (tableId: string) => {
    setSelectedTables(prev => prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]);
  };

  const confirmMultiTableSelection = () => {
    if (selectedTables.length === 0) { toast.error('Please select at least one table'); return; }
    setActiveTableId(selectedTables[0]);
    setShowMultiTableModal(false);
    toast.success(`${selectedTables.length} table(s) selected`);
  };

  // ── Totals ─────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0);
  const tax = subtotal * 0.05;
  const discountAmt = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const total = Math.max(0, subtotal + tax - discountAmt);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const getTableTotals = (tableId: string) => {
    const items = tableCarts[tableId] || [];
    const sub = items.reduce((s, i) => s + i.totalPrice, 0);
    const tx = sub * 0.05;
    const dt = tableDiscountTypes[tableId] || 'fixed';
    const dv = tableDiscounts[tableId] || 0;
    const da = dt === 'percentage' ? (sub * dv) / 100 : dv;
    return { subtotal: sub, tax: tx, discountAmt: da, total: Math.max(0, sub + tx - da), itemCount: items.reduce((s, i) => s + i.quantity, 0) };
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setCart([]); setDiscount(0); setNotes('');
    setCustomerName(''); setCustomerPhone(''); setCustomerEmail('');
    setSelectedTable(''); setError('');
    setExistingOrderId(null); setExistingOrderPaymentStatus(null);
    setExistingOrderIsVip(false); setExistingOrderDetails(null);
    setIsVip(false); setVipNotes('');
  };

  const resetMultiTable = () => {
    setSelectedTables([]); setTableCarts({}); setActiveTableId(null);
    setTableNotes({}); setTableDiscounts({}); setTableDiscountTypes({});
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const placeSingleOrder = async () => {
    setSubmitting(true); setError('');
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      let result;
      if (existingOrderId) {
        if (existingOrderPaymentStatus === 'paid') {
          const tbl = tables.find(t => t._id === selectedTable);
          result = await adminApi.post('/orders', {
            orderType, tableId: selectedTable || null, tableNumber: tbl?.number || '',
            customerName, customerPhone, customerEmail,
            items: cart.map(({ productId, productName, quantity, unitPrice, totalPrice, notes: n, prepTimeMinutes, variantName }) =>
              ({ productId, productName, quantity, unitPrice, totalPrice, notes: n, prepTimeMinutes: prepTimeMinutes || 15, variantName })),
            discount, discountType, notes, isVip, vipNotes,
          });
          toast.success(isVip ? '⭐ VIP Order placed!' : 'New order created!');
        } else {
          result = await adminApi.patch(`/orders/${existingOrderId}/add-items`, {
            items: cart.map(item => ({ productId: item.productId, productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice, notes: item.notes, prepTimeMinutes: item.prepTimeMinutes || 15, variantName: item.variantName })),
          });
          toast.success(`Round ${currentRound + 1} added!${existingOrderIsVip ? ' ⭐ VIP Priority maintained.' : ''}`);
        }
      } else {
        if (orderType === 'dine-in' && !selectedTable) { setError('Please select a table'); setSubmitting(false); return; }
        const tbl = tables.find(t => t._id === selectedTable);
        result = await adminApi.post('/orders', {
          orderType,
          tableId: orderType === 'dine-in' ? (selectedTable || undefined) : undefined,
          tableNumber: orderType === 'dine-in' ? tbl?.number : undefined,
          customerName: customerName || undefined, customerPhone: customerPhone || undefined,
          customerEmail: customerEmail || undefined,
          items: cart.map(({ productId, productName, quantity, unitPrice, totalPrice, notes: n, prepTimeMinutes, variantName }) =>
            ({ productId, productName, quantity, unitPrice, totalPrice, notes: n, prepTimeMinutes: prepTimeMinutes || 15, variantName })),
          discount, discountType, notes, isVip, vipNotes,
        });
        toast.success(isVip ? '⭐ VIP Order placed!' : 'Order placed!');
        if (customerEmail) toast.success(`📧 Confirmation sent to ${customerEmail}`);
      }
      if (result?.data?.success) {
        handleReset();
        // ✅ Refresh stock after order placement
        checkAllDishesAvailability();
        navigate('/orders');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally { setSubmitting(false); }
  };

  const placeActiveTableOrder = async () => {
    if (!activeTableId) { setError('No table selected'); return; }
    const items = tableCarts[activeTableId] || [];
    if (!items.length) { setError('Cart is empty for this table'); return; }
    setSubmitting(true); setError('');
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const tbl = tables.find(t => t._id === activeTableId);
      await adminApi.post('/orders', {
        orderType: 'dine-in', tableId: activeTableId, tableNumber: tbl?.number,
        items: items.map(({ productId, productName, quantity, unitPrice, totalPrice, notes: n, prepTimeMinutes, variantName }) =>
          ({ productId, productName, quantity, unitPrice, totalPrice, notes: n, prepTimeMinutes: prepTimeMinutes || 15, variantName })),
        discount: tableDiscounts[activeTableId] || 0, discountType: tableDiscountTypes[activeTableId] || 'fixed',
        notes: tableNotes[activeTableId] || '', isVip: false,
      });
      toast.success(`Order placed for Table ${tbl?.number}`);
      setTableCarts(prev => ({ ...prev, [activeTableId]: [] }));
      setTableDiscounts(prev => ({ ...prev, [activeTableId]: 0 }));
      setTableNotes(prev => ({ ...prev, [activeTableId]: '' }));
      await fetchActiveOrders();
      // ✅ Refresh stock after order
      checkAllDishesAvailability();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally { setSubmitting(false); }
  };

  const placeAllOrders = async () => {
    const tablesWithItems = selectedTables.filter(tid => (tableCarts[tid] || []).length > 0);
    if (!tablesWithItems.length) { setError('No items in any table cart'); return; }
    setSubmittingAll(true); setError('');
    let successCount = 0;
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      for (const tableId of tablesWithItems) {
        const items = tableCarts[tableId] || [];
        if (!items.length) continue;
        const tbl = tables.find(t => t._id === tableId);
        await adminApi.post('/orders', {
          orderType: 'dine-in', tableId, tableNumber: tbl?.number,
          items: items.map(({ productId, productName, quantity, unitPrice, totalPrice, notes: n, prepTimeMinutes, variantName }) =>
            ({ productId, productName, quantity, unitPrice, totalPrice, notes: n, prepTimeMinutes: prepTimeMinutes || 15, variantName })),
          discount: tableDiscounts[tableId] || 0, discountType: tableDiscountTypes[tableId] || 'fixed',
          notes: tableNotes[tableId] || '', isVip: false,
        });
        successCount++;
        setTableCarts(prev => ({ ...prev, [tableId]: [] }));
      }
      toast.success(`${successCount} order${successCount > 1 ? 's' : ''} placed!`);
      await fetchActiveOrders();
      // ✅ Refresh stock
      checkAllDishesAvailability();
      if (!selectedTables.some(tid => (tableCarts[tid] || []).length > 0)) { resetMultiTable(); setMultiTableMode(false); }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place orders');
    } finally { setSubmittingAll(false); }
  };

  const addToExistingOrderFromModal = async () => {
    if (!selectedExistingOrder || !cart.length) { setError('Add items first'); return; }
    setSubmitting(true);
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const res = await adminApi.get(`/orders/${selectedExistingOrder}`);
      const orderData = res.data.data;
      const isPaid = orderData?.paymentStatus === 'paid';
      if (isPaid) {
        await adminApi.post('/orders', {
          orderType: 'dine-in', tableId: orderData?.tableId, tableNumber: orderData?.tableNumber,
          customerName: orderData?.customerName || customerName, customerPhone: orderData?.customerPhone || customerPhone,
          customerEmail: orderData?.customerEmail || customerEmail,
          items: cart.map(item => ({ productId: item.productId, productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice, notes: item.notes, prepTimeMinutes: item.prepTimeMinutes || 15, variantName: item.variantName })),
          discount, discountType, notes, isVip: isVip || orderData?.isVip, vipNotes: vipNotes || orderData?.vipNotes,
        });
        toast.success(isVip ? '⭐ VIP Order created!' : 'New order created');
      } else {
        await adminApi.patch(`/orders/${selectedExistingOrder}/add-items`, {
          items: cart.map(item => ({ productId: item.productId, productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice, notes: item.notes, prepTimeMinutes: item.prepTimeMinutes || 15, variantName: item.variantName })),
        });
        toast.success(orderData?.isVip ? '⭐ Items added to VIP order!' : 'Items added!');
      }
      handleReset(); setSelectedExistingOrder(null); setShowAddToOrderModal(false);
      await fetchActiveOrders();
      // ✅ Refresh stock
      checkAllDishesAvailability();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleSubmit = async () => {
    if (multiTableMode) {
      if (!selectedTables.length) { setError('Please select tables'); setShowMultiTableModal(true); return; }
      if (activeTableId && (tableCarts[activeTableId] || []).length > 0) await placeActiveTableOrder();
      else setError('Add items to cart first');
      return;
    }
    if (!cart.length) { setError('Add at least one item'); return; }
    if (orderType === 'dine-in' && !selectedTable && !existingOrderId) { setError('Please select a table'); setShowTableModal(true); return; }
    await placeSingleOrder();
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const userInitials = getInitials(user?.firstName, user?.lastName);

  // ── Active cart items for current context ──────────────────────────────────
  const activeCartItems = multiTableMode && activeTableId ? (tableCarts[activeTableId] || []) : cart;
  const activeSubtotal = multiTableMode && activeTableId ? getTableTotals(activeTableId).subtotal : subtotal;
  const activeTax = multiTableMode && activeTableId ? getTableTotals(activeTableId).tax : tax;
  const activeDiscountAmt = multiTableMode && activeTableId ? getTableTotals(activeTableId).discountAmt : discountAmt;
  const activeTotal = multiTableMode && activeTableId ? getTableTotals(activeTableId).total : total;
  const activeItemCount = multiTableMode && activeTableId ? getTableTotals(activeTableId).itemCount : cartCount;
  const activeDiscount = multiTableMode && activeTableId ? (tableDiscounts[activeTableId] || 0) : discount;
  const activeDiscountType = multiTableMode && activeTableId ? (tableDiscountTypes[activeTableId] || 'fixed') : discountType;
  const activeNotes = multiTableMode && activeTableId ? (tableNotes[activeTableId] || '') : notes;

  const setActiveDiscount = (v: number) => {
    if (multiTableMode && activeTableId) setTableDiscounts(prev => ({ ...prev, [activeTableId]: v }));
    else setDiscount(v);
  };
  const setActiveDiscountType = (v: 'percentage' | 'fixed') => {
    if (multiTableMode && activeTableId) setTableDiscountTypes(prev => ({ ...prev, [activeTableId]: v }));
    else setDiscountType(v);
  };
  const setActiveNotes = (v: string) => {
    if (multiTableMode && activeTableId) setTableNotes(prev => ({ ...prev, [activeTableId]: v }));
    else setNotes(v);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Top bar ── */}
      <header className="shrink-0 bg-white border-b px-5 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 p-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold leading-tight">POS Terminal</h1>
            <p className="text-[11px] text-gray-400">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {checkingStock && (
            <div className="flex items-center gap-1 text-xs text-orange-500">
              <Loader2 size={12} className="animate-spin" />
              <span>Checking stock...</span>
            </div>
          )}
          {activeOrders.length > 0 && !multiTableMode && (
            <button onClick={() => setShowAddToOrderModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
              <ListOrdered size={13} /> {activeOrders.length} active
            </button>
          )}
          <span className="text-sm font-medium text-gray-700">{user?.firstName}</span>
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-semibold">
            {userInitials}
          </div>
        </div>
      </header>

      {/* ── Main Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Products ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          {/* Search + mode toggle */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-3 bg-white border-b">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5 ml-auto">
              <button
                onClick={() => { setMultiTableMode(false); resetMultiTable(); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!multiTableMode ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
              >
                Single
              </button>
              <button
                onClick={() => setMultiTableMode(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${multiTableMode ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
              >
                Multi-table
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto bg-white border-b scrollbar-none">
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              const { accent } = cat === 'All' ? { accent: '#FF5722' } : getCatColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all ${isActive ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  style={isActive ? { background: accent, borderColor: accent } : {}}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(product => {
                const { bg, accent } = getCatColor(product.category);
                const imgUrl = !imgErrors[product._id] ? getImageUrl(product.image) : null;
                const priceDisplay = getPriceDisplay(product);
                const isUnavailable = unavailableDishes.has(product._id);
                const hasMultipleVariants = product.hasVariants && product.variants && product.variants.length > 1;
                const variantInfo = getVariantInfo(product);
                const variantPreview = getVariantPreview(product);

                return (
                  <div
                    key={product._id}
                    onClick={() => !isUnavailable && handleProductClick(product)}
                    className={`relative bg-white rounded-2xl transition-all ${isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg group'} border border-gray-100 hover:border-gray-200 overflow-hidden`}
                  >
                    {/* Unavailable Badge */}
                    {isUnavailable && (
                      <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center z-10">
                        <span className="text-[11px] font-bold text-white bg-red-500/90 px-3 py-1.5 rounded-full shadow border border-red-400">
                          Not Available
                        </span>
                      </div>
                    )}

                    {/* Variants Badge */}
                    {hasMultipleVariants && !isUnavailable && (
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Layers size={9} className="inline" /> {product.variants?.length} options
                        </span>
                      </div>
                    )}

                    {/* Image */}
                    <div className="w-full h-36 flex items-center justify-center overflow-hidden relative" style={{ background: bg }}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={() => setImgErrors(prev => ({ ...prev, [product._id]: true }))} />
                      ) : (
                        <Package2 size={36} className="text-gray-300" />
                      )}
                      
                      {/* Veg/Non-veg badge */}
                      <span className="absolute top-2 left-2 w-4 h-4 rounded border-2 flex items-center justify-center bg-white" style={{ borderColor: product.isVeg === false ? '#ef4444' : '#22c55e' }}>
                        <span className="w-2 h-2 rounded-full block" style={{ background: product.isVeg === false ? '#ef4444' : '#22c55e' }} />
                      </span>
                      
                      {/* Prep time */}
                      <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Timer size={9} /> {product.prepTimeMinutes || 15}m
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">{product.name}</p>
                      <p className="text-[11px] text-gray-400 mb-2">{product.category}</p>
                      
                      {/* Variant Preview Section */}
                      {hasMultipleVariants && variantInfo.count > 0 && (
                        <div className="mb-2 pb-2 border-b border-dashed border-gray-100">
                          <div className="flex items-center gap-1 text-[9px] text-purple-500 font-medium mb-1">
                            <Layers size={8} />
                            <span>{variantInfo.count} variants</span>
                            {variantInfo.sizes.length > 0 && (
                              <span className="text-gray-400">• {variantInfo.sizes.join(', ')}</span>
                            )}
                          </div>
                          <p className="text-[9px] text-gray-400 truncate" title={variantPreview}>
                            {variantPreview}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-[8px] text-gray-300">
                            <span>Starting from</span>
                            <span className="text-orange-500 font-bold">₹{variantInfo.minPrice}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Price Display */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base font-bold" style={{ color: accent }}>{priceDisplay}</span>
                        {!isUnavailable && (
                          <button
                            className="h-7 px-3 rounded-full flex items-center justify-center text-white text-xs font-bold gap-1 shadow-sm"
                            style={{ background: accent }}
                            onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                          >
                            <Plus size={12} /> ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Cart Panel ── */}
        <div className="w-[380px] shrink-0 flex flex-col bg-white border-l border-gray-100 overflow-hidden">
          {/* Order Type Tabs */}
          <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ['dine-in', 'Dine In', Coffee],
                ['takeaway', 'Takeaway', ShoppingBag],
              ] as const).map(([type, label, Icon]) => (
                <button
                  key={type}
                  onClick={() => { setOrderType(type); setExistingOrderId(null); setExistingOrderPaymentStatus(null); setExistingOrderIsVip(false); }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${orderType === type ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* VIP Toggle */}
          <div className="shrink-0 px-3 py-2 border-b border-gray-100">
            <div className={`rounded-lg border px-3 py-2 transition-all ${isVip ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown size={14} className={isVip ? 'text-amber-500' : 'text-gray-400'} />
                  <span className={`text-xs font-medium ${isVip ? 'text-amber-700' : 'text-gray-500'}`}>
                    {isVip ? 'VIP Customer ⭐' : 'Mark as VIP'}
                  </span>
                </div>
                <button onClick={() => setIsVip(!isVip)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isVip ? 'bg-amber-400' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isVip ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {isVip && (
                <input type="text" placeholder="VIP notes (allergies, celebration…)" value={vipNotes} onChange={e => setVipNotes(e.target.value)} className="mt-1.5 w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-md bg-white placeholder:text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300" />
              )}
            </div>
          </div>

          {/* Table/Customer Selection */}
          {!multiTableMode && orderType === 'dine-in' && !existingOrderId && (
            <div className="shrink-0 px-3 py-2 border-b border-gray-100">
              <button
                onClick={() => setShowTableModal(true)}
                className={`w-full px-3 py-2.5 rounded-lg text-xs flex items-center justify-between transition-all ${selectedTable ? 'border-2 border-orange-400 bg-orange-50 text-orange-700 font-semibold' : 'border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300'}`}
              >
                <span className="flex items-center gap-2">
                  <Table2 size={14} />
                  {selectedTable ? `Table ${tables.find(t => t._id === selectedTable)?.number} – ${tables.find(t => t._id === selectedTable)?.name}` : 'Select a table'}
                </span>
                <ChevronDown size={14} />
              </button>
            </div>
          )}

          {multiTableMode && (
            <div className="shrink-0 px-3 py-2 border-b border-gray-100">
              <button onClick={() => setShowMultiTableModal(true)} className="w-full px-3 py-2.5 rounded-lg text-xs flex items-center justify-between bg-orange-50 border-2 border-orange-200 text-orange-700 font-semibold">
                <span className="flex items-center gap-2"><Users size={14} /> {selectedTables.length > 0 ? `${selectedTables.length} Table${selectedTables.length !== 1 ? 's' : ''} Selected` : 'Select Tables'}</span>
                <ChevronDown size={14} />
              </button>
              {selectedTables.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedTables.map(tableId => {
                    const table = tables.find(t => t._id === tableId);
                    const isActive = activeTableId === tableId;
                    const tCount = getTableTotals(tableId).itemCount;
                    return (
                      <button key={tableId} onClick={() => setActiveTableId(tableId)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        T{table?.number}
                        {tCount > 0 && <span className={`px-1 rounded-full text-[10px] ${isActive ? 'bg-white/30' : 'bg-orange-200 text-orange-700'}`}>{tCount}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Takeaway Customer Info */}
          {orderType === 'takeaway' && !existingOrderId && (
            <div className="shrink-0 px-3 py-2 border-b border-gray-100 space-y-2">
              <div className="relative">
                <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name *" className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300" />
              </div>
              <div className="relative">
                <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number *" className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300" />
              </div>
              <div className="relative">
                <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Email (optional)" className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300" />
              </div>
            </div>
          )}

          {/* Cart Header */}
          <div className="shrink-0 px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShoppingCart size={14} className="text-orange-500" />
              <span className="text-xs font-bold text-gray-700">
                {multiTableMode && activeTableId
                  ? `Table ${tables.find(t => t._id === activeTableId)?.number} — Cart`
                  : 'Your Cart'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeItemCount > 0 && (
                <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">
                  {activeItemCount} item{activeItemCount !== 1 ? 's' : ''}
                </span>
              )}
              {activeCartItems.length > 0 && (
                <button
                  onClick={() => multiTableMode && activeTableId ? setTableCarts(prev => ({ ...prev, [activeTableId]: [] })) : setCart([])}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeCartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2 py-8">
                <ShoppingCart size={36} strokeWidth={1.5} />
                <p className="text-xs font-medium text-gray-400">Cart is empty</p>
                <p className="text-[11px] text-gray-300">Tap items to add</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {activeCartItems.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.variantName}-${idx}`}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-orange-50/40 transition-colors"
                  >
                    <span className="shrink-0 w-3 h-3 rounded-sm border border-green-500 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate leading-tight">{item.productName}</p>
                      {item.variantName && item.variantName !== 'Regular' && (
                        <span className="text-[10px] text-purple-500 font-medium">{item.variantName}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 bg-orange-50 border border-orange-200 rounded-lg px-1 py-0.5">
                      <button
                        onClick={() => multiTableMode && activeTableId
                          ? updateTableQty(activeTableId, item.productId, item.variantName || 'Regular', item.quantity - 1)
                          : updateQty(item.productId, item.variantName || 'Regular', item.quantity - 1)
                        }
                        className="w-5 h-5 flex items-center justify-center text-orange-600 hover:text-red-500 font-bold"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-[12px] font-bold text-orange-700 w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => multiTableMode && activeTableId
                          ? updateTableQty(activeTableId, item.productId, item.variantName || 'Regular', item.quantity + 1)
                          : updateQty(item.productId, item.variantName || 'Regular', item.quantity + 1)
                        }
                        className="w-5 h-5 flex items-center justify-center text-orange-600 hover:text-orange-700 font-bold"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    <div className="text-right shrink-0 w-16">
                      <p className="text-[12px] font-bold text-gray-800">₹{item.totalPrice}</p>
                      {item.quantity > 1 && (
                        <p className="text-[10px] text-gray-400">₹{item.unitPrice} ea</p>
                      )}
                    </div>

                    <button
                      onClick={() => multiTableMode && activeTableId
                        ? removeTableItem(activeTableId, item.productId, item.variantName || 'Regular')
                        : removeItem(item.productId, item.variantName || 'Regular')
                      }
                      className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Summary */}
          <div className="shrink-0 border-t-2 border-gray-100 bg-white">
            <div className="px-3 pt-3 pb-2 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-500">Item Total</span>
                <span className={`text-[12px] font-semibold ${activeCartItems.length ? 'text-gray-800' : 'text-gray-300'}`}>
                  ₹{fmt(activeSubtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-500">GST (5%)</span>
                <span className={`text-[12px] font-semibold ${activeCartItems.length ? 'text-gray-800' : 'text-gray-300'}`}>
                  ₹{fmt(activeTax)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 py-0.5">
                <Tag size={11} className="text-green-500 shrink-0" />
                <input
                  type="number"
                  min="0"
                  value={activeDiscount || ''}
                  onChange={e => setActiveDiscount(Number(e.target.value))}
                  placeholder="Discount"
                  className="w-16 px-2 py-1 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
                <select
                  value={activeDiscountType}
                  onChange={e => setActiveDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="px-2 py-1 text-[11px] border border-gray-200 rounded-md focus:outline-none"
                >
                  <option value="fixed">₹ off</option>
                  <option value="percentage">% off</option>
                </select>
                {activeDiscountAmt > 0 && (
                  <span className="text-[11px] text-green-600 font-semibold ml-auto">−₹{fmt(activeDiscountAmt)}</span>
                )}
              </div>

              <textarea
                rows={1}
                value={activeNotes}
                onChange={e => setActiveNotes(e.target.value)}
                placeholder="Special instructions..."
                className="w-full px-2.5 py-1.5 text-[11px] border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-orange-300 placeholder:text-gray-300"
              />

              <div className="border-t border-dashed border-gray-200 pt-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className={`text-xl font-black ${activeCartItems.length ? 'text-orange-500' : 'text-gray-300'}`}>
                    ₹{fmt(activeTotal)}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-3 mb-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="px-3 pb-3 flex gap-2">
              <button
                onClick={() => navigate('/orders')}
                className="shrink-0 px-3 py-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Receipt size={15} />
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || activeCartItems.length === 0}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-200/60 transition-all hover:shadow-orange-300/80 active:scale-[0.98]"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                {existingOrderId ? `Add Round ${currentRound + 1}` : 'Place Order'}
              </button>
            </div>

            {multiTableMode && selectedTables.filter(tid => (tableCarts[tid] || []).length > 0).length > 1 && (
              <div className="px-3 pb-3">
                <button
                  onClick={placeAllOrders}
                  disabled={submittingAll}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {submittingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Place All Orders ({selectedTables.filter(tid => (tableCarts[tid] || []).length > 0).length} tables)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showVariantModal && selectedProduct && (
        <VariantSelectionModal
          product={selectedProduct}
          onSelect={(variant) => { addToCartWithVariant(selectedProduct, variant); setShowVariantModal(false); setSelectedProduct(null); }}
          onClose={() => { setShowVariantModal(false); setSelectedProduct(null); }}
        />
      )}

      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTableModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b sticky top-0 bg-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Select Table</h3>
              <button onClick={() => setShowTableModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {tables.map(table => (
                <button
                  key={table._id}
                  onClick={() => { setSelectedTable(table._id); setShowTableModal(false); }}
                  className={`p-4 border-2 rounded-xl text-center transition-all hover:border-orange-400 hover:bg-orange-50 ${selectedTable === table._id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                >
                  <Table2 size={22} className="mx-auto text-gray-400 mb-1.5" />
                  <p className="font-bold text-base">Table {table.number}</p>
                  <p className="text-xs text-gray-400">{table.name}</p>
                  <p className={`text-xs mt-1 font-medium ${table.status === 'occupied' ? 'text-red-500' : 'text-green-500'}`}>
                    {table.status === 'occupied' ? 'Occupied' : 'Available'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMultiTableModal && (
        <MultiTableSelectionModal
          tables={tables}
          selectedTables={selectedTables}
          onToggleTable={toggleTableForMultiSelect}
          onConfirm={confirmMultiTableSelection}
          onClose={() => setShowMultiTableModal(false)}
        />
      )}

      {showAddToOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddToOrderModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b sticky top-0 bg-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Add to Existing Order</h3>
              <button onClick={() => setShowAddToOrderModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              {activeOrders.map(order => (
                <button
                  key={order._id}
                  onClick={() => { setSelectedExistingOrder(order._id); addToExistingOrderFromModal(); }}
                  className="w-full p-4 border-2 border-gray-100 rounded-xl text-left hover:border-orange-400 hover:bg-orange-50 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">Table {order.tableNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-500 text-sm">₹{order.total}</p>
                      <p className="text-xs text-gray-400">{order.items.length} items</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}