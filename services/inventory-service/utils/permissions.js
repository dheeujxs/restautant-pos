// utils/permissions.js (Backend)

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

  VIEW_PAYMENTS: 'view_payments',
  PROCESS_PAYMENT: 'process_payment',
  ISSUE_REFUND: 'issue_refund',
  VIEW_BILLS: 'view_bills',
  REQUEST_BILL: 'request_bill',

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

  // ✅ Salary & Attendance - Everyone
  VIEW_SALARY: 'view_salary',
  VIEW_ATTENDANCE: 'view_attendance',

  // ✅ DELIVERY PERMISSIONS - New
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
};