// context/SettingsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { staffApi } from '../services/api';
import { staffStorage } from '../utils/storage';
import moment from 'moment-timezone';

// ─── Types ──────────────────────────────────────────────────────────────
interface StaffSettings {
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

interface SettingsContextType {
  settings: StaffSettings | null;
  loading: boolean;
  updateSettings: (newSettings: Partial<StaffSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  getCurrentTime: () => string;
  t: (key: string) => string; // Translation function
}

// ─── Default Settings ──────────────────────────────────────────────────
const DEFAULT_SETTINGS: StaffSettings = {
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

// ─── Translations ──────────────────────────────────────────────────────
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome',
    settings: 'Settings',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    dashboard: 'Dashboard',
    orders: 'Orders',
    tables: 'Tables',
    menu: 'Menu',
    profile: 'Profile',
    logout: 'Logout',
    login: 'Login',
    register: 'Register',
    // Add more translations as needed
  },
  hi: {
    welcome: 'स्वागत है',
    settings: 'सेटिंग्स',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    view: 'देखें',
    dashboard: 'डैशबोर्ड',
    orders: 'ऑर्डर',
    tables: 'टेबल्स',
    menu: 'मेनू',
    profile: 'प्रोफ़ाइल',
    logout: 'लॉगआउट',
    login: 'लॉगिन',
    register: 'पंजीकरण',
  },
  ta: {
    welcome: 'வரவேற்கிறோம்',
    settings: 'அமைப்புகள்',
    save: 'சேமி',
    cancel: 'ரத்து செய்',
    delete: 'நீக்கு',
    edit: 'திருத்து',
    view: 'பார்',
    dashboard: 'டாஷ்போர்டு',
    orders: 'ஆர்டர்கள்',
    tables: 'டேபிள்கள்',
    menu: 'மெனு',
    profile: 'சுயவிவரம்',
    logout: 'வெளியேறு',
    login: 'உள்நுழை',
    register: 'பதிவு',
  },
  te: {
    welcome: 'స్వాగతం',
    settings: 'సెట్టింగ్లు',
    save: 'సేవ్ చేయి',
    cancel: 'రద్దు చేయి',
    delete: 'తొలగించు',
    edit: 'సవరించు',
    view: 'వీక్షించు',
    dashboard: 'డాష్బోర్డ్',
    orders: 'ఆర్డర్లు',
    tables: 'టేబుల్స్',
    menu: 'మెనూ',
    profile: 'ప్రొఫైల్',
    logout: 'లాగౌట్',
    login: 'లాగిన్',
    register: 'నమోదు',
  },
  bn: {
    welcome: 'স্বাগতম',
    settings: 'সেটিংস',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল করুন',
    delete: 'মুছুন',
    edit: 'সম্পাদনা করুন',
    view: 'দেখুন',
    dashboard: 'ড্যাশবোর্ড',
    orders: 'অর্ডার',
    tables: 'টেবিল',
    menu: 'মেনু',
    profile: 'প্রোফাইল',
    logout: 'লগআউট',
    login: 'লগইন',
    register: 'নিবন্ধন',
  },
};

// ─── Context ──────────────────────────────────────────────────────────
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StaffSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Load Settings on Mount ─────────────────────────────────────────
  useEffect(() => {
    refreshSettings();
  }, []);

  // ─── Apply Settings When They Change ────────────────────────────────
  useEffect(() => {
    if (settings) {
      applySettings(settings);
    }
  }, [settings]);

  // ─── Apply Settings Globally ────────────────────────────────────────
  const applySettings = (newSettings: StaffSettings) => {
    // Apply Theme
    if (newSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply Compact View
    if (newSettings.compactView) {
      document.documentElement.classList.add('compact-view');
    } else {
      document.documentElement.classList.remove('compact-view');
    }

    // Apply Language
    document.documentElement.lang = newSettings.language;

    // Apply Timezone to moment
    moment.tz.setDefault(newSettings.timezone);
  };

  // ─── Refresh Settings from API ──────────────────────────────────────
  const refreshSettings = async () => {
    setLoading(true);
    try {
      const token = staffStorage.getToken();
      if (!token) {
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }

      const response = await staffApi.get('/staff-portal/settings');
      if (response.data.success) {
        setSettings(response.data.data);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  // ─── Update Settings ─────────────────────────────────────────────────
  const updateSettings = async (newSettings: Partial<StaffSettings>) => {
    try {
      const response = await staffApi.put('/staff-portal/settings', {
        ...settings,
        ...newSettings,
      });

      if (response.data.success) {
        setSettings(response.data.data);
        applySettings(response.data.data);
        return;
      }
      throw new Error(response.data.error || 'Failed to update settings');
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  // ─── Date/Time Formatting ────────────────────────────────────────────
  const formatDate = (date: Date | string): string => {
    if (!settings) return new Date(date).toLocaleDateString();
    return moment(date)
      .tz(settings.timezone)
      .format(settings.dateFormat);
  };

  const formatTime = (date: Date | string): string => {
    if (!settings) return new Date(date).toLocaleTimeString();
    const format = settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm';
    return moment(date)
      .tz(settings.timezone)
      .format(format);
  };

  const formatDateTime = (date: Date | string): string => {
    if (!settings) return new Date(date).toLocaleString();
    const timeFormat = settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm';
    const format = `${settings.dateFormat} ${timeFormat}`;
    return moment(date)
      .tz(settings.timezone)
      .format(format);
  };

  const getCurrentTime = (): string => {
    if (!settings) return new Date().toLocaleTimeString();
    const format = settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm';
    return moment()
      .tz(settings.timezone)
      .format(format);
  };

  // ─── Translation Function ────────────────────────────────────────────
  const t = (key: string): string => {
    if (!settings) return key;
    const lang = settings.language || 'en';
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const value: SettingsContextType = {
    settings,
    loading,
    updateSettings,
    refreshSettings,
    formatDate,
    formatTime,
    formatDateTime,
    getCurrentTime,
    t,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}