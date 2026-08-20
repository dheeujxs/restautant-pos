// pages/MenuDisplay.tsx - Fixed JSX syntax
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, Coffee, Utensils, Pizza, Salad, 
  Beef, Fish, Cake, Wine, Coffee as CoffeeIcon,
  Star, Clock, Flame, Leaf, Heart, Share2,
  ChevronLeft, ChevronRight, ShoppingBag,
  Plus, Minus, CheckCircle, X, AlertCircle,
  Info, MapPin, Phone, Mail, Globe, Instagram,
  Facebook, Twitter, Youtube, Award, Crown,
  Sparkles, Zap, TrendingUp, Users, Calendar
} from 'lucide-react';
import { adminApi } from '../services/api';
import toast from 'react-hot-toast';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  dietaryType?: 'Veg' | 'Non-veg' | 'Vegan' | 'Jain';
  spiceLevel?: 'Mild' | 'Medium' | 'Hot' | 'Very Hot';
  isPopular?: boolean;
  isNew?: boolean;
  isRecommended?: boolean;
  preparationTime?: number;
  calories?: number;
  variants?: Array<{
    name: string;
    price: number;
    size?: string;
  }>;
  tags?: string[];
}

interface Category {
  _id: string;
  name: string;
  icon?: string;
  description?: string;
}

// ─── Menu Item Card ──────────────────────────────────────────

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: () => void;
  onViewDetails: () => void;
  dietaryBadge: { color: string; label: string } | null;
  spiceLevel: { icon: React.ReactNode; label: string } | null;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ 
  item, 
  onAddToCart, 
  onViewDetails,
  dietaryBadge,
  spiceLevel 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
            🍽️
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {item.isPopular && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5">
              <Heart size={10} /> Popular
            </span>
          )}
          {item.isNew && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5">
              <Sparkles size={10} /> New
            </span>
          )}
          {item.isRecommended && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center gap-0.5">
              <Star size={10} /> Recommended
            </span>
          )}
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow">
          <span className="text-lg font-bold text-orange-500">₹{item.price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-800 group-hover:text-orange-500 transition">
            {item.name}
          </h3>
          {dietaryBadge && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${dietaryBadge.color}`}>
              {dietaryBadge.label}
            </span>
          )}
        </div>
        
        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {spiceLevel && (
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              {spiceLevel.icon} {spiceLevel.label}
            </span>
          )}
          {item.preparationTime && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Clock size={12} /> {item.preparationTime}min
            </span>
          )}
          {item.calories && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Flame size={12} /> {item.calories}kcal
            </span>
          )}
          {item.variants && item.variants.length > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <CoffeeIcon size={12} /> {item.variants.length} sizes
            </span>
          )}
        </div>

        <button
          onClick={onAddToCart}
          className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-semibold hover:shadow-md transition flex items-center justify-center gap-2 group-hover:scale-[1.02]"
        >
          <Plus size={16} /> Add to Cart
        </button>
      </div>
    </div>
  );
};

// ─── Menu Item List View ──────────────────────────────────────

const MenuItemListItem: React.FC<MenuItemCardProps> = ({ 
  item, 
  onAddToCart, 
  onViewDetails,
  dietaryBadge,
  spiceLevel 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition p-4">
      <div className="flex items-center gap-4">
        <div 
          className="w-24 h-24 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-4xl shrink-0 cursor-pointer"
          onClick={onViewDetails}
        >
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
          ) : '🍽️'}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-gray-800 cursor-pointer hover:text-orange-500" onClick={onViewDetails}>
              {item.name}
            </h3>
            {dietaryBadge && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${dietaryBadge.color}`}>
                {dietaryBadge.label}
              </span>
            )}
          </div>
          
          {item.description && (
            <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {spiceLevel && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                {spiceLevel.icon} {spiceLevel.label}
              </span>
            )}
            {item.preparationTime && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <Clock size={12} /> {item.preparationTime}min
              </span>
            )}
            {item.calories && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <Flame size={12} /> {item.calories}kcal
              </span>
            )}
            {item.isPopular && (
              <span className="text-xs text-red-500 flex items-center gap-0.5">
                <Heart size={12} /> Popular
              </span>
            )}
            {item.isNew && (
              <span className="text-xs text-blue-500 flex items-center gap-0.5">
                <Sparkles size={12} /> New
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-bold text-orange-500">₹{item.price}</div>
          <button
            onClick={onAddToCart}
            className="mt-2 px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-1"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Cart Sidebar ──────────────────────────────────────────────

const CartSidebar: React.FC<{
  cart: Array<{item: MenuItem, quantity: number, variant?: string}>;
  onClose: () => void;
  onRemove: (itemId: string, variant?: string) => void;
  onUpdateQuantity: (itemId: string, variant?: string) => void;
  total: number;
  onCheckout: () => void;
}> = ({ cart, onClose, onRemove, onUpdateQuantity, total, onCheckout }) => {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-orange-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={20} /> Your Order
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500">Your cart is empty</p>
              <p className="text-sm text-gray-400">Start adding delicious items!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(({ item, quantity, variant }) => {
                const price = variant 
                  ? item.variants?.find(v => v.name === variant)?.price || item.price
                  : item.price;
                return (
                  <div key={`${item._id}-${variant}`} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-2xl shrink-0">
                      🍽️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {variant && <p className="text-xs text-gray-400">{variant}</p>}
                      <p className="text-sm font-bold text-orange-500">₹{price} × {quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onRemove(item._id, variant)}
                        className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center font-semibold">{quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item._id, variant)}
                        className="w-6 h-6 rounded-full bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">₹{total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax (5%)</span>
              <span className="font-medium">₹{(total * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span className="text-orange-500">₹{(total * 1.05).toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition hover:shadow-lg"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Item Detail Modal ────────────────────────────────────────

const ItemDetailModal: React.FC<{
  item: MenuItem;
  onClose: () => void;
  onAddToCart: () => void;
  dietaryBadge: { color: string; label: string } | null;
  spiceLevel: { icon: React.ReactNode; label: string } | null;
}> = ({ item, onClose, onAddToCart, dietaryBadge, spiceLevel }) => {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    item.variants && item.variants.length > 0 ? item.variants[0].name : null
  );

  const getPrice = () => {
    if (selectedVariant && item.variants) {
      const variant = item.variants.find(v => v.name === selectedVariant);
      return variant?.price || item.price;
    }
    return item.price;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] max-h-[90vh] bg-white rounded-2xl z-50 overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white/80 rounded-full p-1">
          <X size={20} />
        </button>

        {/* Image */}
        <div className="h-64 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-8xl">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : '🍽️'}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{item.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {dietaryBadge && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${dietaryBadge.color}`}>
                    {dietaryBadge.label}
                  </span>
                )}
                {item.isPopular && (
                  <span className="text-xs text-red-500 flex items-center gap-0.5">
                    <Heart size={12} /> Popular
                  </span>
                )}
                {item.isRecommended && (
                  <span className="text-xs text-amber-500 flex items-center gap-0.5">
                    <Star size={12} /> Recommended
                  </span>
                )}
              </div>
            </div>
            <div className="text-2xl font-bold text-orange-500">₹{getPrice()}</div>
          </div>

          {item.description && (
            <p className="text-gray-600 mt-3 leading-relaxed">{item.description}</p>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {spiceLevel && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm">{spiceLevel.icon}</div>
                <p className="text-xs text-gray-500">Spice Level</p>
                <p className="text-sm font-medium">{spiceLevel.label}</p>
              </div>
            )}
            {item.preparationTime && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Clock size={18} className="mx-auto text-gray-400" />
                <p className="text-xs text-gray-500">Prep Time</p>
                <p className="text-sm font-medium">{item.preparationTime} min</p>
              </div>
            )}
            {item.calories && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Flame size={18} className="mx-auto text-gray-400" />
                <p className="text-xs text-gray-500">Calories</p>
                <p className="text-sm font-medium">{item.calories} kcal</p>
              </div>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Info size={18} className="mx-auto text-gray-400" />
                <p className="text-xs text-gray-500">Tags</p>
                <p className="text-sm font-medium">{item.tags.join(', ')}</p>
              </div>
            )}
          </div>

          {/* ✅ Fixed: Variants Section */}
          {item.variants && item.variants.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Select Size:</p>
              <div className="flex gap-2 flex-wrap">
                {item.variants.map((variant) => (
                  <button
                    key={variant.name}
                    onClick={() => setSelectedVariant(variant.name)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                      selectedVariant === variant.name
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 text-gray-600 hover:border-orange-300'
                    }`}
                  >
                    {variant.name} • ₹{variant.price}
                    {variant.size && <span className="text-xs text-gray-400 ml-1">({variant.size})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onAddToCart}
            className="w-full mt-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Add to Cart • ₹{getPrice()}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Main MenuDisplay Component ──────────────────────────────────────────

const MenuDisplay: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<Array<{item: MenuItem, quantity: number, variant?: string}>>([]);
  const [showCart, setShowCart] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dietaryFilter, setDietaryFilter] = useState<string>('All');

  // Restaurant Info (mock - would come from API)
  const restaurantInfo = {
    name: 'The Grand Kitchen',
    cuisine: 'Multi-Cuisine',
    address: '123 Main Street, City',
    phone: '+91 98765 43210',
    email: 'info@thegrandkitchen.com',
    timings: '10:00 AM - 11:00 PM',
    rating: 4.5,
    totalReviews: 128,
    isOpen: true,
  };

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const [itemsRes, categoriesRes] = await Promise.all([
        adminApi.get('/dishes?limit=200'),
        adminApi.get('/categories')
      ]);

      // Handle dishes response
      if (itemsRes.data.success) {
        const menuItems = itemsRes.data.data?.dishes || itemsRes.data.dishes || [];
        setItems(menuItems.map((item: any) => ({
          ...item,
          isPopular: Math.random() > 0.7,
          isNew: Math.random() > 0.85,
          isRecommended: Math.random() > 0.8,
          preparationTime: Math.floor(Math.random() * 20) + 5,
          calories: Math.floor(Math.random() * 500) + 100,
        })));
      }

      // Handle categories response properly
      if (categoriesRes.data.success) {
        const categoriesData = categoriesRes.data.data || categoriesRes.data.categories || [];
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData);
        } else {
          console.warn('Categories is not an array:', categoriesData);
          setCategories([]);
        }
      } else {
        // If categories API fails, extract categories from dishes
        const menuItems = itemsRes.data.data?.dishes || itemsRes.data.dishes || [];
        const uniqueCategories = ['All', ...new Set(menuItems.map((item: any) => item.categoryName || item.category || 'Other'))];
        setCategories(uniqueCategories.map(name => ({ _id: name, name })));
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      toast.error('Failed to load menu');
      
      // Fallback: Extract categories from items if available
      if (items.length > 0) {
        const uniqueCategories = ['All', ...new Set(items.map(item => item.category || 'Other'))];
        setCategories(uniqueCategories.map(name => ({ _id: name, name })));
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDietary = dietaryFilter === 'All' || item.dietaryType === dietaryFilter;
    return matchCategory && matchSearch && matchDietary;
  });

  const addToCart = (item: MenuItem, variant?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.item._id === item._id && i.variant === variant);
      if (existing) {
        return prev.map(i => 
          i.item._id === item._id && i.variant === variant 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { item, quantity: 1, variant }];
    });
    toast.success(`Added ${item.name} to cart`);
  };

  const removeFromCart = (itemId: string, variant?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.item._id === itemId && i.variant === variant);
      if (existing && existing.quantity > 1) {
        return prev.map(i => 
          i.item._id === itemId && i.variant === variant 
            ? { ...i, quantity: i.quantity - 1 } 
            : i
        );
      }
      return prev.filter(i => !(i.item._id === itemId && i.variant === variant));
    });
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.variant 
        ? item.item.variants?.find(v => v.name === item.variant)?.price || item.item.price
        : item.item.price;
      return sum + (price * item.quantity);
    }, 0);
  };

  const getDietaryBadge = (type?: string) => {
    switch(type) {
      case 'Veg': return { color: 'text-green-600 bg-green-50', label: '🌱 Veg' };
      case 'Non-veg': return { color: 'text-red-600 bg-red-50', label: '🍖 Non-Veg' };
      case 'Vegan': return { color: 'text-emerald-600 bg-emerald-50', label: '🌿 Vegan' };
      case 'Jain': return { color: 'text-amber-600 bg-amber-50', label: '🪷 Jain' };
      default: return null;
    }
  };

  const getSpiceLevel = (level?: string) => {
    switch(level) {
      case 'Mild': return { icon: <span className="text-green-500">🌶️</span>, label: 'Mild' };
      case 'Medium': return { icon: <span className="text-orange-500">🌶️🌶️</span>, label: 'Medium' };
      case 'Hot': return { icon: <span className="text-red-500">🌶️🌶️🌶️</span>, label: 'Hot' };
      case 'Very Hot': return { icon: <span className="text-red-600">🌶️🌶️🌶️🌶️</span>, label: 'Very Hot' };
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading delicious menu...</p>
        </div>
      </div>
    );
  }

  // ✅ Safe categories array for rendering
  const safeCategories = Array.isArray(categories) ? categories : [];
  const categoryNames = ['All', ...safeCategories.map(c => c.name)];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Restaurant Info */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
                GK
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{restaurantInfo.name}</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-yellow-500">
                    ⭐ {restaurantInfo.rating}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{restaurantInfo.totalReviews} reviews</span>
                  <span className="text-gray-400">•</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    restaurantInfo.isOpen 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {restaurantInfo.isOpen ? '● Open' : '● Closed'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 text-gray-400 hover:text-gray-600 transition"
              >
                {viewMode === 'grid' ? '☰' : '⊞'}
              </button>
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-600 hover:text-orange-500 transition"
              >
                <ShoppingBag size={22} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="border-t border-gray-100 px-4 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            
            {/* ✅ Safe category rendering */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {categoryNames.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            >
              <option value="All">All Diets</option>
              <option value="Veg">🌱 Vegetarian</option>
              <option value="Vegan">🌿 Vegan</option>
              <option value="Jain">🪷 Jain</option>
              <option value="Non-veg">🍖 Non-Veg</option>
            </select>
          </div>
        </div>
      </header>

      {/* Menu Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-600">No items found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item._id}
                item={item}
                onAddToCart={() => addToCart(item)}
                onViewDetails={() => setSelectedItem(item)}
                dietaryBadge={getDietaryBadge(item.dietaryType)}
                spiceLevel={getSpiceLevel(item.spiceLevel)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <MenuItemListItem
                key={item._id}
                item={item}
                onAddToCart={() => addToCart(item)}
                onViewDetails={() => setSelectedItem(item)}
                dietaryBadge={getDietaryBadge(item.dietaryType)}
                spiceLevel={getSpiceLevel(item.spiceLevel)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <CartSidebar
          cart={cart}
          onClose={() => setShowCart(false)}
          onRemove={removeFromCart}
          onUpdateQuantity={removeFromCart}
          total={getTotal()}
          onCheckout={() => {
            toast.success('Order placed! 🎉');
            setCart([]);
            setShowCart(false);
          }}
        />
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={() => {
            addToCart(selectedItem);
            setSelectedItem(null);
          }}
          dietaryBadge={getDietaryBadge(selectedItem.dietaryType)}
          spiceLevel={getSpiceLevel(selectedItem.spiceLevel)}
        />
      )}
    </div>
  );
};

export default MenuDisplay;