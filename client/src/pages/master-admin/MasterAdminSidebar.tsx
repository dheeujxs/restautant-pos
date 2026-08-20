// components/master-admin/MasterAdminSidebar.tsx - LIGHT THEME (SAME AS SUPER ADMIN)

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Crown,
  Building2,
  Users,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  Pin,
  PinOff,
  ChevronRight,
  BarChart3,
  ShoppingBag,
  UserCog,
  Award,
  Bell,
  CreditCard,
  TrendingUp,
  Store,
  MapPin,
  User,
  Shield,
  Activity,
  ClipboardList,
  Globe,
  Lock,
  Key,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../utils/AuthContext';

const COLLAPSED_W = 72;
const EXPANDED_W = 260;

// ─── Master Admin Nav Items ────────────────────────────────────────────────
const navItems = [
  {
    icon: LayoutGrid,
    label: 'Dashboard',
    href: '/master-admin/dashboard',
    iconColor: '#f59e0b'
  },
  {
    icon: Shield,
    label: 'Super Admins',
    href: '/master-admin/super-admins',
    iconColor: '#8b5cf6',
    children: [
      { icon: Users, label: 'All Super Admins', href: '/master-admin/super-admins' },
      { icon: UserCog, label: 'Create Super Admin', href: '/master-admin/super-admins/new' },
    ]
  },
  {
    icon: Store,
    label: 'Restaurants',
    href: '/master-admin/restaurants',
    iconColor: '#f97316',
    children: [
      { icon: Building2, label: 'All Restaurants', href: '/master-admin/restaurants' },
      { icon: MapPin, label: 'All Branches', href: '/master-admin/branches' },
    ]
  },
  {
    icon: ClipboardList,
    label: 'Orders',
    href: '/master-admin/orders',
    iconColor: '#8b5cf6',
  },
  {
    icon: CreditCard,
    label: 'Payments',
    href: '/master-admin/payments',
    iconColor: '#14b8a6',
  },
  {
    icon: TrendingUp,
    label: 'Revenue',
    href: '/master-admin/revenue',
    iconColor: '#10b981',
  },
  {
    icon: BarChart3,
    label: 'Reports',
    href: '/master-admin/reports',
    iconColor: '#ec4899',
  },
  {
    icon: Activity,
    label: 'Audit Logs',
    href: '/master-admin/audit',
    iconColor: '#6366f1',
  },
  {
    icon: User,
    label: 'Profile',
    href: '/master-admin/profile',
    iconColor: '#8b5cf6',
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/master-admin/settings',
    iconColor: '#6b7280',
    children: [
      { icon: Globe, label: 'General', href: '/master-admin/settings/general' },
      { icon: Lock, label: 'Security', href: '/master-admin/settings/security' },
      { icon: Key, label: 'API Keys', href: '/master-admin/settings/api' },
    ]
  },
];

// ─── Accent Colors ──────────────────────────────────────────────────────────
const accentColors: Record<string, string> = {
  Dashboard: '#f59e0b',
  'Super Admins': '#8b5cf6',
  Restaurants: '#f97316',
  Orders: '#8b5cf6',
  Payments: '#14b8a6',
  Revenue: '#10b981',
  Reports: '#ec4899',
  'Audit Logs': '#6366f1',
  Profile: '#8b5cf6',
  Settings: '#6b7280',
};

export default function MasterAdminSidebar() {
  const navigate = useNavigate();
  const { user, logout, isMasterAdmin } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const expanded = hovered || pinned;

  console.log('👑 MasterAdminSidebar - user:', user);
  console.log('👑 MasterAdminSidebar - isMasterAdmin:', isMasterAdmin);

  // Auto-open submenus based on current route
  useEffect(() => {
    const path = location.pathname;
    const menuMap: Record<string, string[]> = {
      'Super Admins': ['/master-admin/super-admins'],
      'Restaurants': ['/master-admin/restaurants', '/master-admin/branches'],
      'Orders': ['/master-admin/orders'],
      'Payments': ['/master-admin/payments'],
      'Revenue': ['/master-admin/revenue'],
      'Reports': ['/master-admin/reports'],
      'Audit Logs': ['/master-admin/audit'],
      'Profile': ['/master-admin/profile'],
      'Settings': ['/master-admin/settings'],
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
    if (!firstName && !lastName) return 'MA';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleLogout = async () => {
    try {
      console.log('👑 MasterAdminSidebar: Logging out...');
      await logout();
      toast.success('Logged out successfully');
      navigate('/master-admin/login');
    } catch (error) {
      console.error('❌ MasterAdminSidebar logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const adminInitials = getInitials(user?.firstName, user?.lastName);
  const adminFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Master Admin';
  const adminEmail = user?.email || 'master@apos.com';
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
        .sb-item:hover { background: rgba(245,158,11,0.1); }
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
          borderRight: '1px solid rgba(245,158,11,0.1)',
          boxShadow: expanded
            ? '4px 0 32px rgba(245,158,11,0.08), 1px 0 0 rgba(245,158,11,0.06)'
            : '2px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Top glow bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #f59e0b, #d97706, #f59e0b)',
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
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
          }}>
            <Crown size={18} color="#fff" />
          </div>
          {expanded && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#1c1917', margin: 0, letterSpacing: '-0.5px' }}>apos</p>
                <p style={{ fontSize: 8, color: '#f59e0b', margin: 0, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Master Admin</p>
              </div>
              <button
                onClick={() => setPinned(p => !p)}
                style={{
                  width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: pinned ? 'rgba(245,158,11,0.12)' : 'transparent',
                  color: pinned ? '#f59e0b' : '#d1cdc8',
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
            Platform Management
          </p>
        )}

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: expanded ? '0 8px' : '0' }}>
          {navItems.map((item) => {
            const color = accentColors[item.label] || item.iconColor || '#f59e0b';
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
                        background: active ? `rgba(245,158,11,0.12)` : 'transparent',
                        boxShadow: active ? `inset 0 0 0 1px rgba(245,158,11,0.2)` : 'none',
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
                        background: active ? `rgba(245,158,11,0.12)` : 'transparent',
                        boxShadow: active ? `inset 0 0 0 1px rgba(245,158,11,0.2)` : 'none',
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
                    <div style={{ marginLeft: 14, marginTop: 2, marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid rgba(245,158,11,0.25)` }}>
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
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)', margin: '8px 12px', flexShrink: 0 }} />

        {/* User footer */}
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
                objectFit: 'cover', border: '2px solid #f59e0b',
                boxShadow: '0 3px 10px rgba(245,158,11,0.35)',
              }}
            />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 800,
              boxShadow: '0 3px 10px rgba(245,158,11,0.35)',
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
                  width: 30, height: 30, borderRadius: 8, border: '1px solid #fef3c7',
                  background: '#fef3c7', color: '#d97706', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fde68a';
                  e.currentTarget.style.color = '#b45309';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fef3c7';
                  e.currentTarget.style.color = '#d97706';
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