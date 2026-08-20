// src/components/RoleSwitcher.tsx - reads roles from AuthContext, persists only the selection

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Users, RefreshCw } from 'lucide-react';
import { staffRolePreference } from '../utils/storage';
import { useAuth } from '../utils/AuthContext';
import toast from 'react-hot-toast';

interface Role {
  name: string;
  displayName: string;
  icon: string;
  color?: string;
}

interface RoleSwitcherProps {
  onRoleChange?: (role: string) => void;
  className?: string;
}

// ✅ Role display mapping with icons and colors
const ROLE_DISPLAY: Record<string, { displayName: string; icon: string; color: string }> = {
  admin: { displayName: '👑 Admin', icon: '👑', color: '#8B5CF6' },
  manager: { displayName: '👔 Manager', icon: '👔', color: '#3B82F6' },
  chef: { displayName: '👨‍🍳 Chef', icon: '👨‍🍳', color: '#EF4444' },
  cook: { displayName: '🍳 Cook', icon: '🍳', color: '#F59E0B' },
  section_chef: { displayName: '👨‍🍳 Section Chef', icon: '👨‍🍳', color: '#10B981' },
  kot_staff: { displayName: '📋 KOT Staff', icon: '📋', color: '#8B5CF6' },
  waiter: { displayName: '👨‍💼 Waiter', icon: '👨‍💼', color: '#06B6D4' },
  cashier: { displayName: '💰 Cashier', icon: '💰', color: '#22C55E' },
  helper: { displayName: '🫂 Helper', icon: '🫂', color: '#F97316' },
  staff: { displayName: '👤 Staff', icon: '👤', color: '#6B7280' },
};

// ─── Normalize a role entry to a plain string ────────────────────────────
// Roles can come back from the API as a plain string ("chef") OR as a
// populated object ({ name: "chef", ... }). This was the actual root
// cause of the crash: `user.role` / entries of `user.allRoles` were
// sometimes objects, and getRoleDisplay() called `.toLowerCase()`
// directly on whatever it was given, assuming it was always a string.
const normalizeRoleName = (r: any): string => {
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object' && typeof r.name === 'string') return r.name;
  return '';
};

const getRoleDisplay = (roleName: any): { displayName: string; icon: string; color: string } => {
  const name = normalizeRoleName(roleName);
  const lower = name.toLowerCase();
  return ROLE_DISPLAY[lower] || { displayName: name || 'Staff', icon: '👤', color: '#6B7280' };
};

export default function RoleSwitcher({ onRoleChange, className = '' }: RoleSwitcherProps) {
  const { user, isStaff } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Derive available roles straight from the server-fetched user ─────
  // Every entry is normalized to a string up front, so nothing downstream
  // (Set dedup, .toLowerCase(), localStorage comparisons, React keys) ever
  // has to guess at the shape again.
  const availableRoles: Role[] = (() => {
    if (!isStaff || !user) return [];

    const rawRoles: any[] =
      user.allRoles && user.allRoles.length > 0
        ? user.allRoles
        : user.role
        ? [user.role]
        : ['Staff'];

    const roleNames = [
      ...new Set(
        rawRoles
          .map(normalizeRoleName)
          .filter((name): name is string => name.length > 0)
      ),
    ];

    const finalNames = roleNames.length > 0 ? roleNames : ['Staff'];

    return finalNames.map((roleName) => {
      const display = getRoleDisplay(roleName);
      return { name: roleName, displayName: display.displayName, icon: display.icon, color: display.color };
    });
  })();

  // ─── Pick the active role: saved preference (if still valid) → server role ──
  useEffect(() => {
    if (availableRoles.length === 0) {
      setCurrentRole('');
      return;
    }

    const saved = staffRolePreference.get();
    const savedIsValid = saved && availableRoles.some((r) => r.name === saved);

    setCurrentRole(savedIsValid ? (saved as string) : availableRoles[0].name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isStaff]);

  // ─── Switch Role ──────────────────────────────────────────────────────
  const switchRole = (roleName: string) => {
    if (roleName === currentRole) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    staffRolePreference.set(roleName);
    setCurrentRole(roleName);
    setIsOpen(false);

    const display = getRoleDisplay(roleName);
    toast.success(`🔄 Switched to ${display.displayName}`, { duration: 2000, icon: '🔄' });

    onRoleChange?.(roleName);
    setIsLoading(false);
  };

  // ─── Close dropdown on click outside ─────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (availableRoles.length <= 1) {
    return null;
  }

  const currentDisplay = getRoleDisplay(currentRole);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm shadow-sm min-w-[140px]"
        style={{ borderColor: currentDisplay.color }}
      >
        {isLoading ? (
          <RefreshCw size={16} className="animate-spin text-gray-400" />
        ) : (
          <>
            <span className="text-base">{currentDisplay.icon}</span>
            <span className="font-medium text-gray-700 flex-1 text-left truncate">
              {currentDisplay.displayName}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {isOpen && !isLoading && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Users size={14} className="text-orange-500" />
              Switch Role
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Select a role to switch to</p>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {availableRoles.map((role) => {
              const isActive = role.name === currentRole;
              const display = getRoleDisplay(role.name);

              return (
                <button
                  key={role.name}
                  onClick={() => switchRole(role.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-all text-left border-l-2 ${
                    isActive ? 'border-orange-500 bg-orange-50/50' : 'border-transparent'
                  }`}
                >
                  <span className="text-xl">{display.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-orange-600' : 'text-gray-700'}`}>
                      {display.displayName}
                    </p>
                    <p className="text-xs text-gray-400 capitalize truncate">{role.name}</p>
                  </div>
                  {isActive && <Check size={16} className="text-orange-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 text-center">
              {availableRoles.length} role{availableRoles.length > 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      )}
    </div>
  );
}