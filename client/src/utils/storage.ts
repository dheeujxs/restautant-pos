// utils/storage.ts - SINGLE SOURCE OF TRUTH
// Staff token in sessionStorage (expires on tab close)
// Admin & SuperAdmin tokens in localStorage (persistent)

function createTokenStorage(key: string, useSession: boolean = false) {
  return {
    getToken(): string | null {
      // If useSession is true, only check sessionStorage
      if (useSession) {
        return sessionStorage.getItem(key);
      }
      // Otherwise check localStorage first, then sessionStorage
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    },

    setToken(token: string, rememberMe: boolean = true): void {
      if (!token) return;
      
      // Clear both storages first
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
      
      if (useSession) {
        // Staff token: always store in sessionStorage
        sessionStorage.setItem(key, token);
      } else {
        // Admin/SuperAdmin: store based on rememberMe
        if (rememberMe) {
          localStorage.setItem(key, token);
        } else {
          sessionStorage.setItem(key, token);
        }
      }
    },

    clear(): void {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    },

    isLoggedIn(): boolean {
      return !!(localStorage.getItem(key) || sessionStorage.getItem(key));
    },

    debug(): void {
      console.log(`=== ${key} DEBUG ===`);
      console.log('Present:', this.isLoggedIn());
      console.log('Location:', localStorage.getItem(key) ? 'localStorage' : sessionStorage.getItem(key) ? 'sessionStorage' : 'none');
    },
  };
}

// ─── One storage instance per portal ─────────────────────────────────────
// ✅ Staff token: sessionStorage only (expires on tab close)
export const staffStorage = createTokenStorage('staffToken', true);
// ✅ Admin & SuperAdmin: localStorage (persistent)
export const adminStorage = createTokenStorage('adminToken', false);
export const superAdminStorage = createTokenStorage('superAdminToken', false);

// ─── Staff role preference ──────────────────────────────────────────────
const ROLE_PREF_KEY = 'staffCurrentRole';

export const staffRolePreference = {
  get(): string | null {
    return localStorage.getItem(ROLE_PREF_KEY);
  },
  set(role: string): void {
    if (!role) return;
    localStorage.setItem(ROLE_PREF_KEY, role);
    window.dispatchEvent(new CustomEvent('staffRoleChanged', { detail: { role } }));
  },
  clear(): void {
    localStorage.removeItem(ROLE_PREF_KEY);
  },
};

// Backward-compatible default export
export default staffStorage;