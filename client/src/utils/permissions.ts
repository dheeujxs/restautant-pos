// src/utils/permissions.ts

// ✅ Backend-aligned PERMISSIONS
export const PERMISSIONS = {
  // Orders
  VIEW_LIVE_ORDERS: 'view_live_orders',
  VIEW_ORDER_DETAILS: 'view_order_details',
  VIEW_READY_ORDERS: 'view_ready_orders',
  ACKNOWLEDGE_ORDER: 'acknowledge_order',
  START_COOKING: 'start_cooking',
  REQUEST_READY: 'request_ready',
  APPROVE_READY: 'approve_ready',
  REJECT_READY: 'reject_ready',
  COMPLETE_ORDER: 'complete_order',
  UPDATE_ORDER_STATUS: 'update_order_status',

  // Recipes
  VIEW_RECIPES: 'view_recipes',

  VIEW_BILLS: 'view_bills',

  // KOT
  VIEW_KOT: 'view_kot',
  CREATE_KOT: 'create_kot',
  UPDATE_KOT: 'update_kot',
  PRINT_KOT: 'print_kot',

  // Tables
  VIEW_TABLES: 'view_tables',
  ASSIGN_TABLE: 'assign_table',
  REQUEST_BILL: 'request_bill',

  // Payments
  VIEW_PAYMENTS: 'view_payments',
  PROCESS_PAYMENT: 'process_payment',
  ISSUE_REFUND: 'issue_refund',

  // Inventory
  VIEW_INVENTORY: 'view_inventory',
  UPDATE_INVENTORY: 'update_inventory',

  // Staff
  VIEW_STAFF: 'view_staff',
  MANAGE_STAFF: 'manage_staff',
  VIEW_ROLES: 'view_roles',
  MANAGE_ROLES: 'manage_roles',

  // Reports
  VIEW_REPORTS: 'view_reports',

  // Staff POS
  VIEW_STAFF_POS: 'view_staff_pos',

  // ✅ Salary - Everyone can view their own salary
  VIEW_SALARY: 'view_salary',

  // ✅ Attendance - Everyone can view their own attendance
  VIEW_ATTENDANCE: 'view_attendance',

  // ✅ DELIVERY PERMISSIONS
  VIEW_DELIVERY_DASHBOARD: 'view_delivery_dashboard',
  VIEW_DELIVERY_ORDERS: 'view_delivery_orders',
  ACCEPT_DELIVERY_ORDER: 'accept_delivery_order',
  REJECT_DELIVERY_ORDER: 'reject_delivery_order',
  VIEW_DELIVERY_ORDER_DETAILS: 'view_delivery_order_details',
  UPDATE_DELIVERY_STATUS: 'update_delivery_status',
  MARK_PICKED_UP: 'mark_picked_up',
  MARK_IN_TRANSIT: 'mark_in_transit',
  MARK_DELIVERED: 'mark_delivered',
  VIEW_DELIVERY_EARNINGS: 'view_delivery_earnings',
  VIEW_DELIVERY_HISTORY: 'view_delivery_history',
  CALL_CUSTOMER: 'call_customer',
  NAVIGATE_TO_LOCATION: 'navigate_to_location',
  TOGGLE_AVAILABILITY: 'toggle_availability',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

// ============================================================================
// Permission helpers
// ============================================================================

export const hasPermission = (
  staffPermissions: Permission[] = [],
  permission: Permission | 'view_dashboard' | 'view_stats'
): boolean => {
  if (permission === 'view_dashboard' || permission === 'view_stats') {
    return true;
  }
  if (!Array.isArray(staffPermissions)) return false;
  return staffPermissions.includes(permission as Permission);
};

export const hasAnyPermission = (
  staffPermissions: Permission[] = [],
  permissions: (Permission | 'view_dashboard' | 'view_stats')[]
): boolean => {
  if (!Array.isArray(staffPermissions)) return false;
  return permissions.some(p => {
    if (p === 'view_dashboard' || p === 'view_stats') return true;
    return staffPermissions.includes(p as Permission);
  });
};

export const hasAllPermissions = (
  staffPermissions: Permission[] = [],
  permissions: (Permission | 'view_dashboard' | 'view_stats')[]
): boolean => {
  if (!Array.isArray(staffPermissions)) return false;
  return permissions.every(p => {
    if (p === 'view_dashboard' || p === 'view_stats') return true;
    return staffPermissions.includes(p as Permission);
  });
};

// ============================================================================
// Role type checks
// ============================================================================

export const isKitchenRole = (role: string): boolean => {
  const kitchenRoles = ['chef', 'cook', 'helper', 'section_chef', 'kot_staff'];
  return kitchenRoles.includes(role?.toLowerCase());
};

export const isFrontStaffRole = (role: string): boolean => {
  const frontRoles = ['waiter', 'cashier'];
  return frontRoles.includes(role?.toLowerCase());
};

export const isManagementRole = (role: string): boolean => {
  const managementRoles = ['manager', 'admin'];
  return managementRoles.includes(role?.toLowerCase());
};

export const isDeliveryRole = (role: string): boolean => {
  const deliveryRoles = ['delivery_boy', 'delivery_boy', 'rider', 'driver'];
  return deliveryRoles.includes(role?.toLowerCase());
};

// ============================================================================
// Role display utilities
// ============================================================================

export const getRoleDisplayName = (role: string): string => {
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
    // ✅ Delivery Roles
    delivery_boy: '🚴 Delivery Boy',
    rider: '🚴 Rider',
    driver: '🚗 Driver',
  };
  return labels[role?.toLowerCase()] || role || 'Staff';
};

export const getRoleIcon = (role: string): string => {
  const icons: Record<string, string> = {
    chef: '👨‍🍳',
    cook: '🍳',
    helper: '🫂',
    section_chef: '👨‍🍳',
    kot_staff: '📋',
    waiter: '👨‍💼',
    cashier: '💰',
    manager: '👔',
    admin: '👑',
    // ✅ Delivery Roles
    delivery_boy: '🚴',
    rider: '🚴',
    driver: '🚗',
  };
  return icons[role?.toLowerCase()] || '👤';
};

// ============================================================================
// Permission categories for UI
// ============================================================================

const categoryMap = {
  Orders: [
    'view_live_orders', 'view_order_details', 'acknowledge_order',
    'start_cooking', 'request_ready', 'approve_ready', 'reject_ready',
    'complete_order', 'update_order_status', 'view_ready_orders',
  ],
  Recipes: ['view_recipes'],
  KOT: ['view_kot', 'create_kot', 'update_kot', 'print_kot'],
  Tables: ['view_tables', 'assign_table', 'request_bill'],
  'Bills & Payments': ['view_bills', 'view_payments', 'process_payment', 'issue_refund'],
  Inventory: ['view_inventory', 'update_inventory'],
  Staff: ['view_staff', 'manage_staff', 'view_roles', 'manage_roles'],
  Reports: ['view_reports'],
  POS: ['view_staff_pos'],
  Salary: ['view_salary'],
  Attendance: ['view_attendance'],
  // ✅ Delivery Category
  Delivery: [
    'view_delivery_dashboard',
    'view_delivery_orders',
    'accept_delivery_order',
    'reject_delivery_order',
    'view_delivery_order_details',
    'update_delivery_status',
    'mark_picked_up',
    'mark_in_transit',
    'mark_delivered',
    'view_delivery_earnings',
    'view_delivery_history',
    'call_customer',
    'navigate_to_location',
    'toggle_availability',
  ],
};

export const PERMISSION_CATEGORIES = Object.fromEntries(
  Object.entries(categoryMap).map(([category, perms]) => [
    category,
    {
      permissions: perms.filter(p => ALL_PERMISSIONS.includes(p as Permission))
    }
  ])
);

// ============================================================================
// Default role permissions
// ============================================================================

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ALL_PERMISSIONS,
  
  manager: [
    PERMISSIONS.VIEW_LIVE_ORDERS,
    PERMISSIONS.VIEW_ORDER_DETAILS,
    PERMISSIONS.VIEW_READY_ORDERS,
    PERMISSIONS.ACKNOWLEDGE_ORDER,
    PERMISSIONS.REQUEST_READY,
    PERMISSIONS.APPROVE_READY,
    PERMISSIONS.REJECT_READY,
    PERMISSIONS.COMPLETE_ORDER,
    PERMISSIONS.VIEW_RECIPES,
    PERMISSIONS.VIEW_KOT,
    PERMISSIONS.VIEW_TABLES,
    PERMISSIONS.VIEW_BILLS,
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_STAFF,
    PERMISSIONS.VIEW_ROLES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_SALARY,
    PERMISSIONS.VIEW_ATTENDANCE,
    // Delivery management
    PERMISSIONS.VIEW_DELIVERY_DASHBOARD,
    PERMISSIONS.VIEW_DELIVERY_ORDERS,
    PERMISSIONS.VIEW_DELIVERY_ORDER_DETAILS,
    PERMISSIONS.VIEW_DELIVERY_EARNINGS,
    PERMISSIONS.VIEW_DELIVERY_HISTORY,
  ],
  
  chef: [
    PERMISSIONS.VIEW_LIVE_ORDERS,
    PERMISSIONS.VIEW_ORDER_DETAILS,
    PERMISSIONS.VIEW_READY_ORDERS,
    PERMISSIONS.ACKNOWLEDGE_ORDER,
    PERMISSIONS.START_COOKING,
    PERMISSIONS.REQUEST_READY,
    PERMISSIONS.VIEW_RECIPES,
    PERMISSIONS.VIEW_KOT,
    PERMISSIONS.CREATE_KOT,
    PERMISSIONS.UPDATE_KOT,
    PERMISSIONS.PRINT_KOT,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_SALARY,
    PERMISSIONS.VIEW_ATTENDANCE,
  ],
  
  cook: [
    PERMISSIONS.VIEW_LIVE_ORDERS,
    PERMISSIONS.VIEW_ORDER_DETAILS,
    PERMISSIONS.ACKNOWLEDGE_ORDER,
    PERMISSIONS.START_COOKING,
    PERMISSIONS.VIEW_KOT,
    PERMISSIONS.VIEW_SALARY,
    PERMISSIONS.VIEW_ATTENDANCE,
  ],
  
  waiter: [
    PERMISSIONS.VIEW_LIVE_ORDERS,
    PERMISSIONS.VIEW_ORDER_DETAILS,
    PERMISSIONS.VIEW_READY_ORDERS,
    PERMISSIONS.COMPLETE_ORDER,
    PERMISSIONS.VIEW_TABLES,
    PERMISSIONS.ASSIGN_TABLE,
    PERMISSIONS.REQUEST_BILL,
    PERMISSIONS.VIEW_BILLS,
    PERMISSIONS.VIEW_SALARY,
    PERMISSIONS.VIEW_ATTENDANCE,
  ],
  
  cashier: [
    PERMISSIONS.VIEW_BILLS,
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.PROCESS_PAYMENT,
    PERMISSIONS.ISSUE_REFUND,
    PERMISSIONS.VIEW_SALARY,
    PERMISSIONS.VIEW_ATTENDANCE,
  ],
  
  // ✅ DELIVERY BOY DEFAULT PERMISSIONS
  delivery_boy: [
    PERMISSIONS.VIEW_DELIVERY_DASHBOARD,
    PERMISSIONS.VIEW_DELIVERY_ORDERS,
    PERMISSIONS.ACCEPT_DELIVERY_ORDER,
    PERMISSIONS.REJECT_DELIVERY_ORDER,
    PERMISSIONS.VIEW_DELIVERY_ORDER_DETAILS,
    PERMISSIONS.UPDATE_DELIVERY_STATUS,
    PERMISSIONS.MARK_PICKED_UP,
    PERMISSIONS.MARK_IN_TRANSIT,
    PERMISSIONS.MARK_DELIVERED,
    PERMISSIONS.VIEW_DELIVERY_EARNINGS,
    PERMISSIONS.VIEW_DELIVERY_HISTORY,
    PERMISSIONS.CALL_CUSTOMER,
    PERMISSIONS.NAVIGATE_TO_LOCATION,
    PERMISSIONS.TOGGLE_AVAILABILITY,
    PERMISSIONS.VIEW_SALARY,
    PERMISSIONS.VIEW_ATTENDANCE,
  ],
  
  helper: [
    PERMISSIONS.VIEW_LIVE_ORDERS,
    PERMISSIONS.VIEW_SALARY,
    PERMISSIONS.VIEW_ATTENDANCE,
  ],
};

// ============================================================================
// Menu items with permissions
// ============================================================================

export const getMenuItemsWithPermissions = (staffPermissions: Permission[] = []) => {
  return [
    {
      icon: 'LayoutGrid',
      label: 'Dashboard',
      href: '/staff-portal/dashboard',
      isFixed: true, // Everyone can see this
    },
    {
      icon: 'ChefHat',
      label: 'KOT',
      href: '/staff-portal/kot',
      permission: PERMISSIONS.VIEW_KOT,
    },
    {
      icon: 'ClipboardList',
      label: 'Live Orders',
      href: '/staff-portal/orders',
      permission: PERMISSIONS.VIEW_LIVE_ORDERS,
    },
    {
      icon: 'Coffee',
      label: 'Tables',
      href: '/staff-portal/tables',
      permission: PERMISSIONS.VIEW_TABLES,
    },
    {
      icon: 'Users',
      label: 'Ready Orders',
      href: '/staff-portal/ready-orders',
      permission: PERMISSIONS.VIEW_READY_ORDERS,
    },
    {
      icon: 'Receipt',
      label: 'Bills',
      href: '/staff-portal/bills',
      permission: PERMISSIONS.VIEW_BILLS,
    },
    {
      icon: 'Wallet',
      label: 'Payments',
      href: '/staff-portal/payments',
      permission: PERMISSIONS.VIEW_PAYMENTS,
    },
    // ✅ DELIVERY PORTAL MENU
    {
      icon: 'Bike',
      label: 'Delivery Portal',
      href: '/staff-portal/delivery',
      permission: PERMISSIONS.VIEW_DELIVERY_DASHBOARD,
      iconColor: '#22c55e',
    },
    {
      icon: 'Package',
      label: 'Inventory',
      href: '/staff-portal/inventory',
      permission: PERMISSIONS.VIEW_INVENTORY,
    },
    {
      icon: 'BookOpen',
      label: 'Recipes',
      href: '/staff-portal/recipes',
      permission: PERMISSIONS.VIEW_RECIPES,
    },
    {
      icon: 'User',
      label: 'Profile',
      href: '/staff-portal/profile',
      isFixed: true,
    },
    {
      icon: 'Settings',
      label: 'Settings',
      href: '/staff-portal/settings',
      isFixed: true,
    },
  ];
};