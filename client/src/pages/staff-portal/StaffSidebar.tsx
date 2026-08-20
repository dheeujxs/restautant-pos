// pages/staff-portal/StaffSidebar.tsx - COMPLETE FIX

import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Timer, ClipboardList, User,
  LogOut, Pin, PinOff, Clock,
  Settings, Users, Table2, Receipt, Wallet,
  Package, BarChart3,
  CheckCircle, DollarSign, Loader2,
  ShoppingCart, Bike, LayoutDashboard
} from 'lucide-react';
import type { Permission } from '../../types/permissions';
import { PERMISSIONS } from '../../utils/permissions';
import { staffRolePreference } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';

const COLLAPSED_W = 72;
const EXPANDED_W = 240;

// ─── Define menu items with their required permissions ────────────────────
interface MenuItem {
  icon: any;
  label: string;
  href: string;
  permission: Permission;
  iconColor?: string;
  isAlwaysVisible?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  // ─── Dashboard (Always visible) ──────────────────────────────────────
  { 
    icon: LayoutDashboard, 
    label: 'Dashboard', 
    href: '/staff-portal/dashboard', 
    permission: PERMISSIONS.VIEW_LIVE_ORDERS, // Using a permission that all staff should have
    iconColor: '#f97316',
    isAlwaysVisible: true,
  },
  
  // ─── POS / Take Order ────────────────────────────────────────────────
  { 
    icon: ShoppingCart, 
    label: 'Take Order', 
    href: '/staff-portal/pos', 
    permission: PERMISSIONS.VIEW_STAFF_POS,
    iconColor: '#f97316',
  },
  
  // ─── Tables ────────────────────────────────────────────────────────────
  { 
    icon: Table2, 
    label: 'My Tables', 
    href: '/staff-portal/tables', 
    permission: PERMISSIONS.VIEW_TABLES,
    iconColor: '#0ea5e9',
  },
  
  // ─── Bills ─────────────────────────────────────────────────────────────
  { 
    icon: Receipt, 
    label: 'Bills', 
    href: '/staff-portal/bills', 
    permission: PERMISSIONS.VIEW_BILLS,
    iconColor: '#10b981',
  },
  
  // ─── Live Orders ──────────────────────────────────────────────────────
  { 
    icon: Timer, 
    label: 'Live Orders', 
    href: '/staff-portal/orders', 
    permission: PERMISSIONS.VIEW_LIVE_ORDERS,
    iconColor: '#ef4444',
  },
  
  // ─── Ready Orders ─────────────────────────────────────────────────────
  { 
    icon: CheckCircle, 
    label: 'Ready Orders', 
    href: '/staff-portal/ready-orders', 
    permission: PERMISSIONS.VIEW_READY_ORDERS,
    iconColor: '#10b981',
  },
  
  // ─── KOT ───────────────────────────────────────────────────────────────
  { 
    icon: ClipboardList, 
    label: 'KOT', 
    href: '/staff-portal/kot', 
    permission: PERMISSIONS.VIEW_KOT,
    iconColor: '#8b5cf6',
  },
  
  // ─── Inventory ────────────────────────────────────────────────────────
  { 
    icon: Package, 
    label: 'Inventory', 
    href: '/staff-portal/inventory', 
    permission: PERMISSIONS.VIEW_INVENTORY,
    iconColor: '#22c55e',
  },
  
  // ─── Payments ─────────────────────────────────────────────────────────
  { 
    icon: Wallet, 
    label: 'Payments', 
    href: '/staff-portal/payments', 
    permission: PERMISSIONS.PROCESS_PAYMENT,
    iconColor: '#7c3aed',
  },
  
  // ─── Delivery Portal ──────────────────────────────────────────────────
  { 
    icon: Bike, 
    label: 'Delivery Portal', 
    href: '/staff-portal/delivery', 
    permission: PERMISSIONS.VIEW_DELIVERY_DASHBOARD,
    iconColor: '#22c55e',
  },
  
  // ─── Staff Management ─────────────────────────────────────────────────
  { 
    icon: Users, 
    label: 'Staff', 
    href: '/staff-portal/staff', 
    permission: PERMISSIONS.VIEW_STAFF,
    iconColor: '#6366f1',
  },
  
  // ─── Reports ──────────────────────────────────────────────────────────
  { 
    icon: BarChart3, 
    label: 'Reports', 
    href: '/staff-portal/reports', 
    permission: PERMISSIONS.VIEW_REPORTS,
    iconColor: '#f97316',
  },
  
  // ─── Attendance (Always visible) ─────────────────────────────────────
  { 
    icon: Clock, 
    label: 'Attendance', 
    href: '/staff-portal/attendance', 
    permission: PERMISSIONS.VIEW_ATTENDANCE,
    iconColor: '#8b5cf6',
    isAlwaysVisible: true,
  },
  
  // ─── Salary (Always visible) ─────────────────────────────────────────
  { 
    icon: DollarSign, 
    label: 'Salary', 
    href: '/staff-portal/salary', 
    permission: PERMISSIONS.VIEW_SALARY,
    iconColor: '#22c55e',
    isAlwaysVisible: true,
  },
  
  // ─── Profile (Always visible) ─────────────────────────────────────────
  { 
    icon: User, 
    label: 'My Profile', 
    href: '/staff-portal/profile', 
    permission: PERMISSIONS.VIEW_STAFF, // Using a valid permission
    iconColor: '#6366f1',
    isAlwaysVisible: true,
  },
  
  // ─── Settings (Always visible) ────────────────────────────────────────

];

// ─── Colors for each menu item ──────────────────────────────────────────
const accentColors: Record<string, string> = {
  'Dashboard': '#f97316',
  'Take Order': '#f97316',
  'Live Orders': '#ef4444',
  'KOT': '#8b5cf6',
  'Inventory': '#22c55e',
  'Ready Orders': '#10b981',
  'My Tables': '#0ea5e9',
  'Bills': '#10b981',
  'Payments': '#7c3aed',
  'Delivery Portal': '#22c55e',
  'Staff': '#6366f1',
  'Reports': '#f97316',
  'Attendance': '#8b5cf6',
  'Salary': '#22c55e',
  'My Profile': '#6366f1',
  'Settings': '#6b7280',
};

// ─── Normalize a role entry to a plain string ────────────────────────────
const normalizeRoleName = (r: any): string | null => {
  if (typeof r === 'string' && r.trim().length > 0) return r;
  if (r && typeof r === 'object' && typeof r.name === 'string' && r.name.trim().length > 0) return r.name;
  return null;
};

const getRoleDisplay = (role: any): string => {
  const labels: Record<string, string> = {
    chef: '👨‍🍳 Chef',
    cook: '🍳 Cook',
    helper: '🫂 Helper',
    section_chef: '👨‍🍳 Section Chef',
    kot_staff: '📋 KOT Staff',
    waiter: '👨‍💼 Waiter',
    cashier: '💰 Cashier',
    manager: '👔 Manager',
    admin: '👑 Admin',
    delivery_boy: '🚴 Delivery Boy',
    rider: '🚴 Rider',
    driver: '🚗 Driver',
  };
  const name = normalizeRoleName(role) || 'Staff';
  return labels[name.toLowerCase()] || name;
};

const getInitials = (name?: string): string => {
  if (!name) return 'S';
  const nameParts = name.split(' ');
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function StaffSidebar() {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [displayRole, setDisplayRole] = useState<string>('Staff');
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isStaff, isLoading: authLoading, logout } = useAuth();
  const expanded = hovered || pinned;

  // ─── Derive menu/role state from the server-fetched `user` ─────────────
  const computeMenuState = useCallback((userData: any) => {
    console.log('🔍 Computing menu state from user:', userData);
    
    // Get roles
    const rawRoles: any[] =
      userData.allRoles && Array.isArray(userData.allRoles) && userData.allRoles.length > 0
        ? userData.allRoles
        : userData.role
        ? [userData.role]
        : [];

    const roles = [...new Set(rawRoles.map(normalizeRoleName).filter((r): r is string => !!r))];
    const finalRoles = roles.length > 0 ? roles : ['Staff'];

    // ✅ IMPORTANT: Get permissions directly from userData
    // This comes from the server via AuthContext
    const permissions: string[] = Array.isArray(userData.permissions) ? userData.permissions : [];
    
    console.log('📋 Staff permissions:', permissions);

    // Prefer the role the person explicitly switched to via RoleSwitcher
    const preferred = staffRolePreference.get();
    const primaryRole =
      (preferred && finalRoles.includes(preferred) ? preferred : null) ||
      normalizeRoleName(userData.role) ||
      finalRoles[0];

    setDisplayRole(primaryRole);
    setAllRoles(finalRoles);

    // ✅ Filter menu items based on permissions
    const filtered = MENU_ITEMS.filter(item => {
      // Always show items marked as always visible
      if (item.isAlwaysVisible) return true;
      
      // Check if the staff has the required permission
      const hasPermission = permissions.includes(item.permission);
      
      // Debug log for missing permissions
      if (!hasPermission) {
        console.log(`🚫 Staff lacks permission "${item.permission}" for menu item "${item.label}"`);
      }
      
      return hasPermission;
    });

    console.log('📋 Filtered menu items:', filtered.map(item => item.label));
    setFilteredMenuItems(filtered);
  }, []);

  // ─── React to auth state ────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) {
      console.log('⏳ Auth loading...');
      return;
    }

    if (!isStaff || !user) {
      console.log('⚠️ Not staff or no user, showing only always-visible items');
      setFilteredMenuItems(MENU_ITEMS.filter(item => item.isAlwaysVisible));
      setDisplayRole('Staff');
      setAllRoles(['Staff']);
      return;
    }

    console.log('✅ Staff user detected, computing menu...');
    computeMenuState(user);
  }, [user, isStaff, authLoading, computeMenuState]);

  // ─── React to role switches from RoleSwitcher ───────────────────────────
  useEffect(() => {
    const handleRoleChanged = () => {
      if (user) {
        console.log('🔄 Role changed, recomputing menu...');
        computeMenuState(user);
      }
    };
    window.addEventListener('staffRoleChanged', handleRoleChanged);
    return () => window.removeEventListener('staffRoleChanged', handleRoleChanged);
  }, [user, computeMenuState]);

  // ─── Update sidebar width ──────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${expanded ? EXPANDED_W : COLLAPSED_W}px`);
  }, [expanded]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const handleLogout = () => {
    logout();
  };

  const staffName = user?.name || 'Staff';
  const staffRole = getRoleDisplay(displayRole);
  const staffInitials = getInitials(staffName);
  const hasMultipleRoles = allRoles.length > 1;

  if (location.pathname.includes('/login')) {
    return null;
  }

  if (authLoading) {
    return (
      <aside style={{
        position: 'fixed', left: 0, top: 0, height: '100vh', zIndex: 40,
        width: COLLAPSED_W,
        background: '#ffffff',
        borderRight: '1px solid rgba(249,115,22,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </aside>
    );
  }

  // ─── Always show at least always-visible items ─────────────────────────
  const menuItems = filteredMenuItems.length > 0 
    ? filteredMenuItems 
    : MENU_ITEMS.filter(item => item.isAlwaysVisible);

  return (
    <>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        .sb-item { transition: background 0.18s, color 0.18s, box-shadow 0.18s; }
        .sb-item:hover { background: rgba(249,115,22,0.07); }
        .sb-tooltip {
          position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%);
          background: #1c1917; color: #fff; font-size: 11px; font-weight: 600; padding: 5px 10px;
          border-radius: 8px; white-space: nowrap; pointer-events: none; opacity: 0;
          transition: opacity 0.15s; z-index: 999;
        }
        .sb-item-wrap:hover .sb-tooltip { opacity: 1; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'fixed', left: 0, top: 0, height: '100vh', zIndex: 40,
          width: expanded ? EXPANDED_W : COLLAPSED_W,
          transition: 'width 300ms cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, #ffffff 0%, #fffbf7 100%)',
          borderRight: '1px solid rgba(249,115,22,0.1)',
          boxShadow: expanded
            ? '4px 0 32px rgba(249,115,22,0.08), 1px 0 0 rgba(249,115,22,0.06)'
            : '2px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #f97316, #ef4444, #f97316)',
          backgroundSize: '200% 100%',
        }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: expanded ? '20px 16px 16px' : '20px 0 16px',
          justifyContent: expanded ? 'flex-start' : 'center',
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
          }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: -0.5 }}>S</span>
          </div>
          {expanded && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#1c1917', margin: 0, letterSpacing: '-0.5px' }}>apos</p>
                <p style={{ fontSize: 9, color: '#f97316', margin: 0, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Staff Portal</p>
              </div>
              <button
                onClick={() => setPinned(p => !p)}
                style={{
                  width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: pinned ? 'rgba(249,115,22,0.12)' : 'transparent',
                  color: pinned ? '#f97316' : '#d1cdc8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {pinned ? <Pin size={13} /> : <PinOff size={13} />}
              </button>
            </>
          )}
        </div>

        {expanded && (
          <p style={{ fontSize: 9, fontWeight: 800, color: '#c7c3bd', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 16px 8px', flexShrink: 0 }}>
            Staff Menu
          </p>
        )}

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: expanded ? '0 8px' : '0' }}>
          {menuItems.map((item) => {
            const color = accentColors[item.label] || item.iconColor || '#f97316';
            const active = isActive(item.href);
            const IconComponent = item.icon;

            return (
              <div key={item.label} style={{ marginBottom: 2 }}>
                <div className="sb-item-wrap" style={{ position: 'relative' }}>
                  <Link
                    to={item.href}
                    className="sb-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      textDecoration: 'none', borderRadius: 12,
                      padding: expanded ? '9px 10px' : '9px 0',
                      justifyContent: expanded ? 'flex-start' : 'center',
                      background: active ? `linear-gradient(135deg, ${color}18, ${color}08)` : 'transparent',
                      boxShadow: active ? `inset 0 0 0 1px ${color}22` : 'none',
                    }}
                  >
                    <NavIcon icon={IconComponent} color={color} active={active} />
                    {expanded && (
                      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? color : '#57534e', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                  {!expanded && <span className="sb-tooltip">{item.label}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.15), transparent)', margin: '8px 12px', flexShrink: 0 }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          padding: expanded ? '10px 14px 16px' : '10px 0 16px',
          justifyContent: expanded ? 'flex-start' : 'center',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 800,
            boxShadow: '0 3px 10px rgba(249,115,22,0.35)',
          }}>
            {staffInitials}
          </div>
          {expanded && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1c1917', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {staffName}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 10, color: '#a8a29e', margin: 0, whiteSpace: 'nowrap' }}>
                    {staffRole}
                  </p>
                  {hasMultipleRoles && (
                    <span 
                      style={{ 
                        fontSize: 8, 
                        background: '#f97316', 
                        color: '#fff', 
                        padding: '1px 6px', 
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                      title={`All Roles: ${allRoles.join(', ')}`}
                    >
                      +{allRoles.length - 1}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid #fee2e2',
                  background: '#fef2f2', color: '#ef4444', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}
              >
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}




function NavIcon({ icon: Icon, color, active }: { icon: any; color: string; active: boolean }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? color : `${color}14`,
      boxShadow: active ? `0 4px 12px ${color}40` : 'none',
      transition: 'all 0.22s ease',
    }}>
      <Icon size={15} color={active ? '#fff' : color} />
    </div>
  );
}