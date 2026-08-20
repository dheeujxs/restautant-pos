// pages/super-admin/SuperAdminSettings.tsx

import { useState, useEffect } from 'react';
import {
  Settings, Globe, Lock, Key, Shield, Bell,
  Moon, Sun, Smartphone, Monitor, Palette,
  Save, Loader2, RefreshCw, CheckCircle,
  AlertCircle, X, Eye, EyeOff, User,
  Mail, Phone, Building2, MapPin,
  CreditCard, Crown, Users, Store,
  FileText, BarChart3, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import {superAdminApi} from '../../services/api';

// ─── Types ──────────────────────────────────────────────────────────────

interface SettingsData {
  general: {
    siteName: string;
    siteLogo: string;
    timezone: string;
    currency: string;
    dateFormat: string;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordExpiry: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    orderUpdates: boolean;
    paymentAlerts: boolean;
    securityAlerts: boolean;
    marketingEmails: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    primaryColor: string;
    sidebarCollapsed: boolean;
    compactView: boolean;
  };
  integrations: {
    stripeEnabled: boolean;
    razorpayEnabled: boolean;
    googleAnalytics: string;
    sentryEnabled: boolean;
  };
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'appearance' | 'integrations'>('general');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.get('/super-admin/settings');
      if (response.data?.success) {
        setSettings(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
      toast.error(error.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await superAdminApi.put('/super-admin/settings', settings);
      if (response.data?.success) {
        toast.success('Settings saved successfully!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">
              Manage platform settings and configurations
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <div className="p-6 animate-fade-in">
        {activeTab === 'general' && settings && (
          <GeneralSettings settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'security' && settings && (
          <SecuritySettings settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'notifications' && settings && (
          <NotificationSettings settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'appearance' && settings && (
          <AppearanceSettings settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'integrations' && settings && (
          <IntegrationSettings settings={settings} setSettings={setSettings} />
        )}
      </div>
    </div>
  );
}

// ─── General Settings ──────────────────────────────────────────────────
function GeneralSettings({ settings, setSettings }: any) {
  const update = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      general: { ...prev.general, [key]: value }
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
          <input
            type="text"
            value={settings.general.siteName || ''}
            onChange={(e) => update('siteName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Logo URL</label>
          <input
            type="text"
            value={settings.general.siteLogo || ''}
            onChange={(e) => update('siteLogo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <select
            value={settings.general.timezone || 'Asia/Kolkata'}
            onChange={(e) => update('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={settings.general.currency || 'INR'}
            onChange={(e) => update('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="INR">₹ Indian Rupee</option>
            <option value="USD">$ US Dollar</option>
            <option value="EUR">€ Euro</option>
            <option value="GBP">£ British Pound</option>
            <option value="AED">د.إ UAE Dirham</option>
            <option value="SGD">S$ Singapore Dollar</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
          <select
            value={settings.general.dateFormat || 'DD/MM/YYYY'}
            onChange={(e) => update('dateFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Security Settings ──────────────────────────────────────────────────
function SecuritySettings({ settings, setSettings }: any) {
  const update = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.security.sessionTimeout || 60}
            onChange={(e) => update('sessionTimeout', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            min="5"
            max="480"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Login Attempts</label>
          <input
            type="number"
            value={settings.security.maxLoginAttempts || 5}
            onChange={(e) => update('maxLoginAttempts', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            min="3"
            max="10"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password Expiry (days)</label>
          <input
            type="number"
            value={settings.security.passwordExpiry || 90}
            onChange={(e) => update('passwordExpiry', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            min="30"
            max="365"
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="twoFactorAuth"
            checked={settings.security.twoFactorAuth || false}
            onChange={(e) => update('twoFactorAuth', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <label htmlFor="twoFactorAuth" className="text-sm text-gray-700">
            Enable Two-Factor Authentication
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Notification Settings ─────────────────────────────────────────────
function NotificationSettings({ settings, setSettings }: any) {
  const update = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const notifications = [
    { key: 'emailNotifications', label: 'Email Notifications' },
    { key: 'pushNotifications', label: 'Push Notifications' },
    { key: 'orderUpdates', label: 'Order Updates' },
    { key: 'paymentAlerts', label: 'Payment Alerts' },
    { key: 'securityAlerts', label: 'Security Alerts' },
    { key: 'marketingEmails', label: 'Marketing Emails' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
      
      <div className="space-y-4">
        {notifications.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={key}
              checked={settings.notifications[key] || false}
              onChange={(e) => update(key, e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <label htmlFor={key} className="text-sm text-gray-700">{label}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Appearance Settings ──────────────────────────────────────────────
function AppearanceSettings({ settings, setSettings }: any) {
  const update = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      appearance: { ...prev.appearance, [key]: value }
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Appearance Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
          <select
            value={settings.appearance.theme || 'light'}
            onChange={(e) => update('theme', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.appearance.primaryColor || '#8b5cf6'}
              onChange={(e) => update('primaryColor', e.target.value)}
              className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={settings.appearance.primaryColor || '#8b5cf6'}
              onChange={(e) => update('primaryColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <input
            type="checkbox"
            id="sidebarCollapsed"
            checked={settings.appearance.sidebarCollapsed || false}
            onChange={(e) => update('sidebarCollapsed', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <label htmlFor="sidebarCollapsed" className="text-sm text-gray-700">
            Sidebar Collapsed by Default
          </label>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <input
            type="checkbox"
            id="compactView"
            checked={settings.appearance.compactView || false}
            onChange={(e) => update('compactView', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <label htmlFor="compactView" className="text-sm text-gray-700">
            Compact View
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Integration Settings ──────────────────────────────────────────────
function IntegrationSettings({ settings, setSettings }: any) {
  const update = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      integrations: { ...prev.integrations, [key]: value }
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Integration Settings</h2>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="stripeEnabled"
            checked={settings.integrations.stripeEnabled || false}
            onChange={(e) => update('stripeEnabled', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <label htmlFor="stripeEnabled" className="text-sm text-gray-700">Enable Stripe Payments</label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="razorpayEnabled"
            checked={settings.integrations.razorpayEnabled || false}
            onChange={(e) => update('razorpayEnabled', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <label htmlFor="razorpayEnabled" className="text-sm text-gray-700">Enable Razorpay Payments</label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sentryEnabled"
            checked={settings.integrations.sentryEnabled || false}
            onChange={(e) => update('sentryEnabled', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <label htmlFor="sentryEnabled" className="text-sm text-gray-700">Enable Sentry Error Tracking</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Google Analytics ID</label>
          <input
            type="text"
            value={settings.integrations.googleAnalytics || ''}
            onChange={(e) => update('googleAnalytics', e.target.value)}
            placeholder="UA-XXXXXXXX-X"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
}