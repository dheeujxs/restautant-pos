import mongoose from 'mongoose';
import { PERMISSIONS } from '../utils/permissions.js';

// Get all valid permission values
const VALID_PERMISSIONS = Object.values(PERMISSIONS);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    permissions: {
      type: [{
        type: String,
        enum: VALID_PERMISSIONS, // ✅ Only allow valid permissions
      }],
      default: [],
    },
    color: {
      type: String,
      default: '#6B7280',
    },
    icon: {
      type: String,
      default: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Validate permissions before saving
roleSchema.pre('save', function(next) {
  // Remove any invalid permissions
  const validPermissions = Object.values(PERMISSIONS);
  this.permissions = this.permissions.filter(p => validPermissions.includes(p));
  next();
});

// ✅ Static method to get all available permissions
roleSchema.statics.getAvailablePermissions = function() {
  return Object.values(PERMISSIONS);
};

// ✅ Static method to get permission categories
roleSchema.statics.getPermissionCategories = function() {
  const categories = {};
  // Group permissions by category (you can define this mapping)
  const permissionMap = {
    view_dashboard: 'Dashboard',
    view_stats: 'Dashboard',
    view_live_orders: 'Orders',
    view_order_details: 'Orders',
    acknowledge_order: 'Orders',
    start_cooking: 'Orders',
    request_ready: 'Orders',
    approve_ready: 'Orders',
    reject_ready: 'Orders',
    complete_order: 'Orders',
    update_order_status: 'Orders',
    view_kot: 'KOT',
    create_kot: 'KOT',
    update_kot: 'KOT',
    print_kot: 'KOT',
    view_tables: 'Tables',
    assign_table: 'Tables',
    request_bill: 'Tables',
    view_payments: 'Payments',
    process_payment: 'Payments',
    issue_refund: 'Payments',
    view_inventory: 'Inventory',
    update_inventory: 'Inventory',
    view_staff: 'Staff',
    manage_staff: 'Staff',
    view_roles: 'Staff',
    manage_roles: 'Staff',
  };
  
  // Group permissions by category
  Object.values(PERMISSIONS).forEach(perm => {
    const category = permissionMap[perm] || 'Other';
    if (!categories[category]) categories[category] = [];
    categories[category].push(perm);
  });
  
  return categories;
};

const Role = mongoose.model('Role', roleSchema);
export default Role;