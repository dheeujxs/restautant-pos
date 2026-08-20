// utils/storage.ts - COMPLETE FIXED VERSION

export const staffStorage = {
  getTabId: (): string => {
    let tabId = sessionStorage.getItem('staffTabId');
    if (!tabId) {
      tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      sessionStorage.setItem('staffTabId', tabId);
    }
    return tabId;
  },

  getToken: (): string | null => {
    // ✅ Try multiple sources
    const token = sessionStorage.getItem('staffToken') || localStorage.getItem('staffToken');
    console.log('🔍 staffStorage.getToken() returning:', token ? '✅ Present' : '❌ Missing');
    return token;
  },

  setToken: (token: string): void => {
    console.log('📝 staffStorage.setToken() called with token:', token ? '✅ Present' : '❌ Missing');
    sessionStorage.setItem('staffToken', token);
    localStorage.setItem('staffToken', token);
    // ✅ Also set authType
    sessionStorage.setItem('authType', 'staff');
  },

  getData: (): any | null => {
    const data = sessionStorage.getItem('staffData');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse staffData:', e);
        return null;
      }
    }
    return null;
  },

  setData: (data: any): void => {
    console.log('📝 staffStorage.setData() called');
    sessionStorage.setItem('staffData', JSON.stringify(data));
  },

  // ✅ ADD THIS - Clear all staff data
  clear: (): void => {
    console.log('🧹 staffStorage.clear() called');
    sessionStorage.removeItem('staffToken');
    localStorage.removeItem('staffToken');
    sessionStorage.removeItem('staffData');
    sessionStorage.removeItem('staffTabId');
    sessionStorage.removeItem('authType');
    // ✅ Also remove from localStorage
    localStorage.removeItem('staffData');
  },

  // ✅ Alias for clear (for backward compatibility)
  clearAll: (): void => {
    staffStorage.clear();
  }
};

// ✅ Add to window for global access
declare global {
  interface Window {
    staffStorage: typeof staffStorage;
  }
}

// Initialize
if (typeof window !== 'undefined') {
  window.staffStorage = staffStorage;
}

// ✅ Also export as default for convenience
export default staffStorage;