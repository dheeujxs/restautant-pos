// components/Sidebar.tsx - Complete with Menu Display Integration
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid, FolderOpen, Ruler,
  ChefHat, Beef, FolderTree,
  Pin, PinOff, ChevronRight, LogOut,
  Building2, Table2, Package2, Receipt,
  Timer, User, Settings, Truck,
  Pizza,
  Archive,
  ClipboardList,
  Users, UserCog, Clock, DollarSign, 
  LayoutTemplate, CopyPlus,
  Shield,
  Smartphone,
  QrCode,
  Grid3x3
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import type { LucideIcon } from 'lucide-react';

const COLLAPSED_W = 72;
const EXPANDED_W  = 240;

// Define the nav item type with LucideIcon
interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  iconColor: string;
  children?: {
    icon: LucideIcon;
    label: string;
    href: string;
  }[];
}

// Unique icons for each main menu item
const navItems: NavItem[] = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard', iconColor: '#f97316' },
  { icon: Pizza, label: 'Dishes', href: '/dishes', iconColor: '#f97316' },
  { icon: FolderOpen, label: 'Dishes Categories', href: '/categories', iconColor: '#8b5cf6' },
  { icon: Ruler, label: 'Units', href: '/units', iconColor: '#14b8a6' },
  { icon: Clock, label: 'Attendance', href: '/admin/attendance', iconColor: '#8b5cf6' },
  {
    icon: Package2, label: 'Inventory', href: '/ingredients', iconColor: '#22c55e',
    children: [
      { icon: FolderTree, label: 'Ingredient Categories', href: '/ingredient-categories' },
      { icon: Beef, label: 'Ingredients', href: '/ingredients' },
      { icon: Truck, label: 'Suppliers', href: '/suppliers' },
      { icon: Archive, label: 'Purchase Orders', href: '/purchases' },
    ],
  },
  { icon: Building2, label: 'Floors', href: '/floors', iconColor: '#64748b' },
  { icon: Table2, label: 'Tables', href: '/tables', iconColor: '#0ea5e9' },
  { icon: ClipboardList, label: 'Order List', href: '/orders', iconColor: '#f97316' },
  {
    icon: ChefHat, label: 'Kitchen Portal', href: '/kitchen', iconColor: '#ef4444',
    children: [
      { icon: Timer, label: 'Live Orders', href: '/kitchen' },
      { icon: Users, label: 'Staff Management', href: '/staff' },
      { icon: UserCog, label: 'Add Staff', href: '/staff/new' },
      { icon: Shield, label: 'Roles', href: '/roles' },
    ],
  },
  { icon: Receipt, label: 'Billing', href: '/bills', iconColor: '#10b981' },
  { icon: DollarSign, label: 'Salary', href: '/salary', iconColor: '#22c55e' },
  // Sidebar.tsx - Add Menu Builder

  
  // ✅ Menu Display Section
 
  
  // Template Builder Menu Item
  {
    icon: LayoutTemplate, 
    label: 'Templates', 
    href: '/templates', 
    iconColor: '#8b5cf6',
    children: [
      { icon: LayoutTemplate, label: 'Menu Templates', href: '/templates' },
      { icon: CopyPlus, label: 'Create Template', href: '/templates/new' },
    ],
  },
  { icon: User, label: 'Profile', href: '/profile', iconColor: '#6366f1' },
  { icon: Settings, label: 'Settings', href: '/settings', iconColor: '#f97316' },
];

const accentColors: Record<string, string> = {
  Dashboard: '#f97316',
  Dishes: '#f97316',
  Categories: '#8b5cf6',
  'Course Types': '#ec4899',
  Units: '#14b8a6',
  Inventory: '#22c55e',
  Floors: '#64748b',
  Tables: '#0ea5e9',
  'Order List': '#f97316',
  'New Order': '#f97316',
  'Ready Approvals': '#f59e0b',
  'Kitchen Portal': '#ef4444',
  'Live Orders': '#ef4444',
  'Staff Management': '#8b5cf6',
  'Add Staff': '#8b5cf6',
  Roles: '#ec4899',
  Billing: '#10b981',
  Profile: '#6366f1',
  Settings: '#f97316',
  Templates: '#8b5cf6',
  'Menu Templates': '#8b5cf6',
  'Create Template': '#a78bfa',
  'Menu Display': '#22c55e',
  'View Menu': '#22c55e',
  'Generate QR Code': '#22c55e',
};

const getInitials = (firstName?: string, lastName?: string) => {
  if (!firstName && !lastName) return 'U';
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

// NavIcon component with proper Lucide icon typing
interface NavIconProps {
  icon: LucideIcon;
  color: string;
  active: boolean;
}

function NavIcon({ icon: Icon, color, active }: NavIconProps) {
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

export default function Sidebar() {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const expanded = hovered || pinned;
  
  // Get user from Auth Context
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${expanded ? EXPANDED_W : COLLAPSED_W}px`);
  }, [expanded]);

  // Auto-open submenu when navigating to a child route
  useEffect(() => {
    const path = location.pathname;
    
    if (path.startsWith('/kitchen') || path.startsWith('/staff') || path.startsWith('/roles')) {
      setOpenMenus(prev => ({ ...prev, 'Kitchen Portal': true }));
    }
    if (path.startsWith('/bills') || path.startsWith('/billing')) {
      setOpenMenus(prev => ({ ...prev, 'Billing': true }));
    }
    if (path.startsWith('/orders') || path === '/pos') {
      setOpenMenus(prev => ({ ...prev, 'Order List': true }));
    }
    if (path.startsWith('/dishes')) {
      setOpenMenus(prev => ({ ...prev, 'Dishes': true }));
    }
    if (path.startsWith('/ingredients') || path.startsWith('/suppliers') || path.startsWith('/purchases')) {
      setOpenMenus(prev => ({ ...prev, 'Inventory': true }));
    }
    if (path.startsWith('/tables')) {
      setOpenMenus(prev => ({ ...prev, 'Tables': true }));
    }
    if (path.startsWith('/categories')) {
      setOpenMenus(prev => ({ ...prev, 'Categories': true }));
    }
    if (path.startsWith('/course-types')) {
      setOpenMenus(prev => ({ ...prev, 'Course Types': true }));
    }
    if (path.startsWith('/units')) {
      setOpenMenus(prev => ({ ...prev, 'Units': true }));
    }
    if (path.startsWith('/floors')) {
      setOpenMenus(prev => ({ ...prev, 'Floors': true }));
    }
    // ✅ Auto-open Menu Display
    if (path.startsWith('/menu')) {
      setOpenMenus(prev => ({ ...prev, 'Menu Display': true }));
    }
    // ✅ Auto-open Templates
    if (path.startsWith('/templates')) {
      setOpenMenus(prev => ({ ...prev, 'Templates': true }));
    }
  }, [location.pathname]);

  const toggle = (label: string) =>
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const deepActive = (item: NavItem): boolean => {
    // ✅ Menu Display
    if (item.label === 'Menu Display') {
      return location.pathname.startsWith('/menu');
    }
    if (item.label === 'Billing') {
      return location.pathname.startsWith('/bills') || location.pathname.startsWith('/billing');
    }
    if (item.label === 'Kitchen Portal') {
      return location.pathname.startsWith('/kitchen') || 
             location.pathname.startsWith('/staff') || 
             location.pathname.startsWith('/roles');
    }
    if (item.label === 'Dishes') {
      return location.pathname.startsWith('/dishes');
    }
    if (item.label === 'Inventory') {
      return location.pathname.startsWith('/ingredients') || 
             location.pathname.startsWith('/suppliers') || 
             location.pathname.startsWith('/purchases');
    }
    if (item.label === 'Order List') {
      return location.pathname.startsWith('/orders');
    }
    if (item.label === 'Templates') {
      return location.pathname.startsWith('/templates');
    }
    if (item.label === 'New Order') {
      return location.pathname === '/pos';
    }
    if (item.label === 'Ready Approvals') {
      return location.pathname.startsWith('/approvals');
    }
    if (item.label === 'Tables') {
      return location.pathname.startsWith('/tables');
    }
    if (item.label === 'Categories') {
      return location.pathname.startsWith('/categories');
    }
    if (item.label === 'Course Types') {
      return location.pathname.startsWith('/course-types');
    }
    if (item.label === 'Units') {
      return location.pathname.startsWith('/units');
    }
    if (item.label === 'Floors') {
      return location.pathname.startsWith('/floors');
    }
    // Check if any child route is active
    if (item.children) {
      return item.children.some(c => isActive(c.href));
    }
    return isActive(item.href);
  };

  const userInitials = getInitials(user?.firstName, user?.lastName);
  const userFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User';
  const userEmail = user?.email || 'user@example.com';

  if (isLoading) {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </aside>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideIn  { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        .sb-child-enter { animation: slideIn 0.18s ease both; }
        .sb-submenu { overflow:hidden; transition: max-height 0.28s cubic-bezier(.4,0,.2,1), opacity 0.22s ease; }
        .sb-submenu.open  { max-height: 400px; opacity:1; }
        .sb-submenu.close { max-height: 0;     opacity:0; }
        .sb-item { transition: background 0.18s, color 0.18s, box-shadow 0.18s; }
        .sb-item:hover { background: rgba(249,115,22,0.07); }
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
          background: 'linear-gradient(180deg, #ffffff 0%, #fffbf7 100%)',
          borderRight: '1px solid rgba(249,115,22,0.1)',
          boxShadow: expanded
            ? '4px 0 32px rgba(249,115,22,0.08), 1px 0 0 rgba(249,115,22,0.06)'
            : '2px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Top glow bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #f97316, #ef4444, #f97316)',
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
            background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
          }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: -0.5 }}>A</span>
          </div>
          {expanded && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#1c1917', margin: 0, letterSpacing: '-0.5px' }}>apos</p>
                <p style={{ fontSize: 9, color: '#f97316', margin: 0, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Restaurant POS</p>
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
            Main Menu
          </p>
        )}

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: expanded ? '0 8px' : '0' }}>
          {navItems.map((item) => {
            const color   = accentColors[item.label] || item.iconColor || '#f97316';
            const active  = deepActive(item);
            const isOpen  = openMenus[item.label] || false;
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
                      {item.children!.map((child, ci) => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            className="sb-child-enter"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '7px 10px', borderRadius: 9, textDecoration: 'none',
                              fontSize: 12, fontWeight: childActive ? 700 : 400,
                              color: childActive ? color : '#78716c',
                              background: childActive ? `${color}10` : 'transparent',
                              marginBottom: 1, animationDelay: `${ci * 30}ms`,
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
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.15), transparent)', margin: '8px 12px', flexShrink: 0 }} />

        {/* User footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          padding: expanded ? '10px 14px 16px' : '10px 0 16px',
          justifyContent: expanded ? 'flex-start' : 'center',
        }}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Profile"
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                objectFit: 'cover', border: '2px solid #f97316',
                boxShadow: '0 3px 10px rgba(249,115,22,0.35)',
              }}
            />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 800,
              boxShadow: '0 3px 10px rgba(249,115,22,0.35)',
            }}>
              {userInitials}
            </div>
          )}
          {expanded && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1c1917', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userFullName}
                </p>
                <p style={{ fontSize: 10, color: '#a8a29e', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userEmail}
                </p>
              </div>
              <button
                onClick={logout}
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