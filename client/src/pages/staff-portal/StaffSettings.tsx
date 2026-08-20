// pages/staff-portal/StaffSettingsPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Bell,
  Moon,
  Sun,
  Globe,
  Lock,
  Shield,
  Mail,
  Loader2,
  RefreshCw,
  Clock,
  User,
  Save,
  Palette,
  Monitor,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Smartphone,
  MapPin,
  Building2,
  ChefHat,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import { staffStorage } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';

// ─── Settings Interface ────────────────────────────────────────────────────
interface StaffSettingsType {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEnabled: boolean;
  language: 'en' | 'hi' | 'ta' | 'te' | 'bn';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'DD MMM YYYY';
  timeFormat: '12h' | '24h';
  compactView: boolean;
  autoRefresh: boolean;
  refreshInterval: 5 | 10 | 15 | 30 | 60;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const ALLOWED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'bn', label: 'Bengali' },
];

const ALLOWED_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
];

const ALLOWED_DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
];

const ALLOWED_REFRESH_INTERVALS = [
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '60 seconds' },
];

const DEFAULT_SETTINGS: StaffSettingsType = {
  theme: 'light',
  notifications: true,
  soundEnabled: true,
  language: 'en',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  compactView: false,
  autoRefresh: true,
  refreshInterval: 15,
};

const SETTINGS_TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme and display' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alerts and sounds' },
  { id: 'language', label: 'Language & Time', icon: Globe, description: 'Language and timezone' },
  { id: 'refresh', label: 'Auto Refresh', icon: RefreshCw, description: 'Data refresh settings' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password and access' },
  { id: 'account', label: 'Account', icon: User, description: 'Profile information' },
];

export default function StaffSettingsPage() {
  const navigate = useNavigate();
  const { user, isStaff, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState('appearance');
  const [settings, setSettings] = useState<StaffSettingsType>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<StaffSettingsType | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // ─── Check authentication ──────────────────────────────────────────────
  useEffect(() => {
    const staffToken = staffStorage.getToken();
    if (!staffToken || !isStaff) {
      toast.error('Please login again');
      navigate('/staff-portal/login');
      return;
    }
    fetchSettings();
  }, [isStaff, navigate]);

  // ─── Check for changes ────────────────────────────────────────────────────
  useEffect(() => {
    if (originalSettings) {
      const hasChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(hasChanged);
    }
  }, [settings, originalSettings]);

  // ─── Fetch Settings ───────────────────────────────────────────────────────
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await staffApi.get('/staff-portal/settings');
      if (response.data.success) {
        const data = response.data.data;
        setSettings(data);
        setOriginalSettings(data);
      } else {
        toast.error('Failed to load settings');
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);

      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      } else {
        toast.error(error.response?.data?.error || 'Failed to load settings');
        setSettings(DEFAULT_SETTINGS);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Save Settings ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await staffApi.put('/staff-portal/settings', settings);

      if (response.data.success) {
        toast.success('Settings saved successfully!');
        setOriginalSettings(response.data.data);
        setSettings(response.data.data);
        setHasChanges(false);
        await refreshUser();
      } else {
        toast.error(response.data.error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);

      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      } else {
        toast.error(error.response?.data?.error || 'Failed to save settings');
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Reset to Defaults ────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    setResetting(true);
    try {
      const response = await staffApi.post('/staff-portal/settings/reset');

      if (response.data.success) {
        toast.success('Settings reset to defaults!');
        setOriginalSettings(response.data.data);
        setSettings(response.data.data);
        setHasChanges(false);
        await refreshUser();
      } else {
        toast.error(response.data.error || 'Failed to reset settings');
      }
    } catch (error: any) {
      console.error('Error resetting settings:', error);

      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      } else {
        toast.error(error.response?.data?.error || 'Failed to reset settings');
      }
    } finally {
      setResetting(false);
    }
  };

  // ─── Update Setting ───────────────────────────────────────────────────────
  const updateSetting = <K extends keyof StaffSettingsType>(
    key: K,
    value: StaffSettingsType[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Toggle Boolean Setting ──────────────────────────────────────────────
  const toggleSetting = (key: keyof StaffSettingsType) => {
    if (typeof settings[key] === 'boolean') {
      updateSetting(key, !settings[key] as any);
    }
  };

  // ─── Render Toggle Button ──────────────────────────────────────────────
  const renderToggle = (value: boolean) => (
    <button
      className={`w-12 h-6 rounded-full transition flex items-center ${
        value ? 'bg-orange-500' : 'bg-gray-300'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white transform transition ${
          value ? 'translate-x-6' : 'translate-x-0.5'
        } mt-0.5`}
      />
    </button>
  );

  // ─── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  const role = user?.role || user?.userType || 'Staff';
  const displayRole = typeof role === 'string' ? role : (role?.name || 'Staff');

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings size={28} className="text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          </div>
          <p className="text-gray-500 text-sm">Manage your preferences and display settings</p>
          {hasChanges && (
            <p className="text-orange-500 text-sm font-medium mt-2 flex items-center gap-1">
              <AlertCircle size={16} /> Unsaved changes
            </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Sidebar Tabs ─────────────────────────────────────────── */}
          <div className="lg:w-80 shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all border-l-2 ${
                      isActive
                        ? 'bg-orange-50 border-l-orange-500'
                        : 'border-l-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg ${
                        isActive ? 'text-orange-500' : 'text-gray-400'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          isActive ? 'text-orange-600' : 'text-gray-700'
                        }`}
                      >
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

          {/* ─── Main Content ────────────────────────────────────────────── */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* ─── Header ─────────────────────────────────────────────── */}
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-transparent">
                <h2 className="text-lg font-semibold text-gray-800">
                  {SETTINGS_TABS.find((t) => t.id === activeTab)?.label} Settings
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {SETTINGS_TABS.find((t) => t.id === activeTab)?.description}
                </p>
              </div>

              {/* ─── Content ────────────────────────────────────────────── */}
              <div className="p-6 space-y-4">
                {/* APPEARANCE TAB */}
                {activeTab === 'appearance' && (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-4 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Theme</p>
                        <p className="text-sm text-gray-500">Choose your preferred theme</p>
                      </div>
                      <div className="flex gap-2">
                        {(['light', 'dark', 'system'] as const).map((theme) => (
                          <button
                            key={theme}
                            onClick={() => updateSetting('theme', theme)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                              settings.theme === theme
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {theme === 'light' && <Sun size={14} className="inline mr-1" />}
                            {theme === 'dark' && <Moon size={14} className="inline mr-1" />}
                            {theme === 'system' && <Monitor size={14} className="inline mr-1" />}
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Compact View</p>
                        <p className="text-sm text-gray-500">Show more items with less spacing</p>
                      </div>
                      <button
                        onClick={() => toggleSetting('compactView')}
                        className="text-orange-500"
                      >
                        {renderToggle(settings.compactView)}
                      </button>
                    </div>
                  </>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Push Notifications</p>
                        <p className="text-sm text-gray-500">Receive order updates and alerts</p>
                      </div>
                      <button
                        onClick={() => toggleSetting('notifications')}
                        className="text-orange-500"
                      >
                        {renderToggle(settings.notifications)}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Sound Alerts</p>
                        <p className="text-sm text-gray-500">Play sounds for new orders</p>
                      </div>
                      <button
                        onClick={() => toggleSetting('soundEnabled')}
                        className="text-orange-500"
                      >
                        {renderToggle(settings.soundEnabled)}
                      </button>
                    </div>
                  </>
                )}

                {/* LANGUAGE & TIME TAB */}
                {activeTab === 'language' && (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Language</p>
                        <p className="text-sm text-gray-500">Select your preferred language</p>
                      </div>
                      <select
                        value={settings.language}
                        onChange={(e) =>
                          updateSetting('language', e.target.value as StaffSettingsType['language'])
                        }
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                      >
                        {ALLOWED_LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Timezone</p>
                        <p className="text-sm text-gray-500">Your local timezone</p>
                      </div>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white min-w-[200px]"
                      >
                        {ALLOWED_TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Date Format</p>
                        <p className="text-sm text-gray-500">How dates are displayed</p>
                      </div>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) =>
                          updateSetting('dateFormat', e.target.value as StaffSettingsType['dateFormat'])
                        }
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                      >
                        {ALLOWED_DATE_FORMATS.map((fmt) => (
                          <option key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Time Format</p>
                        <p className="text-sm text-gray-500">12h or 24h format</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateSetting('timeFormat', '12h')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            settings.timeFormat === '12h'
                              ? 'bg-orange-500 text-white'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Clock size={14} className="inline mr-1" /> 12h
                        </button>
                        <button
                          onClick={() => updateSetting('timeFormat', '24h')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            settings.timeFormat === '24h'
                              ? 'bg-orange-500 text-white'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Clock size={14} className="inline mr-1" /> 24h
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* AUTO REFRESH TAB */}
                {activeTab === 'refresh' && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">Enable Auto Refresh</p>
                        <p className="text-sm text-gray-500">Automatically refresh data</p>
                      </div>
                      <button
                        onClick={() => toggleSetting('autoRefresh')}
                        className="text-orange-500"
                      >
                        {renderToggle(settings.autoRefresh)}
                      </button>
                    </div>

                    {settings.autoRefresh && (
                      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-800">Refresh Interval</p>
                          <p className="text-sm text-gray-500">How often to refresh data</p>
                        </div>
                        <select
                          value={settings.refreshInterval}
                          onChange={(e) =>
                            updateSetting('refreshInterval', parseInt(e.target.value) as StaffSettingsType['refreshInterval'])
                          }
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                        >
                          {ALLOWED_REFRESH_INTERVALS.map((interval) => (
                            <option key={interval.value} value={interval.value}>
                              {interval.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* SECURITY TAB */}
                {activeTab === 'security' && (
                  <div>
                    <button
                      onClick={() => navigate('/staff-portal/change-password')}
                      className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition w-full"
                    >
                      <Lock size={18} />
                      <div className="text-left">
                        <p className="font-medium">Change Password</p>
                        <p className="text-xs text-gray-400">Update your account password</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* ACCOUNT TAB */}
                {activeTab === 'account' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <UserCheck size={18} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Role</p>
                        <p className="font-medium text-gray-800 capitalize">{displayRole}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <CheckCircle size={18} className="text-green-500" />
                      <div>
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="font-medium text-green-600">Active</p>
                      </div>
                    </div>
                    {user?.employeeId && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Smartphone size={18} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Employee ID</p>
                          <p className="font-medium text-gray-800">{user.employeeId}</p>
                        </div>
                      </div>
                    )}
                    {user?.branchName && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Building2 size={18} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Branch</p>
                          <p className="font-medium text-gray-800">{user.branchName}</p>
                        </div>
                      </div>
                    )}
                    {user?.restaurantName && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <ChefHat size={18} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Restaurant</p>
                          <p className="font-medium text-gray-800">{user.restaurantName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── Action Buttons ────────────────────────────────────── */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleReset}
                  disabled={resetting || saving}
                  className="px-5 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {resetting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {resetting ? 'Resetting...' : 'Reset to Defaults'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                    hasChanges && !saving
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}