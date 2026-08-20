// pages/staff-portal/PunchInPrepPage.tsx - COMPLETE FIXED VERSION with Live Timer

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { staffApi } from '../../services/api';
import { staffStorage } from '../../utils/storage';
import {
  ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
  Loader2, ChefHat, Fingerprint, Package, TrendingUp,
  Users, Coffee, ShoppingBag, Truck, Crown, AlertTriangle,
  ThumbsUp, ClipboardCheck, ListChecks, UtensilsCrossed,
  PlusCircle, Calendar, Timer, Play, Pause, RotateCcw,
  SkipForward, Check, X, Zap, Flame, Trophy, Printer,
  Eye, Edit, Trash2, Copy, Save, Send, FileText,
  RotateCw
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────
interface Ingredient {
  ingredientId?: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPrice?: number;
}

interface Recipe {
  _id: string;
  productId: string;
  productName: string;
  ingredients: Ingredient[];
  prepTimeMinutes: number;
  instructions?: string;
  totalCost: number;
}

interface KOTItem {
  _id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
  status: 'pending' | 'cooking' | 'done' | 'voided';
  prepTimeMinutes: number;
  cookingStartedAt?: string;
  doneAt?: string;
}

interface KOT {
  _id: string;
  kotNumber: string;
  orderId: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  waiterName?: string;
  covers?: number;
  items: KOTItem[];
  status: 'new' | 'acknowledged' | 'preparing' | 'partially_ready' | 'ready' | 'served' | 'cancelled';
  isVip: boolean;
  notes?: string;
  createdAt: string;
  elapsedMinutes: number;
  kotStation?: string;
  prepStartedAt?: string;
  readyRequested?: boolean;
}

interface StockCheckResult {
  itemId: string;
  productId: string;
  productName: string;
  available: boolean;
  insufficientIngredients: Array<{
    name: string;
    required: number;
    available: number;
    unit: string;
  }>;
  recipe?: Recipe;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  'dine-in': { label: 'Dine In', Icon: Coffee, color: '#f97316' },
  'takeaway': { label: 'Takeaway', Icon: ShoppingBag, color: '#8b5cf6' },
  'delivery': { label: 'Delivery', Icon: Truck, color: '#06b6d4' },
};

const UNIT_OPTIONS = ['kg', 'g', 'lb', 'oz', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece', 'dozen'];

const formatTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatCurrency = (price: number) => `₹${price.toFixed(2)}`;

export default function PunchInPrepPage() {
  const navigate = useNavigate();
  const { kotId } = useParams<{ kotId: string }>();
  
  // ─── State ─────────────────────────────────────────────────────────────
  const [kot, setKot] = useState<KOT | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkResults, setCheckResults] = useState<StockCheckResult[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [overallReady, setOverallReady] = useState(false);
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const [showCompleteAll, setShowCompleteAll] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KOTItem | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);

  // ─── Live Timer ────────────────────────────────────────────────────────
  const [now, setNow] = useState(Date.now());

  // Update timer every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ─── Recipe Creation Modal State ─────────────────────────────────────
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<{ productId: string; productName: string } | null>(null);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [recipeForm, setRecipeForm] = useState<{
    ingredients: {
      ingredientId?: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      costPrice: number;
    }[];
    prepTimeMinutes: number;
    instructions: string;
  }>({
    ingredients: [{ ingredientId: '', ingredientName: '', quantity: 0, unit: 'g', costPrice: 0 }],
    prepTimeMinutes: 15,
    instructions: '',
  });
  const [creatingRecipe, setCreatingRecipe] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Check if staff is authenticated ──────────────────────────────────
  useEffect(() => {
    const staffToken = staffStorage.getToken();
    if (!staffToken) {
      toast.error('Please login as staff');
      navigate('/staff-portal/login');
      return;
    }
    
    console.log('🔑 Staff token present:', !!staffToken);
    console.log('📋 Kot ID from params:', kotId);
  }, [navigate, kotId]);

  // ─── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (kotId) {
      fetchKOTDetails();
    } else {
      toast.error('Invalid KOT ID');
      navigate('/staff-portal/kot');
    }
  }, [kotId]);

  useEffect(() => {
    if (showRecipeModal) {
      fetchAllIngredients();
    }
  }, [showRecipeModal]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Fetch all ingredients ────────────────────────────────────────────
  const fetchAllIngredients = async () => {
    setLoadingIngredients(true);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const res = await staffApi.get('/ingredients', {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      if (res.data.success && res.data.data?.ingredients) {
        setAllIngredients(res.data.data.ingredients);
      } else {
        setAllIngredients([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch ingredients:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error('Could not load ingredient list');
    } finally {
      setLoadingIngredients(false);
    }
  };

  // ─── Fetch KOT and verify ────────────────────────────────────────────
  const fetchKOTDetails = async () => {
    setLoading(true);
    try {
      console.log('📤 Fetching order details for ID:', kotId);
      console.log('🔗 API URL:', `/staff-portal/orders/${kotId}`);
      
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login as staff');
        navigate('/staff-portal/login');
        return;
      }
      
      const res = await staffApi.get(`/staff-portal/orders/${kotId}`, {
        headers: {
          Authorization: `Bearer ${staffToken}`
        }
      });
      
      console.log('📥 Order details response:', res.data);
      
      let orderData = null;
      if (res.data?.success && res.data?.data) {
        orderData = res.data.data;
      }
      
      if (!orderData) {
        toast.error('Order not found');
        navigate('/staff-portal/kot');
        return;
      }
      
      console.log('✅ Order data found:', orderData);
      
      const kotData: KOT = {
        _id: orderData._id,
        kotNumber: `KOT-${orderData.orderNumber}`,
        orderId: orderData._id,
        orderNumber: orderData.orderNumber,
        orderType: orderData.orderType || 'dine-in',
        tableNumber: orderData.tableNumber || '',
        waiterName: orderData.waiterName || '',
        covers: orderData.covers || 0,
        items: (orderData.items || []).map((item: any) => ({
          _id: item._id || item.productId || `item-${Math.random()}`,
          productId: item.productId,
          productName: item.productName || item.name || 'Item',
          quantity: item.quantity || 1,
          notes: item.notes || '',
          status: item.status || 'pending',
          prepTimeMinutes: item.prepTime || 15,
          cookingStartedAt: item.cookingStartedAt,
          doneAt: item.doneAt,
        })),
        status: orderData.orderStatus === 'pending' ? 'new' : 
                orderData.orderStatus === 'confirmed' ? 'acknowledged' :
                orderData.orderStatus === 'preparing' ? 'preparing' :
                orderData.orderStatus === 'ready' ? 'ready' :
                orderData.orderStatus === 'completed' ? 'served' : 'new',
        isVip: orderData.isVip || false,
        notes: orderData.notes || '',
        createdAt: orderData.createdAt,
        elapsedMinutes: Math.floor((Date.now() - new Date(orderData.createdAt).getTime()) / 60000),
        kotStation: orderData.kotStation || 'Main Kitchen',
        readyRequested: orderData.readyRequested || false,
        prepStartedAt: orderData.prepStartedAt,
      };
      
      console.log('✅ Converted KOT data:', kotData);
      
      setKot(kotData);
      setCompletedItems(new Set());
      await verifyAllItems(kotData.items);
      
    } catch (error: any) {
      console.error('❌ Failed to load KOT:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      
      if (error.response?.status === 404) {
        toast.error('Order not found. Please check the KOT ID.');
        navigate('/staff-portal/kot');
        return;
      }
      
      if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
        return;
      }
      
      const errorMsg = error.response?.data?.error || 'Failed to load KOT';
      toast.error(errorMsg);
      navigate('/staff-portal/kot');
    } finally {
      setLoading(false);
    }
  };

  // ─── Verify each item ─────────────────────────────────────────────────
  const verifyAllItems = async (items: KOTItem[]) => {
    setVerifying(true);
    const results: StockCheckResult[] = [];

    for (const item of items) {
      const result: StockCheckResult = {
        itemId: item._id,
        productId: item.productId,
        productName: item.productName,
        available: false,
        insufficientIngredients: [],
      };

      try {
        const staffToken = staffStorage.getToken();
        if (!staffToken) {
          toast.error('Please login again');
          navigate('/staff-portal/login');
          return;
        }
        
        const recipeRes = await staffApi.get(`/recipes/product/${item.productId}`, {
          headers: { Authorization: `Bearer ${staffToken}` }
        });
        if (recipeRes.data.success && recipeRes.data.data) {
          const recipe: Recipe = recipeRes.data.data;
          result.recipe = recipe;

          const stockRes = await staffApi.post(`/dishes/${item.productId}/validate-stock`, {
            quantity: item.quantity
          }, {
            headers: { Authorization: `Bearer ${staffToken}` }
          });
          const insufficient = stockRes.data?.insufficientIngredients || [];
          result.insufficientIngredients = insufficient;
          result.available = insufficient.length === 0;
        } else {
          result.error = 'Recipe not found';
          result.available = false;
        }
      } catch (error: any) {
        console.error(`Error verifying item ${item.productName}:`, error);
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          staffStorage.clear();
          navigate('/staff-portal/login');
          return;
        }
        result.error = error.response?.data?.error || 'Failed to verify';
        result.available = false;
      }

      results.push(result);
    }

    setCheckResults(results);
    setVerifying(false);
    const allAvailable = results.every(r => r.available === true);
    setOverallReady(allAvailable);
  };

  // ─── Open Recipe Creation Modal ──────────────────────────────────────
  const openRecipeModal = (productId: string, productName: string) => {
    setCurrentProduct({ productId, productName });
    setRecipeForm({
      ingredients: [{ ingredientId: '', ingredientName: '', quantity: 0, unit: 'g', costPrice: 0 }],
      prepTimeMinutes: 15,
      instructions: '',
    });
    setSearchTerm('');
    setShowDropdown(null);
    setShowRecipeModal(true);
  };

  // ─── Handle Ingredient Selection ─────────────────────────────────────
  const selectIngredient = (index: number, ingredient: any) => {
    const updated = [...recipeForm.ingredients];
    updated[index] = {
      ingredientId: ingredient._id,
      ingredientName: ingredient.name,
      quantity: updated[index].quantity || 0,
      unit: ingredient.unit || 'g',
      costPrice: ingredient.costPrice || 0,
    };
    setRecipeForm({ ...recipeForm, ingredients: updated });
    setShowDropdown(null);
    setSearchTerm('');
  };

  // ─── Handle Recipe Form Changes ──────────────────────────────────────
  const handleIngredientChange = (index: number, field: string, value: any) => {
    const updated = [...recipeForm.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeForm({ ...recipeForm, ingredients: updated });
  };

  const addIngredientRow = () => {
    setRecipeForm({
      ...recipeForm,
      ingredients: [...recipeForm.ingredients, { ingredientId: '', ingredientName: '', quantity: 0, unit: 'g', costPrice: 0 }]
    });
  };

  const removeIngredientRow = (index: number) => {
    if (recipeForm.ingredients.length <= 1) return;
    const updated = recipeForm.ingredients.filter((_, i) => i !== index);
    setRecipeForm({ ...recipeForm, ingredients: updated });
  };

  // ─── Submit Recipe Creation ──────────────────────────────────────────
  const createRecipe = async () => {
    if (!currentProduct) return;
    const invalid = recipeForm.ingredients.some(ing => !ing.ingredientName.trim() || ing.quantity <= 0);
    if (invalid) {
      toast.error('Please fill all ingredient names and quantities');
      return;
    }

    setCreatingRecipe(true);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const payload = {
        productId: currentProduct.productId,
        productName: currentProduct.productName,
        ingredients: recipeForm.ingredients.map(ing => ({
          ingredientId: ing.ingredientId || undefined,
          ingredientName: ing.ingredientName.trim(),
          quantity: ing.quantity,
          unit: ing.unit,
          costPrice: ing.costPrice || 0,
        })),
        prepTimeMinutes: recipeForm.prepTimeMinutes,
        instructions: recipeForm.instructions.trim() || undefined,
      };

      const res = await staffApi.post('/recipes', payload, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });

      if (res.data.success) {
        toast.success(`✅ Recipe created for ${currentProduct.productName}`);
        setShowRecipeModal(false);
        if (kot) await verifyAllItems(kot.items);
      } else {
        toast.error(res.data.error || 'Failed to create recipe');
      }
    } catch (error: any) {
      console.error('Create recipe error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to create recipe');
    } finally {
      setCreatingRecipe(false);
    }
  };

  // ─── Helper to calculate time difference ─────────────────────────────
  const getTimeDifference = (startTime: string, endTime?: Date) => {
    if (!startTime) return 'Not started';
    const start = new Date(startTime);
    const end = endTime || new Date();
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  // ─── Start Cooking (Punch In) ────────────────────────────────────────
  const handleStartCooking = async () => {
    if (!kot) return;
    setContinuing(true);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login as staff');
        navigate('/staff-portal/login');
        return;
      }
      
      const res = await staffApi.put(
        `/staff-portal/orders/${kot.orderId}/status`,
        { orderStatus: 'preparing' },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      
      if (res.data.success) {
        toast.success('✅ Cooking started! Timer is running.');
        await fetchKOTDetails();
      } else {
        toast.error(res.data.error || 'Failed to start cooking');
      }
    } catch (error: any) {
      console.error('Start cooking error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to start cooking');
    } finally {
      setContinuing(false);
    }
  };

  // ─── Start Single Item ───────────────────────────────────────────────
  const handleStartItem = async (itemId: string) => {
    if (!kot) return;
    setProcessingItem(itemId);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const res = await staffApi.put(
        `/staff-portal/orders/${kot.orderId}/status`,
        { 
          orderStatus: 'preparing',
          action: 'start_item',
          itemId: itemId
        },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      
      if (res.data.success) {
        toast.success('✅ Item started cooking!');
        await fetchKOTDetails();
      }
    } catch (error: any) {
      console.error('Start item error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to start item');
    } finally {
      setProcessingItem(null);
    }
  };

  // ─── Complete Single Item ────────────────────────────────────────────
  const handleCompleteItem = async (itemId: string) => {
    if (!kot) return;
    setProcessingItem(itemId);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const res = await staffApi.put(
        `/staff-portal/orders/${kot.orderId}/status`,
        { 
          orderStatus: 'preparing',
          action: 'complete_item',
          itemId: itemId
        },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      
      if (res.data.success) {
        toast.success('✅ Item completed!');
        setCompletedItems(prev => new Set(prev).add(itemId));
        await fetchKOTDetails();
      }
    } catch (error: any) {
      console.error('Complete item error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to complete item');
    } finally {
      setProcessingItem(null);
    }
  };

  // ─── Complete All Items ──────────────────────────────────────────────
  const handleCompleteAll = async () => {
    if (!kot) return;
    setShowCompleteAll(true);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      await staffApi.put(`/staff-portal/orders/${kot.orderId}/status`, {
        orderStatus: 'ready',
        action: 'complete_all'
      }, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      
      toast.success('✅ All items completed! KOT is ready to serve.');
      await fetchKOTDetails();
      
      setTimeout(() => {
        navigate('/staff-portal/kot');
      }, 2000);
    } catch (error: any) {
      console.error('Complete all error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to complete all items');
    } finally {
      setShowCompleteAll(false);
    }
  };

  // ─── Mark KOT as Ready ───────────────────────────────────────────────
  const handleMarkReady = async () => {
    if (!kot) return;
    setContinuing(true);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const res = await staffApi.put(`/staff-portal/orders/${kot.orderId}/status`, {
        orderStatus: 'ready'
      }, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      
      if (res.data.success) {
        toast.success('✅ KOT marked as ready!');
        await fetchKOTDetails();
        setTimeout(() => {
          navigate('/staff-portal/kot');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Mark ready error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to mark ready');
    } finally {
      setContinuing(false);
    }
  };

  // ─── Print KOT ────────────────────────────────────────────────────────
  const handlePrintKOT = () => {
    if (!kot) return;
    const win = window.open('', '_blank');
    if (!win) return;
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOT - ${kot.kotNumber}</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #fff; }
          .container { max-width: 300px; margin: 0 auto; border: 2px dashed #333; padding: 15px; }
          .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 10px; }
          .vip { color: #b45309; font-weight: bold; }
          .item { margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .qty { background: #f97316; color: #fff; padding: 2px 6px; border-radius: 4px; margin-right: 8px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #333; font-size: 10px; }
          .allergy { color: #dc2626; font-size: 11px; }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
          .status-ready { background: #dcfce7; color: #166534; }
          .status-cooking { background: #fef3c7; color: #92400e; }
          .status-pending { background: #fef9c3; color: #854d0e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 18px; font-weight: bold; color: #f97316;">🍳 KITCHEN ORDER TICKET</div>
            <div><strong>${kot.kotNumber}</strong></div>
            <div>Order: ${kot.orderNumber}</div>
            ${kot.isVip ? '<div class="vip">⭐ VIP ORDER ⭐</div>' : ''}
            <div style="margin-top: 5px;">
              <span class="status-badge ${kot.status === 'ready' ? 'status-ready' : kot.status === 'preparing' ? 'status-cooking' : 'status-pending'}">
                ${kot.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div><strong>Type:</strong> ${kot.orderType.toUpperCase()}</div>
          ${kot.tableNumber ? `<div><strong>Table:</strong> ${kot.tableNumber}</div>` : ''}
          ${kot.waiterName ? `<div><strong>Waiter:</strong> ${kot.waiterName}</div>` : ''}
          ${kot.covers ? `<div><strong>Covers:</strong> ${kot.covers}</div>` : ''}
          ${kot.kotStation ? `<div><strong>Station:</strong> ${kot.kotStation}</div>` : ''}
          <div style="margin: 12px 0"><strong>ITEMS:</strong></div>
          ${kot.items.map(item => `
            <div class="item">
              <span class="qty">${item.quantity}×</span> ${item.productName}
              ${item.notes ? `<br/><small>📝 ${item.notes}</small>` : ''}
              <br/><small style="color: #666;">Status: ${item.status}</small>
              ${item.status === 'cooking' && item.cookingStartedAt ? `<br/><small style="color: #3b82f6;">⏱️ Started: ${formatTime(item.cookingStartedAt)}</small>` : ''}
              ${item.status === 'done' && item.doneAt ? `<br/><small style="color: #22c55e;">✅ Done: ${formatTime(item.doneAt)}</small>` : ''}
            </div>
          `).join('')}
          ${kot.notes ? `<div><strong>Notes:</strong><br/>${kot.notes}</div>` : ''}
          <div class="footer">Created: ${new Date(kot.createdAt).toLocaleString()}</div>
          <div class="footer">${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  // ─── UI Helpers ───────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'bg-blue-100 text-blue-700',
      'acknowledged': 'bg-indigo-100 text-indigo-700',
      'preparing': 'bg-yellow-100 text-yellow-700',
      'partially_ready': 'bg-orange-100 text-orange-700',
      'ready': 'bg-green-100 text-green-700',
      'served': 'bg-gray-100 text-gray-700',
      'cancelled': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Removed getItemStatusBadge – we now use inline timers for pending/cooking

  const getOrderTypeIcon = (type: string) => {
    const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
    if (cfg) {
      const Icon = cfg.Icon;
      return <Icon size={16} className="text-gray-500" />;
    }
    return <Users size={16} className="text-gray-500" />;
  };

  const getElapsedTime = (createdAt: string) => {
    if (!createdAt) return '0 min';
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getElapsedColor = (createdAt: string) => {
    if (!createdAt) return 'text-gray-500';
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes > 20) return 'text-red-600';
    if (minutes > 10) return 'text-orange-500';
    return 'text-green-600';
  };

  // ─── Check if all items are done ─────────────────────────────────────
  const allItemsDone = kot?.items.every(item => item.status === 'done') || false;
  const allItemsVerified = checkResults.every(r => r.available);
  const canStartCooking = allItemsVerified && kot?.status !== 'preparing' && kot?.status !== 'ready' && kot?.status !== 'served';

  // ─── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading KOT details...</p>
        </div>
      </div>
    );
  }

  if (!kot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">KOT not found</p>
          <button 
            onClick={() => navigate('/staff-portal/kot')} 
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const typeCfg = TYPE_CONFIG[kot.orderType as keyof typeof TYPE_CONFIG] || { label: 'Order', Icon: Users };
  const verifiedCount = checkResults.filter(r => r.available === true).length;
  const totalItems = checkResults.length;
  const progressPercent = totalItems > 0 ? (verifiedCount / totalItems) * 100 : 0;

  const isPreparing = kot.status === 'preparing' || kot.status === 'partially_ready';
  const isReady = kot.status === 'ready';

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/staff-portal/kot')}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-xl text-gray-800">KOT #{kot.kotNumber}</h1>
                  {kot.isVip && <Crown size={18} className="text-amber-500" />}
                  {/* Replace status badge with timer when preparing */}
                  {isPreparing && kot.prepStartedAt ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                      <Timer size={12} className="animate-pulse" />
                      {getTimeDifference(kot.prepStartedAt, new Date(now))}
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(kot.status)}`}>
                      {kot.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Order #{kot.orderNumber} · {typeCfg.label} · {formatTime(kot.createdAt)} · Elapsed: {kot.elapsedMinutes} min
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintKOT}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center gap-1"
              >
                <Printer size={14} className="text-gray-600" />
                <span className="text-xs">Print</span>
              </button>
              <button
                onClick={fetchKOTDetails}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center gap-1"
              >
                <Loader2 size={14} className={`text-gray-500 ${verifying ? 'animate-spin' : ''}`} />
                <span className="text-xs">Refresh</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-500">Verification Progress</span>
              <span className="text-xs font-medium text-gray-700">{verifiedCount} / {totalItems} items verified</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div
                className="absolute h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* KOT Time Summary */}
          <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
              <Calendar size={12} className="text-gray-400" />
              <span className="text-gray-500">Created:</span>
              <span className="font-medium text-gray-700">{formatTime(kot.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
              <Clock size={12} className="text-gray-400" />
              <span className="text-gray-500">Elapsed:</span>
              <span className={`font-medium ${getElapsedColor(kot.createdAt)}`}>
                {getElapsedTime(kot.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
              <ChefHat size={12} className="text-gray-400" />
              <span className="text-gray-500">Status:</span>
              <span className={`font-medium ${isReady ? 'text-green-600' : isPreparing ? 'text-yellow-600' : 'text-gray-700'}`}>
                {isReady ? '✅ Ready' : isPreparing ? '⏳ Cooking' : kot.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
              <Timer size={12} className="text-gray-400" />
              <span className="text-gray-500">Cooking:</span>
              <span className="font-medium text-orange-600">
                {kot.prepStartedAt ? getTimeDifference(kot.prepStartedAt, new Date(now)) : 'Not started'}
              </span>
            </div>
          </div>

          {/* Cooking Timer */}
          {isPreparing && (
            <div className="mt-3 flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg">
              <Timer size={16} className="text-orange-500 animate-pulse" />
              <span className="text-sm font-medium text-orange-700">
                Cooking in progress: 
                <span className="ml-2 font-bold">{kot.prepStartedAt ? getTimeDifference(kot.prepStartedAt, new Date(now)) : 'Just started'}</span>
              </span>
            </div>
          )}

          {/* Ready Status */}
          {isReady && (
            <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-sm font-medium text-green-700">✅ KOT is ready to serve!</span>
            </div>
          )}
        </div>
      </header>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Package size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Items</p>
              <p className="font-bold text-gray-800">{totalItems}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Verified</p>
              <p className="font-bold text-green-600">{verifiedCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Cooking</p>
              <p className="font-bold text-blue-600">{kot.items.filter(i => i.status === 'cooking').length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
              <ThumbsUp size={18} className="text-teal-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Done</p>
              <p className="font-bold text-teal-600">{kot.items.filter(i => i.status === 'done').length}</p>
            </div>
          </div>
        </div>

        {/* Items Checklist */}
        <div className="space-y-4">
          {checkResults.map((result, idx) => {
            const isVerified = result.available;
            const hasRecipe = !!result.recipe;
            const item = kot.items[idx];
            const isDone = item?.status === 'done';
            const isCooking = item?.status === 'cooking';
            const isPending = item?.status === 'pending';
            const isProcessing = processingItem === item?._id;

            return (
              <div
                key={result.itemId}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition ${
                  isDone ? 'border-teal-300 bg-teal-50/30' :
                  isVerified ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isDone ? (
                        <ThumbsUp size={20} className="text-teal-500" />
                      ) : isVerified ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : (
                        <XCircle size={20} className="text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      {/* Item Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {result.productName}
                            <span className="ml-2 text-sm font-normal text-gray-500">× {item?.quantity || 1}</span>
                          </h3>
                          {item?.notes && (
                            <p className="text-xs text-amber-500 mt-0.5">📝 {item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Pending Timer (elapsed since order creation) */}
                          {isPending ? (
                            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-amber-200">
                              <Timer size={14} className="text-amber-500 animate-pulse" />
                              {kot?.createdAt ? getTimeDifference(kot.createdAt, new Date(now)) : 'Waiting'}
                            </span>
                          ) : isCooking ? (
                            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-blue-200">
                              <Timer size={14} className="text-blue-500 animate-pulse" />
                              {item?.cookingStartedAt ? getTimeDifference(item.cookingStartedAt, new Date(now)) : 'Just started'}
                            </span>
                          ) : isDone ? (
                            <span className="text-xs font-medium text-teal-700 bg-teal-100 px-3 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle size={12} className="text-teal-500" /> Done
                            </span>
                          ) : (
                            // fallback (should not happen)
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              {item?.status}
                            </span>
                          )}
                          {result.recipe && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock size={12} /> {result.recipe.prepTimeMinutes}m prep
                            </span>
                          )}
                          {isDone && item?.cookingStartedAt && item?.doneAt && (
                            <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle size={12} />
                              {getTimeDifference(item.cookingStartedAt, new Date(item.doneAt))}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Recipe / Ingredients */}
                      {hasRecipe ? (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <UtensilsCrossed size={14} />
                            <span className="font-medium">Ingredients</span>
                            {result.recipe?.instructions && (
                              <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                                📋 Instructions
                              </span>
                            )}
                          </div>
                          <div className="bg-white rounded-lg p-2 space-y-1 border border-gray-100">
                            {result.recipe?.ingredients.map((ing, i) => {
                              const insufficient = result.insufficientIngredients.find(
                                ins => ins.name === ing.ingredientName
                              );
                              return (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    {ing.ingredientName}
                                    <span className="text-xs text-gray-400 ml-1">
                                      {ing.quantity}{ing.unit}
                                    </span>
                                  </span>
                                  {insufficient ? (
                                    <span className="text-red-500 text-xs font-medium flex items-center gap-1">
                                      <AlertTriangle size={12} />
                                      Need {insufficient.required}{insufficient.unit}, have {insufficient.available}
                                    </span>
                                  ) : (
                                    <span className="text-green-500 text-xs font-medium">✓ In stock</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {result.recipe?.instructions && (
                            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                              <strong>Instructions:</strong> {result.recipe.instructions}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {result.error || 'Recipe not found for this item'}
                          </div>
                          <button
                            onClick={() => openRecipeModal(result.productId, result.productName)}
                            className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition flex items-center gap-1"
                          >
                            <PlusCircle size={14} /> Add Recipe
                          </button>
                        </div>
                      )}

                      {/* Action Buttons for Item */}
                      {!isReady && !isDone && (
                        <div className="mt-3 flex gap-2">
                          {isPending && (
                            <button
                              onClick={() => handleStartItem(item._id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                              Start Cooking
                            </button>
                          )}
                          {(isPending || isCooking) && (
                            <button
                              onClick={() => handleCompleteItem(item._id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-600 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              Complete Item
                            </button>
                          )}
                          {isDone && (
                            <span className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-xs font-medium flex items-center gap-1">
                              <ThumbsUp size={12} /> Done
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Action Buttons ────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap gap-3 justify-end">
          {/* Complete All Items */}
          {(isPreparing || kot.status === 'new' || kot.status === 'acknowledged') && (
            <button
              onClick={handleCompleteAll}
              disabled={showCompleteAll || kot.items.every(i => i.status === 'done')}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-teal-600 transition disabled:opacity-50 shadow-lg shadow-teal-200"
            >
              {showCompleteAll ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              Complete All Items
            </button>
          )}

          {/* Mark Ready */}
          {allItemsDone && !isReady && (
            <button
              onClick={handleMarkReady}
              disabled={continuing}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-green-600 transition disabled:opacity-50 shadow-lg shadow-green-200"
            >
              {continuing ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} />}
              Mark Ready
            </button>
          )}

          {/* Start Cooking */}
          {canStartCooking && !isPreparing && !isReady && (
            <button
              onClick={handleStartCooking}
              disabled={continuing}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 transition disabled:opacity-50 shadow-lg shadow-orange-200"
            >
              {continuing ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
              Punch In & Start Cooking
            </button>
          )}

          {/* Go to KOT List */}
          {isReady && (
            <button
              onClick={() => navigate('/staff-portal/kot')}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-green-600 transition shadow-lg shadow-green-200"
            >
              <CheckCircle size={18} />
              Go to KOT List
            </button>
          )}

          {/* Refresh Status */}
          {isPreparing && !isReady && (
            <button
              onClick={fetchKOTDetails}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition flex items-center gap-2"
            >
              <RotateCw size={16} />
              Refresh Status
            </button>
          )}
        </div>

        {/* ─── Status Messages ────────────────────────────────────────────── */}
        {!overallReady && checkResults.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-700">Some items have issues</p>
              <p className="text-xs text-yellow-600">
                Resolve missing recipes or insufficient stock before punching in.
                Use the <strong>Add Recipe</strong> button to create a recipe using existing ingredients.
              </p>
            </div>
          </div>
        )}

        {isPreparing && !allItemsDone && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Timer size={18} className="text-blue-500 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-blue-700">Cooking in Progress</p>
              <p className="text-xs text-blue-600">
                Complete items as they finish cooking. Use the <strong>Complete All Items</strong> button when ready.
              </p>
            </div>
          </div>
        )}

        {isReady && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle size={18} className="text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-700">✅ KOT is Ready to Serve!</p>
              <p className="text-xs text-green-600">
                All items are complete. Click <strong>Go to KOT List</strong> to continue.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Recipe Creation Modal ──────────────────────────────────────── */}
      {showRecipeModal && currentProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowRecipeModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-3xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b bg-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Create Recipe</h3>
                    <p className="text-sm text-gray-500">For: <strong>{currentProduct.productName}</strong></p>
                  </div>
                  <button onClick={() => setShowRecipeModal(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
                {/* Ingredients */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
                  {recipeForm.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center relative">
                      <div className="flex-1 relative" ref={dropdownRef}>
                        <input
                          type="text"
                          placeholder="Search or enter ingredient name"
                          value={ing.ingredientName}
                          onChange={(e) => {
                            handleIngredientChange(idx, 'ingredientName', e.target.value);
                            setSearchTerm(e.target.value);
                            setShowDropdown(idx);
                          }}
                          onFocus={() => setShowDropdown(idx)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        {showDropdown === idx && searchTerm.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {loadingIngredients ? (
                              <div className="p-2 text-center text-gray-500">
                                <Loader2 size={16} className="animate-spin inline" /> Loading...
                              </div>
                            ) : (
                              allIngredients
                                .filter(ing => ing.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .slice(0, 10)
                                .map((ingredient) => (
                                  <div
                                    key={ingredient._id}
                                    className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm flex justify-between"
                                    onClick={() => selectIngredient(idx, ingredient)}
                                  >
                                    <span>{ingredient.name}</span>
                                    <span className="text-gray-400 text-xs">{ingredient.unit} · {ingredient.currentStock} in stock</span>
                                  </div>
                                ))
                            )}
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        placeholder="Qty"
                        value={ing.quantity || ''}
                        onChange={(e) => handleIngredientChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input
                        type="number"
                        placeholder="Cost"
                        value={ing.costPrice || ''}
                        onChange={(e) => handleIngredientChange(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <button
                        onClick={() => removeIngredientRow(idx)}
                        className="text-red-500 hover:text-red-700"
                        disabled={recipeForm.ingredients.length <= 1}
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addIngredientRow}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <PlusCircle size={14} /> Add Ingredient
                  </button>
                </div>

                {/* Prep Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prep Time (minutes)</label>
                  <input
                    type="number"
                    value={recipeForm.prepTimeMinutes}
                    onChange={(e) => setRecipeForm({ ...recipeForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    min="0"
                  />
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instructions (optional)</label>
                  <textarea
                    rows={2}
                    value={recipeForm.instructions}
                    onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="e.g., Sauté onions, add spices..."
                  />
                </div>
              </div>

              <div className="p-5 bg-gray-50 border-t flex gap-3">
                <button
                  onClick={() => setShowRecipeModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={createRecipe}
                  disabled={creatingRecipe}
                  className="flex-1 py-2.5 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creatingRecipe ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                  Create Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTargetReadyTime(createdAt: string, prepTimeMinutes: number) {
  if (!createdAt) return 'N/A';
  const target = new Date(new Date(createdAt).getTime() + prepTimeMinutes * 60000);
  return formatTime(target.toISOString());
}