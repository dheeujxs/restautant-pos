// pages/staff-portal/StaffPOS.tsx - COMPLETE FIXED VERSION

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { staffApi } from '../../services/api';
import {
  ArrowLeft, Plus, Minus, Trash2, Coffee, ShoppingBag, Truck,
  Search, Loader2, Package2, X, ChevronDown,
  RotateCcw, ShoppingCart, Zap, Tag,
  AlertCircle, Users, Crown, Sparkles,
  Timer, Table2, Receipt, User, Phone,
  IndianRupee, Clock, ChefHat, Layers,
  Star, Heart, Flame, Leaf, Thermometer, Zap as ZapIcon, RefreshCw,
  Eye, CheckCircle, Info, Utensils, Beef
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IVariant {
  name: string;
  price: number;
  size?: string;
  description?: string;
  calories?: number;
  spiceLevel?: 'Mild' | 'Medium' | 'Hot' | 'Very Hot';
  preparationTime?: number;
  isRecommended?: boolean;
  isPopular?: boolean;
  image?: string;
}

interface IProduct {
  _id: string;
  name: string;
  category: string;
  sellingPrice: number;
  unit: string;
  image?: string;
  images?: string[];
  prepTimeMinutes?: number;
  isVeg?: boolean;
  description?: string;
  variants?: IVariant[];
  hasVariants?: boolean;
  dietaryType?: string;
  price?: number;
  isAvailable?: boolean;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getImageUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `http://localhost:8000${url}`;
  return `http://localhost:8000/uploads/${url}`;
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

const fmt = (n: number) => n.toFixed(2);

// ─── FIXED: getPriceDisplay with proper null/undefined handling ──────────────
const getPriceDisplay = (product: IProduct): string => {
  // ✅ Check variants first
  if (product.variants && product.variants.length > 0) {
    const prices = product.variants.map(v => v.price).filter(p => p > 0);
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (minPrice === maxPrice) return `₹${minPrice}`;
      return `₹${minPrice}+`;
    }
  }
  
  // ✅ Fallback to dish price with proper null/undefined handling
  const price = product.sellingPrice ?? product.price ?? 0;
  if (price === 0 && product.variants && product.variants.length > 0) {
    const prices = product.variants.map(v => v.price).filter(p => p > 0);
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      return `₹${minPrice}+`;
    }
  }
  return `₹${price}`;
};

// ─── FIXED: getProductPrice with proper null/undefined handling ──────────────
const getProductPrice = (product: IProduct, variant: IVariant | null): number => {
  if (variant) {
    return variant.price || 0;
  }
  
  // Check if product has variants with prices
  if (product.variants && product.variants.length > 0) {
    const firstVariant = product.variants.find(v => v.price > 0);
    if (firstVariant) {
      return firstVariant.price;
    }
  }
  
  // Fallback to product price
  return product.sellingPrice ?? product.price ?? 0;
};

// ─── Variant Selection Modal ────────────────────────────────────────────────

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

  if (!product.variants || product.variants.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        
        <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-gray-500 mt-1">{product.description}</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {product.variants.map((variant, idx) => {
            const isSelected = selectedVariant?.name === variant.name;
            return (
              <button
                key={idx}
                onClick={() => setSelectedVariant(variant)}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{variant.name}</p>
                    {variant.size && (
                      <p className="text-xs text-gray-400">Size: {variant.size}</p>
                    )}
                    {variant.isRecommended && (
                      <span className="text-[10px] text-amber-600">⭐ Recommended</span>
                    )}
                    {variant.spiceLevel && (
                      <span className="text-[10px] text-orange-500 ml-2">🌶 {variant.spiceLevel}</span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-orange-500">₹{variant.price}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            onClick={() => selectedVariant && onSelect(selectedVariant)} 
            className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            Add • ₹{selectedVariant?.price || 0}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Summary Modal ────────────────────────────────────────────────────

function OrderSummaryModal({ 
  order, 
  onClose,
  onViewOrder 
}: { 
  order: any; 
  onClose: () => void;
  onViewOrder: () => void;
}) {
  if (!order) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        
        <div className="p-4 border-b bg-gradient-to-r from-green-50 to-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              Order Placed! 🎉
            </h3>
            <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs text-gray-400">Order Type</p>
              <p className="font-semibold capitalize">{order.orderType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                {order.orderStatus || 'Pending'}
              </span>
            </div>
            {order.tableNumber && (
              <div>
                <p className="text-xs text-gray-400">Table</p>
                <p className="font-semibold">Table {order.tableNumber}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Items</p>
              <p className="font-semibold">{order.items?.length || 0} items</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-700 mb-2">Order Items</h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {item.quantity}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                    {item.variantName && item.variantName !== 'Regular' && (
                      <span className="text-xs text-purple-500">{item.variantName}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700 shrink-0 ml-2">₹{item.totalPrice}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax (5%)</span>
              <span>₹{order.tax}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-₹{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-dashed border-gray-200">
              <span>Total</span>
              <span className="text-orange-500">₹{order.total}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition"
          >
            Close
          </button>
          <button
            onClick={onViewOrder}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            View Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StaffPOS() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tableIdParam = params.get('tableId');
  const tableNumberParam = params.get('tableNumber');

  const [products, setProducts] = useState<IProduct[]>([]);
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  
  const [selectedTable, setSelectedTable] = useState<{ id: string; number: string } | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  
  const [cart, setCart] = useState<ICartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [error, setError] = useState('');

  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<any>(null);

  useEffect(() => {
    if (tableIdParam && tableNumberParam) {
      setSelectedTable({ id: tableIdParam, number: tableNumberParam });
    }
  }, [tableIdParam, tableNumberParam]);

  // ─── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dishesRes, tablesRes] = await Promise.all([
          staffApi.get('/staff-portal/menu'),
          staffApi.get('/staff-portal/tables'),
        ]);

        console.log('📦 Full Menu response:', JSON.stringify(dishesRes.data, null, 2));

        if (dishesRes.data.success) {
          const menuData = dishesRes.data.data?.menu || dishesRes.data.data || [];
          let transformedProducts: IProduct[] = [];
          
          if (Array.isArray(menuData) && menuData.length > 0) {
            menuData.forEach((category: any) => {
              const dishes = category.dishes || [];
              
              dishes.forEach((dish: any) => {
                if (dish.isAvailable === false) {
                  console.log(`⚠️ Dish ${dish.name} is unavailable, skipping`);
                  return;
                }
                
                // ✅ Process variants
                const processedVariants = (dish.variants || []).map((v: any) => ({
                  name: v.name || 'Regular',
                  price: v.price || 0,
                  size: v.size || '',
                  description: v.description || '',
                  isRecommended: v.isRecommended || false,
                  isPopular: v.isPopular || false,
                  preparationTime: v.preparationTime || dish.preparationTime || 15,
                  spiceLevel: v.spiceLevel || '',
                  calories: v.calories || 0,
                  image: v.image || dish.image || '',
                }));
                
                // ✅ Check if there are variants with valid prices
                const hasValidVariants = processedVariants.some(v => v.price > 0);
                const hasVariants = dish.hasVariants || (processedVariants.length > 0 && hasValidVariants);
                
                transformedProducts.push({
                  _id: dish._id,
                  name: dish.name || 'Unknown',
                  category: category.name || dish.categoryName || 'Other',
                  sellingPrice: dish.sellingPrice || dish.price || 0,
                  unit: 'plate',
                  image: dish.image || (dish.images && dish.images.length > 0 ? dish.images[0] : ''),
                  images: dish.images || [],
                  prepTimeMinutes: dish.preparationTime || dish.prepTimeMinutes || 15,
                  isVeg: dish.dietaryType === 'Veg' || dish.isVeg === true,
                  description: dish.description || '',
                  variants: processedVariants,
                  hasVariants: hasVariants,
                  dietaryType: dish.dietaryType || 'Veg',
                  price: dish.price || dish.sellingPrice || 0,
                  isAvailable: dish.isAvailable !== false,
                });
              });
            });
          }
          
          console.log(`📦 Transformed ${transformedProducts.length} products`);
          setProducts(transformedProducts);
          
          const uniqueCategories = ['All', ...new Set(transformedProducts.map(p => p.category).filter(Boolean))];
          setCategories(uniqueCategories);
        }

        if (tablesRes.data.success) {
          const tablesData = tablesRes.data.data?.tables || tablesRes.data.data || [];
          setTables(tablesData);
        }
      } catch (err: any) {
        console.error('❌ Fetch error:', err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('staffToken');
          localStorage.removeItem('staffData');
          navigate('/staff-portal/login');
        } else {
          toast.error('Failed to load menu: ' + (err.response?.data?.error || err.message));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  // ─── FIXED: Cart Helpers with proper price handling ─────────────────────────

  const handleProductClick = (product: IProduct) => {
    // ✅ Check if product has variants with valid prices
    const hasValidVariants = product.variants && product.variants.some(v => v.price > 0);
    
    if (hasValidVariants && product.variants && product.variants.length > 1) {
      // Show variant selection modal
      setSelectedProduct(product);
      setShowVariantModal(true);
    } else if (hasValidVariants && product.variants && product.variants.length === 1) {
      // Single variant - add directly
      addToCart(product, product.variants[0]);
    } else {
      // No variants or no valid variants - use product price
      const price = product.sellingPrice ?? product.price ?? 0;
      if (price > 0) {
        addToCart(product, null);
      } else {
        // Check if product has any variant (even without price)
        if (product.variants && product.variants.length > 0) {
          // Try to use first variant
          addToCart(product, product.variants[0]);
        } else {
          toast.error(`No price available for ${product.name}`);
        }
      }
    }
  };

  const addToCart = (product: IProduct, variant: IVariant | null) => {
    // ✅ Get price with proper null/undefined handling
    let price = 0;
    let variantName = 'Regular';
    
    if (variant) {
      price = variant.price || 0;
      variantName = variant.name || 'Regular';
    } else {
      // Check if product has variants with prices
      if (product.variants && product.variants.length > 0) {
        const firstVariant = product.variants.find(v => v.price > 0);
        if (firstVariant) {
          price = firstVariant.price;
          variantName = firstVariant.name || 'Regular';
        }
      }
      
      // If still no price, use product price
      if (price === 0) {
        price = product.sellingPrice ?? product.price ?? 0;
      }
    }
    
    // If still no price, show error
    if (price === 0) {
      toast.error(`No price available for ${product.name}`);
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.productId === product._id && i.variantName === variantName);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = { 
          ...updated[existingIndex], 
          quantity: updated[existingIndex].quantity + 1, 
          totalPrice: (updated[existingIndex].quantity + 1) * price 
        };
        return updated;
      }
      return [...prev, {
        productId: product._id,
        productName: product.name,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        prepTimeMinutes: product.prepTimeMinutes || 15,
        variantName,
        variantPrice: price
      }];
    });
    toast.success(`Added ${product.name}${variant ? ' (' + variantName + ')' : ''}`);
  };

  const updateQty = (id: string, variantName: string, qty: number) => {
    setCart(prev => {
      const itemIndex = prev.findIndex(i => i.productId === id && i.variantName === variantName);
      if (itemIndex === -1) return prev;
      if (qty <= 0) return prev.filter((_, idx) => idx !== itemIndex);
      const updated = [...prev];
      updated[itemIndex] = { ...updated[itemIndex], quantity: qty, totalPrice: qty * updated[itemIndex].unitPrice };
      return updated;
    });
  };

  const removeItem = (id: string, variantName: string) => {
    setCart(prev => prev.filter(i => !(i.productId === id && i.variantName === variantName)));
  };

  const clearCart = () => {
    setCart([]);
    setNotes('');
    setDiscount(0);
  };

  // ─── Totals ─────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0);
  const tax = subtotal * 0.05;
  const discountAmt = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const total = Math.max(0, subtotal + tax - discountAmt);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ─── Submit Order ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setError('Add at least one item');
      return;
    }

    if (orderType === 'dine-in' && !selectedTable) {
      setError('Please select a table');
      setShowTableModal(true);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const staffDataRaw = localStorage.getItem('staffData');
      const staffData = staffDataRaw ? JSON.parse(staffDataRaw) : null;
      const staffId = staffData?._id || 'system';

      const orderData: any = {
        orderType,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes || '',
          prepTimeMinutes: item.prepTimeMinutes || 15,
          variantName: item.variantName || 'Regular',
        })),
        subtotal,
        tax,
        discount: discountAmt,
        discountType,
        total,
        notes: notes || '',
        orderStatus: 'pending',
        paymentStatus: 'pending',
        createdBy: staffId,
        restaurantId: staffData?.restaurantId || null,
        restaurantName: staffData?.restaurantName || '',
        branchId: staffData?.branchId || null,
        branchName: staffData?.branchName || '',
      };

      if (orderType === 'dine-in' && selectedTable) {
        orderData.tableId = selectedTable.id;
        orderData.tableNumber = selectedTable.number;
      }

      if (orderType === 'takeaway') {
        orderData.customerName = customerName || 'Walk-in';
        orderData.customerPhone = customerPhone || '';
      }

      console.log('📝 Submitting order with details:', orderData);

      const response = await staffApi.post('/staff-portal/orders', orderData);

      if (response.data.success) {
        const createdOrder = response.data.data;
        
        console.log('✅ Order created successfully:', createdOrder);
        
        setLastCreatedOrder(createdOrder);
        setShowOrderSummary(true);

        toast.success(`✅ Order ${createdOrder.orderNumber || ''} sent to kitchen!`, {
          duration: 3000,
          position: 'top-center',
          icon: '🔥',
        });
        
        clearCart();
        setError('');
        setNotes('');
        setDiscount(0);
        
      } else {
        setError(response.data.error || 'Failed to place order');
        toast.error(response.data.error || 'Failed to place order');
      }
    } catch (err: any) {
      console.error('Submit order error:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to place order');
      toast.error(err.response?.data?.error || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewOrder = () => {
    if (lastCreatedOrder?._id) {
      setShowOrderSummary(false);
      navigate(`/staff-portal/orders?orderId=${lastCreatedOrder._id}`);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ─── Top Bar ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/staff-portal/tables')} className="text-gray-400 hover:text-gray-600 p-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold flex items-center gap-2">
              <Table2 size={18} className="text-orange-500" />
              {selectedTable ? `Table ${selectedTable.number}` : 'No Table'}
            </h1>
            <p className="text-[11px] text-gray-400">Staff POS • {products.length} items available</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      {/* ─── Main Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── LEFT: Products ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          {/* Search + Categories */}
          <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-2 bg-white border-b">
            <div className="relative flex-1 min-w-[150px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['Dine In', 'Takeaway'].map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type === 'Dine In' ? 'dine-in' : 'takeaway')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    (type === 'Dine In' && orderType === 'dine-in') || (type === 'Takeaway' && orderType === 'takeaway')
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {type === 'Dine In' ? <Coffee size={12} className="inline mr-1" /> : <ShoppingBag size={12} className="inline mr-1" />}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b scrollbar-none">
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              const { accent } = cat === 'All' ? { accent: '#FF5722' } : getCatColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all ${
                    isActive ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                  style={isActive ? { background: accent, borderColor: accent } : {}}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Utensils size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-medium">No items found</p>
                <p className="text-xs mt-1">Try adjusting your search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filtered.map(product => {
                  const { bg, accent } = getCatColor(product.category);
                  const imgUrl = !imgErrors[product._id] ? getImageUrl(product.image) : null;
                  const priceDisplay = getPriceDisplay(product);
                  const hasVariants = product.hasVariants && product.variants && product.variants.length > 1;

                  return (
                    <div
                      key={product._id}
                      onClick={() => handleProductClick(product)}
                      className="bg-white rounded-2xl transition-all cursor-pointer hover:shadow-lg group border border-gray-100 hover:border-gray-200 overflow-hidden"
                    >
                      {/* Image */}
                      <div className="w-full h-28 flex items-center justify-center overflow-hidden relative" style={{ background: bg }}>
                        {imgUrl ? (
                          <img 
                            src={imgUrl} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            onError={() => setImgErrors(prev => ({ ...prev, [product._id]: true }))} 
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-300">
                            <Package2 size={28} />
                            <span className="text-[8px] mt-1">No Image</span>
                          </div>
                        )}
                        <span className="absolute top-1 left-1 w-3.5 h-3.5 rounded border-2 flex items-center justify-center bg-white" style={{ borderColor: product.isVeg === false ? '#ef4444' : '#22c55e' }}>
                          <span className="w-1.5 h-1.5 rounded-full block" style={{ background: product.isVeg === false ? '#ef4444' : '#22c55e' }} />
                        </span>
                        {hasVariants && (
                          <span className="absolute top-1 right-1 text-[10px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Layers size={8} /> {product.variants?.length}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-800 line-clamp-1">{product.name}</p>
                        <p className="text-[10px] text-gray-400">{product.category}</p>
                        {product.description && (
                          <p className="text-[9px] text-gray-400 line-clamp-1 mt-0.5">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold" style={{ color: accent }}>{priceDisplay}</span>
                          <button 
                            className="h-6 px-2.5 rounded-full flex items-center justify-center text-white text-[10px] font-bold gap-0.5" 
                            style={{ background: accent }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductClick(product);
                            }}
                          >
                            <Plus size={10} /> ADD
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Cart ──────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col bg-white border-l border-gray-100 overflow-hidden">

          {/* Table/Customer Info */}
          <div className="shrink-0 px-3 py-2 border-b border-gray-100 bg-gray-50">
            {orderType === 'dine-in' ? (
              <button
                onClick={() => setShowTableModal(true)}
                className="w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all border-2 border-dashed border-gray-300 hover:border-orange-400"
              >
                <span className="flex items-center gap-2">
                  <Table2 size={14} />
                  {selectedTable ? `Table ${selectedTable.number}` : 'Select Table'}
                </span>
                <ChevronDown size={14} />
              </button>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
              </div>
            )}
          </div>

          {/* Cart Header */}
          <div className="shrink-0 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShoppingCart size={14} className="text-orange-500" />
              <span className="text-xs font-bold text-gray-700">Cart</span>
              {cartCount > 0 && (
                <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount} items
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-[10px] text-gray-400 hover:text-red-500 font-medium">
                Clear
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2 py-8">
                <ShoppingCart size={32} strokeWidth={1.5} />
                <p className="text-xs font-medium text-gray-400">Cart is empty</p>
                <p className="text-[10px] text-gray-300">Tap items to add</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cart.map((item, idx) => (
                  <div key={`${item.productId}-${item.variantName}-${idx}`} className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate">{item.productName}</p>
                      {item.variantName && item.variantName !== 'Regular' && (
                        <span className="text-[9px] text-purple-500 font-medium">{item.variantName}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 bg-orange-50 border border-orange-200 rounded-lg px-0.5 py-0.5">
                      <button
                        onClick={() => updateQty(item.productId, item.variantName || 'Regular', item.quantity - 1)}
                        className="w-5 h-5 flex items-center justify-center text-orange-600 hover:text-red-500 font-bold"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-[11px] font-bold text-orange-700 w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.variantName || 'Regular', item.quantity + 1)}
                        className="w-5 h-5 flex items-center justify-center text-orange-600 hover:text-orange-700 font-bold"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    <div className="text-right shrink-0 w-14">
                      <p className="text-[11px] font-bold text-gray-800">₹{item.totalPrice}</p>
                    </div>

                    <button
                      onClick={() => removeItem(item.productId, item.variantName || 'Regular')}
                      className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="shrink-0 border-t border-gray-100 bg-white p-3 space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold">₹{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">GST (5%)</span>
                <span className="font-semibold">₹{fmt(tax)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Tag size={10} className="text-green-500" />
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={e => setDiscount(Number(e.target.value))}
                  placeholder="Discount"
                  className="w-12 px-1 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="px-1 py-0.5 text-[10px] border rounded focus:outline-none"
                >
                  <option value="fixed">₹</option>
                  <option value="percentage">%</option>
                </select>
                {discountAmt > 0 && (
                  <span className="text-[10px] text-green-600 font-semibold ml-auto">−₹{fmt(discountAmt)}</span>
                )}
              </div>
              <textarea
                rows={1}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes..."
                className="w-full px-2 py-1 text-[10px] border rounded resize-none focus:outline-none focus:ring-1 focus:ring-orange-300 placeholder:text-gray-300"
              />
              <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-200">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className={`text-lg font-black ${cart.length ? 'text-orange-500' : 'text-gray-300'}`}>
                  ₹{fmt(total)}
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5">
                <AlertCircle size={12} /> {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-200/60 transition-all active:scale-[0.98]"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {submitting ? 'Sending...' : 'Send to Kitchen'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}

      {/* Table Selection Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTableModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b sticky top-0 bg-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Select Table</h3>
              <button onClick={() => setShowTableModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {tables.map(table => {
                const isOccupied = table.status === 'occupied';
                return (
                  <button
                    key={table._id}
                    onClick={() => {
                      if (!isOccupied) {
                        setSelectedTable({ id: table._id, number: table.number });
                        setShowTableModal(false);
                      } else {
                        toast.error('Table is occupied');
                      }
                    }}
                    disabled={isOccupied}
                    className={`p-4 border-2 rounded-xl text-center transition-all hover:border-orange-400 hover:bg-orange-50 ${
                      selectedTable?.id === table._id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                    } ${isOccupied ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Table2 size={22} className={`mx-auto mb-1.5 ${isOccupied ? 'text-red-400' : 'text-gray-400'}`} />
                    <p className="font-bold text-base">Table {table.number}</p>
                    <p className="text-xs text-gray-400">{table.name}</p>
                    <p className={`text-xs mt-1 font-medium ${isOccupied ? 'text-red-500' : 'text-green-500'}`}>
                      {isOccupied ? 'Occupied' : 'Available'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <VariantSelectionModal
          product={selectedProduct}
          onSelect={(variant) => {
            addToCart(selectedProduct, variant);
            setShowVariantModal(false);
            setSelectedProduct(null);
          }}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Order Summary Modal */}
      {showOrderSummary && lastCreatedOrder && (
        <OrderSummaryModal
          order={lastCreatedOrder}
          onClose={() => {
            setShowOrderSummary(false);
            setLastCreatedOrder(null);
          }}
          onViewOrder={handleViewOrder}
        />
      )}
    </div>
  );
}