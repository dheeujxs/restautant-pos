// components/super-admin/SuperAdminSidebar.tsx - FIXED VERSION

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, 
  Shield, 
  Building2, 
  Users, 
  DollarSign, 
  FileText, 
  Settings, 
  LogOut, 
  Pin, 
  PinOff, 
  ChevronRight,
  Home, 
  BarChart3, 
  ShoppingBag, 
  Package, 
  Truck, 
  ClipboardList, 
  UserCog, 
  Crown, 
  Award, 
  Bell, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  PieChart,
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  UserPlus,
  Edit, 
  Trash, 
  Eye, 
  Download, 
  Upload, 
  RefreshCw,
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter, 
  Search, 
  Plus, 
  Minus, 
  Menu, 
  X,
  Globe, 
  Lock, 
  Key, 
  ShieldCheck, 
  UserCheck,
  Users as UsersIcon, 
  Star, 
  Heart, 
  Zap, 
  Sparkles,
  Crown as CrownIcon, 
  Gift, 
  Coffee, 
  Utensils,
  Pizza, 
  Salad, 
  Cake, 
  Beer, 
  Wine, 
  CoffeeIcon,
  Activity,
  Building,
  FolderTree,
  User,
  Grid3x3,
  PlusCircle,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
// ✅ CHANGE: Use AuthContext instead of useSuperAdminAuth
import { useAuth } from '../../utils/AuthContext';

const COLLAPSED_W = 72;
const EXPANDED_W = 260;

// ─── Super Admin Nav Items ────────────────────────────────────────────────
const navItems = [
  // Dashboard
  { 
    icon: LayoutGrid, 
    label: 'Dashboard', 
    href: '/super-admin/dashboard', 
    iconColor: '#8b5cf6' 
  },

  // Restaurant Management
  {
    icon: Store,
    label: 'Restaurants',
    href: '/super-admin/restaurants',
    iconColor: '#f97316',
    children: [
      { icon: Building2, label: 'All Restaurants', href: '/super-admin/restaurants' },
      { icon: MapPin, label: 'Manage Branches', href: '/super-admin/branches' },
    ]
  },

  // Dishes Management
  {
    icon: Utensils,
    label: 'Dishes',
    href: '/super-admin/dishes',
    iconColor: '#8b5cf6',
    children: [
      { icon: List, label: 'All Dishes', href: '/super-admin/dishes' },
      { icon: PlusCircle, label: 'Add Dish', href: '/super-admin/dishes/new' },
    ]
  },

  // Orders (All Restaurants)
  {
    icon: ClipboardList,
    label: 'Orders',
    href: '/super-admin/orders',
    iconColor: '#8b5cf6',
  },

  // Admins Management
  {
    icon: Users,
    label: 'Admins',
    href: '/super-admin/admins',
    iconColor: '#8b5cf6',
  },

  // Revenue & Analytics
  {
    icon: TrendingUp,
    label: 'Revenue',
    href: '/super-admin/revenue',
    iconColor: '#10b981',
  },

  // Payments & Payouts
  {
    icon: FileText,
    label: 'Payments',
    href: '/super-admin/payments',
    iconColor: '#14b8a6',
  },

  // Staff Management (All Restaurants)
  {
    icon: UsersIcon,
    label: 'Staff',
    href: '/super-admin/staff',
    iconColor: '#8b5cf6',
  },

  // Reports
  {
    icon: BarChart3,
    label: 'Reports',
    href: '/super-admin/reports',
    iconColor: '#ec4899',
  },

  // Profile
  {
    icon: User,
    label: 'Profile',
    href: '/super-admin/profile',
    iconColor: '#8b5cf6',
  },

  // Settings
  {
    icon: Settings,
    label: 'Settings',
    href: '/super-admin/settings',
    iconColor: '#6b7280',
    children: [
      { icon: Globe, label: 'General', href: '/super-admin/settings/general' },
      { icon: Lock, label: 'Security', href: '/super-admin/settings/security' },
      { icon: Key, label: 'API Keys', href: '/super-admin/settings/api' },
    ]
  },
];

// ─── Accent Colors ──────────────────────────────────────────────────────────
const accentColors: Record<string, string> = {
  Dashboard: '#8b5cf6',
  Restaurants: '#f97316',
  Dishes: '#8b5cf6',
  Orders: '#8b5cf6',
  Admins: '#8b5cf6',
  Revenue: '#10b981',
  Payments: '#14b8a6',
  Subscriptions: '#6366f1',
  Staff: '#8b5cf6',
  Reports: '#ec4899',
  'Audit Logs': '#6366f1',
  Notifications: '#f59e0b',
  Profile: '#8b5cf6',
  Settings: '#6b7280',
};

export default function SuperAdminSidebar() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();
  
  // ✅ FIXED: Use useAuth from AuthContext
  const { user, logout, isSuperAdmin } = useAuth();
  
  const expanded = hovered || pinned;

  // Debug: Log user data
  console.log('🔍 SuperAdminSidebar - user:', user);
  console.log('🔍 SuperAdminSidebar - isSuperAdmin:', isSuperAdmin);

  // Auto-open submenus based on current route
  useEffect(() => {
    const path = location.pathname;
    const menuMap: Record<string, string[]> = {
      'Restaurants': ['/super-admin/restaurants', '/super-admin/branches'],
      'Dishes': ['/super-admin/dishes', '/super-admin/dishes/new'],
      'Orders': ['/super-admin/orders'],
      'Admins': ['/super-admin/admins', '/super-admin/admins/assign'],
      'Revenue': ['/super-admin/revenue'],
      'Payments': ['/super-admin/payments'],
      'Subscriptions': ['/super-admin/subscriptions'],
      'Staff': ['/super-admin/staff'],
      'Reports': ['/super-admin/reports'],
      'Audit Logs': ['/super-admin/audit'],
      'Notifications': ['/super-admin/notifications'],
      'Profile': ['/super-admin/profile'],
      'Settings': ['/super-admin/settings'],
    };

    for (const [menu, paths] of Object.entries(menuMap)) {
      if (paths.some(p => path.startsWith(p))) {
        setOpenMenus(prev => ({ ...prev, [menu]: true }));
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${expanded ? EXPANDED_W : COLLAPSED_W}px`);
  }, [expanded]);

  const toggle = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const deepActive = (item: typeof navItems[0]) => {
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return isActive(item.href);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'SA';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // ─── Handle logout ──────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      console.log('🔒 Sidebar: Logging out...');
      await logout();
      toast.success('Logged out successfully');
      navigate('/super-admin/login');
    } catch (error) {
      console.error('❌ Sidebar logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // ✅ FIXED: Get user data from the user object
  const adminInitials = getInitials(user?.firstName, user?.lastName);
  const adminFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Super Admin';
  const adminEmail = user?.email || 'admin@apos.com';
  const profileImage = user?.avatar || user?.profileImage || '';

  return (
    <>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        .sb-child-enter { animation: slideIn 0.18s ease both; }
        .sb-submenu { overflow:hidden; transition: max-height 0.28s cubic-bezier(.4,0,.2,1), opacity 0.22s ease; }
        .sb-submenu.open { max-height: 600px; opacity:1; }
        .sb-submenu.close { max-height: 0; opacity:0; }
        .sb-item { transition: background 0.18s, color 0.18s, box-shadow 0.18s; }
        .sb-item:hover { background: rgba(139,92,246,0.07); }
        .sb-tooltip {
          position:absolute; left: calc(100% + 10px); top:50%; transform:translateY(-50%);
          background:#1c1917; color:#fff; font-size:11px; font-weight:600; padding:5px 10px;
          border-radius:8px; white-space:nowrap; pointer-events:none; opacity:0;
          transition:opacity 0.15s; z-index:999;
        }
        .sb-item-wrap:hover .sb-tooltip { opacity:1; }
        ::-webkit-scrollbar { width:0px; }
      `}</style>

      {/* Spacer */}
      <div style={{ flexShrink: 0, transition: 'width 300ms ease', width: expanded ? EXPANDED_W : COLLAPSED_W }} />

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'fixed', left: 0, top: 0, height: '100vh', zIndex: 40,
          width: expanded ? EXPANDED_W : COLLAPSED_W,
          transition: 'width 300ms cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, #ffffff 0%, #faf9f7 100%)',
          borderRight: '1px solid rgba(139,92,246,0.1)',
          boxShadow: expanded
            ? '4px 0 32px rgba(139,92,246,0.08), 1px 0 0 rgba(139,92,246,0.06)'
            : '2px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Top glow bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #8b5cf6, #7c3aed, #8b5cf6)',
          backgroundSize: '200% 100%',
        }} />

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: expanded ? '20px 16px 16px' : '20px 0 16px',
          justifyContent: expanded ? 'flex-start' : 'center',
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(139,92,246,0.4)',
          }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: -0.5 }}>S</span>
          </div>
          {expanded && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#1c1917', margin: 0, letterSpacing: '-0.5px' }}>apos</p>
                <p style={{ fontSize: 8, color: '#8b5cf6', margin: 0, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Super Admin</p>
              </div>
              <button
                onClick={() => setPinned(p => !p)}
                style={{
                  width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: pinned ? 'rgba(139,92,246,0.12)' : 'transparent',
                  color: pinned ? '#8b5cf6' : '#d1cdc8',
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
            Super Admin Panel
          </p>
        )}

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: expanded ? '0 8px' : '0' }}>
          {navItems.map((item) => {
            const color = accentColors[item.label] || item.iconColor || '#8b5cf6';
            const active = deepActive(item);
            const isOpen = openMenus[item.label];
            const hasKids = !!item.children?.length;
            const IconComponent = item.icon;

            return (
              <div key={item.label} style={{ marginBottom: 2 }}>
                <div className="sb-item-wrap" style={{ position: 'relative' }}>
                  {hasKids ? (
                    <button
                      onClick={() => expanded && toggle(item.label)}
                      className="sb-item"
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        gap: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                        borderRadius: 12, padding: expanded ? '9px 10px' : '9px 0',
                        justifyContent: expanded ? 'flex-start' : 'center',
                        background: active ? `linear-gradient(135deg, ${color}18, ${color}08)` : 'transparent',
                        boxShadow: active ? `inset 0 0 0 1px ${color}22` : 'none',
                      }}
                    >
                      <NavIcon icon={IconComponent} color={color} active={active} />
                      {expanded && (
                        <>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? color : '#57534e', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </span>
                          <ChevronRight size={13} color={active ? color : '#c7c3bd'}
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.22s ease', flexShrink: 0 }} />
                        </>
                      )}
                    </button>
                  ) : (
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
                  )}
                  {!expanded && <span className="sb-tooltip">{item.label}</span>}
                </div>

                {hasKids && expanded && (
                  <div className={`sb-submenu ${isOpen ? 'open' : 'close'}`}>
                    <div style={{ marginLeft: 14, marginTop: 2, marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid ${color}30` }}>
                      {item.children.map((child) => {
                        const childActive = isActive(child.href);
                        const uniqueKey = `${item.label}-${child.href}`;
                        return (
                          <Link
                            key={uniqueKey}
                            to={child.href}
                            className="sb-child-enter"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '7px 10px', borderRadius: 9, textDecoration: 'none',
                              fontSize: 12, fontWeight: childActive ? 700 : 400,
                              color: childActive ? color : '#78716c',
                              background: childActive ? `${color}10` : 'transparent',
                              marginBottom: 1,
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >
                            <child.icon size={13} />
                            <span style={{ whiteSpace: 'nowrap' }}>{child.label}</span>
                            {childActive && (
                              <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.15), transparent)', margin: '8px 12px', flexShrink: 0 }} />

        {/* User footer with working logout */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          padding: expanded ? '10px 14px 16px' : '10px 0 16px',
          justifyContent: expanded ? 'flex-start' : 'center',
        }}>
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                objectFit: 'cover', border: '2px solid #8b5cf6',
                boxShadow: '0 3px 10px rgba(139,92,246,0.35)',
              }}
            />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 800,
              boxShadow: '0 3px 10px rgba(139,92,246,0.35)',
            }}>
              {adminInitials}
            </div>
          )}
          {expanded && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1c1917', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {adminFullName}
                </p>
                <p style={{ fontSize: 10, color: '#a8a29e', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {adminEmail}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid #ede9fe',
                  background: '#ede9fe', color: '#7c3aed', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3e8ff';
                  e.currentTarget.style.color = '#6d28d9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ede9fe';
                  e.currentTarget.style.color = '#7c3aed';
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