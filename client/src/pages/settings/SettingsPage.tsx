// pages/SettingsPage.tsx
// Auth check now goes through useAuth() instead of the nonexistent
// adminStorage.getAdmin() — adminStorage (see utils/storage.ts) only ever
// held the token (getToken/setToken/clear/isLoggedIn/debug), it never had
// a getAdmin() method. Calling it threw inside checkAuth() before
// fetchSettings() could ever run, which is why this page never loaded
// while pages that skip the manual check (like SalaryManagement, which
// just calls adminApi directly and lets the interceptor attach the token)
// worked fine.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { adminStorage } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';
import {
  Bell, Globe, Printer, Receipt,
  Building2, Users, Package, Clock,
  Save, Loader2, AlertCircle, RefreshCw,
  ToggleLeft, ToggleRight, ChevronRight, X,
  Mail, Phone, MapPin, 
  ChefHat, Settings as SettingsIcon,
  DollarSign, Tag, Truck, Coffee,
  PrinterIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ISettings {
  _id: string;
  restaurantName: string;
  restaurantEmail: string;
  restaurantPhone: string;
  restaurantAddress: string;
  taxRate: number;
  currency: string;
  defaultDiscount: number;
  billFooterMessage: string;
  autoPrintBill: boolean;
  enableEmailReceipts: boolean;
  autoKOT: boolean;
  maxOrderPerTable: number;
  enablePreOrder: boolean;
  lowStockAlert: number;
  enableNotifications: boolean;
  enableSMSAlerts: boolean;
  printerIP: string;
  kitchenPrinterIP: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  enableLoyaltyPoints: boolean;
  pointsPerRupee: number;
  defaultTableWaitTime: number;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    restaurantName: '',
    restaurantEmail: '',
    restaurantPhone: '',
    restaurantAddress: '',
    taxRate: 5,
    currency: 'INR',
    defaultDiscount: 0,
    billFooterMessage: 'Thank you for dining with us!',
    autoPrintBill: false,
    enableEmailReceipts: true,
    autoKOT: true,
    maxOrderPerTable: 5,
    enablePreOrder: false,
    lowStockAlert: 10,
    enableNotifications: true,
    enableSMSAlerts: false,
    printerIP: '',
    kitchenPrinterIP: '',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    enableLoyaltyPoints: false,
    pointsPerRupee: 1,
    defaultTableWaitTime: 15,
  });

  // ✅ Check if user is admin — via AuthContext's server-fetched `user`,
  // not a local-storage lookup that no longer exists.
  useEffect(() => {
    if (authLoading) return; // wait for the session check to resolve first

    if (!user) {
      toast.error('Please login as admin');
      navigate('/login');
      return;
    }

    if (!isAdmin && !isSuperAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
      return;
    }

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, isAdmin, isSuperAdmin]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get('/settings');
      
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setSettings(data);
        setFormData({
          restaurantName: data.restaurantName || '',
          restaurantEmail: data.restaurantEmail || '',
          restaurantPhone: data.restaurantPhone || '',
          restaurantAddress: data.restaurantAddress || '',
          taxRate: data.taxRate || 5,
          currency: data.currency || 'INR',
          defaultDiscount: data.defaultDiscount || 0,
          billFooterMessage: data.billFooterMessage || 'Thank you for dining with us!',
          autoPrintBill: data.autoPrintBill ?? false,
          enableEmailReceipts: data.enableEmailReceipts ?? true,
          autoKOT: data.autoKOT ?? true,
          maxOrderPerTable: data.maxOrderPerTable || 5,
          enablePreOrder: data.enablePreOrder ?? false,
          lowStockAlert: data.lowStockAlert || 10,
          enableNotifications: data.enableNotifications ?? true,
          enableSMSAlerts: data.enableSMSAlerts ?? false,
          printerIP: data.printerIP || '',
          kitchenPrinterIP: data.kitchenPrinterIP || '',
          timezone: data.timezone || 'Asia/Kolkata',
          dateFormat: data.dateFormat || 'DD/MM/YYYY',
          timeFormat: data.timeFormat || '12h',
          enableLoyaltyPoints: data.enableLoyaltyPoints ?? false,
          pointsPerRupee: data.pointsPerRupee || 1,
          defaultTableWaitTime: data.defaultTableWaitTime || 15,
        });
        toast.success('Settings loaded successfully');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch settings:', error);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        adminStorage.clear();
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/dashboard');
      } else {
        setError(error.response?.data?.error || 'Failed to load settings');
        toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      console.log('📝 Saving settings...', formData);
      const res = await adminApi.put('/settings', formData);
      console.log('📋 Save response:', res.data);
      
      if (res.data.success) {
        setSettings(res.data.data);
        toast.success('Settings saved successfully');
      }
    } catch (error: any) {
      console.error('❌ Failed to save settings:', error);
      setError(error.response?.data?.error || 'Failed to save settings');
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      console.log('🔄 Resetting settings...');
      const res = await adminApi.post('/settings/reset');
      console.log('📋 Reset response:', res.data);
      
      if (res.data.success) {
        const data = res.data.data;
        setSettings(data);
        setFormData({
          restaurantName: data.restaurantName || '',
          restaurantEmail: data.restaurantEmail || '',
          restaurantPhone: data.restaurantPhone || '',
          restaurantAddress: data.restaurantAddress || '',
          taxRate: data.taxRate || 5,
          currency: data.currency || 'INR',
          defaultDiscount: data.defaultDiscount || 0,
          billFooterMessage: data.billFooterMessage || 'Thank you for dining with us!',
          autoPrintBill: data.autoPrintBill ?? false,
          enableEmailReceipts: data.enableEmailReceipts ?? true,
          autoKOT: data.autoKOT ?? true,
          maxOrderPerTable: data.maxOrderPerTable || 5,
          enablePreOrder: data.enablePreOrder ?? false,
          lowStockAlert: data.lowStockAlert || 10,
          enableNotifications: data.enableNotifications ?? true,
          enableSMSAlerts: data.enableSMSAlerts ?? false,
          printerIP: data.printerIP || '',
          kitchenPrinterIP: data.kitchenPrinterIP || '',
          timezone: data.timezone || 'Asia/Kolkata',
          dateFormat: data.dateFormat || 'DD/MM/YYYY',
          timeFormat: data.timeFormat || '12h',
          enableLoyaltyPoints: data.enableLoyaltyPoints ?? false,
          pointsPerRupee: data.pointsPerRupee || 1,
          defaultTableWaitTime: data.defaultTableWaitTime || 15,
        });
        toast.success('Settings reset to default successfully');
      }
    } catch (error: any) {
      console.error('❌ Failed to reset settings:', error);
      toast.error(error.response?.data?.error || 'Failed to reset settings');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building2, description: 'Restaurant information' },
    { id: 'billing', label: 'Billing & Tax', icon: Receipt, description: 'Tax rates and billing' },
    { id: 'kitchen', label: 'Kitchen & KOT', icon: ChefHat, description: 'KOT and kitchen settings' },
    { id: 'inventory', label: 'Inventory', icon: Package, description: 'Stock management' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and SMS alerts' },
    { id: 'preferences', label: 'Preferences', icon: Globe, description: 'Date, time, currency' },
    { id: 'printers', label: 'Printers', icon: Printer, description: 'Bill and kitchen printers' },
    { id: 'loyalty', label: 'Loyalty', icon: Users, description: 'Customer loyalty program' },
  ];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon size={28} className="text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          </div>
          <p className="text-gray-500 text-sm">Manage your restaurant configuration and preferences</p>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${
                      isActive
                        ? 'bg-orange-50 border-r-2 border-orange-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isActive ? 'text-orange-600' : 'text-gray-700'}`}>
                        {tab.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{tab.description}</p>
                    </div>
                    {isActive && <ChevronRight size={16} className="text-orange-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-transparent">
                <h2 className="text-lg font-semibold text-gray-800">
                  {tabs.find(t => t.id === activeTab)?.label} Settings
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {tabs.find(t => t.id === activeTab)?.description}
                </p>
              </div>

              <div className="p-6">
                {/* General Settings */}
                {activeTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
                      <input
                        type="text"
                        value={formData.restaurantName}
                        onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.restaurantEmail}
                          onChange={(e) => setFormData({ ...formData, restaurantEmail: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={formData.restaurantPhone}
                          onChange={(e) => setFormData({ ...formData, restaurantPhone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={formData.restaurantAddress}
                        onChange={(e) => setFormData({ ...formData, restaurantAddress: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  </div>
                )}

                {/* Billing Settings */}
                {activeTab === 'billing' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                        <input
                          type="number"
                          value={formData.taxRate}
                          onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Discount (%)</label>
                        <input
                          type="number"
                          value={formData.defaultDiscount}
                          onChange={(e) => setFormData({ ...formData, defaultDiscount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bill Footer Message</label>
                      <textarea
                        value={formData.billFooterMessage}
                        onChange={(e) => setFormData({ ...formData, billFooterMessage: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-700">Auto Print Bill</p>
                        <p className="text-xs text-gray-400">Automatically print bill after payment</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, autoPrintBill: !formData.autoPrintBill })}
                        className="text-orange-500"
                      >
                        {formData.autoPrintBill ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Kitchen Settings */}
                {activeTab === 'kitchen' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-700">Auto KOT</p>
                        <p className="text-xs text-gray-400">Automatically send KOT to kitchen</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, autoKOT: !formData.autoKOT })}
                        className="text-orange-500"
                      >
                        {formData.autoKOT ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Orders Per Table</label>
                      <input
                        type="number"
                        value={formData.maxOrderPerTable}
                        onChange={(e) => setFormData({ ...formData, maxOrderPerTable: parseInt(e.target.value) || 5 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-700">Enable Pre-Order</p>
                        <p className="text-xs text-gray-400">Allow customers to pre-order</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, enablePreOrder: !formData.enablePreOrder })}
                        className="text-orange-500"
                      >
                        {formData.enablePreOrder ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Table Wait Time (minutes)</label>
                      <input
                        type="number"
                        value={formData.defaultTableWaitTime}
                        onChange={(e) => setFormData({ ...formData, defaultTableWaitTime: parseInt(e.target.value) || 15 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  </div>
                )}

                {/* Inventory Settings */}
                {activeTab === 'inventory' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert Level</label>
                      <input
                        type="number"
                        value={formData.lowStockAlert}
                        onChange={(e) => setFormData({ ...formData, lowStockAlert: parseInt(e.target.value) || 10 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <p className="text-xs text-gray-400 mt-1">Alert when stock goes below this level</p>
                    </div>
                  </div>
                )}

                {/* Notification Settings */}
                {activeTab === 'notifications' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-700">Enable Notifications</p>
                        <p className="text-xs text-gray-400">Receive system notifications</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, enableNotifications: !formData.enableNotifications })}
                        className="text-orange-500"
                      >
                        {formData.enableNotifications ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-700">Enable SMS Alerts</p>
                        <p className="text-xs text-gray-400">Send SMS alerts to customers</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, enableSMSAlerts: !formData.enableSMSAlerts })}
                        className="text-orange-500"
                      >
                        {formData.enableSMSAlerts ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-700">Enable Email Receipts</p>
                        <p className="text-xs text-gray-400">Send email receipts to customers</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, enableEmailReceipts: !formData.enableEmailReceipts })}
                        className="text-orange-500"
                      >
                        {formData.enableEmailReceipts ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Printer Settings */}
                {activeTab === 'printers' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bill Printer IP</label>
                      <input
                        type="text"
                        value={formData.printerIP}
                        onChange={(e) => setFormData({ ...formData, printerIP: e.target.value })}
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kitchen Printer IP</label>
                      <input
                        type="text"
                        value={formData.kitchenPrinterIP}
                        onChange={(e) => setFormData({ ...formData, kitchenPrinterIP: e.target.value })}
                        placeholder="192.168.1.101"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  </div>
                )}

                {/* Preferences */}
                {activeTab === 'preferences' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      >
                        <option value="INR">₹ INR</option>
                        <option value="USD">$ USD</option>
                        <option value="EUR">€ EUR</option>
                        <option value="GBP">£ GBP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
                        <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                        <option value="America/New_York">America/New_York (UTC-5)</option>
                        <option value="Europe/London">Europe/London (UTC+0)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                        <select
                          value={formData.dateFormat}
                          onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                        <select
                          value={formData.timeFormat}
                          onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                        >
                          <option value="12h">12-hour (AM/PM)</option>
                          <option value="24h">24-hour</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loyalty Settings */}
                {activeTab === 'loyalty' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-700">Enable Loyalty Points</p>
                        <p className="text-xs text-gray-400">Allow customers to earn loyalty points</p>
                      </div>
                      <button
                        onClick={() => setFormData({ ...formData, enableLoyaltyPoints: !formData.enableLoyaltyPoints })}
                        className="text-orange-500"
                      >
                        {formData.enableLoyaltyPoints ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                    {formData.enableLoyaltyPoints && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points per ₹</label>
                        <input
                          type="number"
                          value={formData.pointsPerRupee}
                          onChange={(e) => setFormData({ ...formData, pointsPerRupee: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                        <p className="text-xs text-gray-400 mt-1">Number of loyalty points earned per rupee spent</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition"
                  >
                    <RefreshCw size={16} /> Reset to Default
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-medium hover:from-orange-600 hover:to-red-600 flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save All Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}