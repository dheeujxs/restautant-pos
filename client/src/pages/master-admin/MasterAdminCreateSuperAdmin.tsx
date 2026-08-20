// pages/master-admin/MasterAdminCreateSuperAdmin.tsx - WITH PASSWORD FIELDS

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Crown,
  Shield,
  User,
  Mail,
  Phone,
  Building2,
  Store,
  Users,
  ShoppingBag,
  CreditCard,
  Utensils,
  Package,
  FileText,
  Settings,
  Lock,
  Key,
  Globe,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  X,
  RefreshCw,
  DollarSign,
  TrendingUp,
  PieChart,
  Award,
  Bell,
  Clock,
  Calendar,
  MapPin,
  Briefcase,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldAlert,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { masterAdminApi } from '../../services/api';
import { useAuth } from '../../utils/AuthContext';

// ─── Permission Presets ──────────────────────────────────────────────────
const PERMISSION_PRESETS = [
  {
    id: 'full_access',
    label: 'Full Access',
    description: 'Complete control over all features',
    icon: ShieldCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'restaurant_manager',
    label: 'Restaurant Manager',
    description: 'Manage restaurants, branches, staff, and orders',
    icon: Store,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    id: 'view_only',
    label: 'View Only',
    description: 'Read-only access to all data',
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'staff_manager',
    label: 'Staff Manager',
    description: 'Manage staff, roles, and permissions',
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  {
    id: 'financial_manager',
    label: 'Financial Manager',
    description: 'Manage payments, refunds, subscriptions, and commissions',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

const DEFAULT_PERMISSIONS = {
  // Restaurant Management
  canCreateRestaurant: true,
  canEditRestaurant: true,
  canDeleteRestaurant: false,
  canViewAllRestaurants: true,
  canApproveRestaurant: true,
  canRejectRestaurant: true,
  canSuspendRestaurant: false,

  // Branch Management
  canCreateBranch: true,
  canEditBranch: true,
  canDeleteBranch: false,
  canViewAllBranches: true,

  // Staff Management
  canCreateStaff: true,
  canEditStaff: true,
  canDeleteStaff: false,
  canViewAllStaff: true,
  canManageStaffRoles: true,
  canManageStaffPermissions: false,

  // Order Management
  canViewAllOrders: true,
  canCancelAnyOrder: false,
  canCompleteAnyOrder: false,
  canManageDelivery: true,

  // Payment Management
  canViewAllPayments: true,
  canRefundPayment: false,
  canManagePaymentMethods: false,

  // Menu Management
  canCreateDish: true,
  canEditDish: true,
  canDeleteDish: false,
  canViewAllMenus: true,
  canManageCategories: true,

  // Inventory Management
  canViewAllInventory: true,
  canManageInventory: true,
  canManageSuppliers: true,
  canCreatePurchase: true,

  // Report Management
  canViewAllReports: true,
  canExportReports: false,
  canViewFinancialReports: false,

  // System Management
  canManageSystemSettings: false,
  canViewAuditLogs: false,

  // Subscription & Commission
  canViewSubscriptions: true,
  canManageSubscriptions: false,
  canViewCommissions: true,
  canManageCommissions: false,

  // Restrictions
  canManageAllRestaurants: true,
  canManageAllBranches: true,
};

const PRESET_PERMISSIONS: Record<string, any> = {
  full_access: {
    canCreateRestaurant: true,
    canEditRestaurant: true,
    canDeleteRestaurant: true,
    canViewAllRestaurants: true,
    canApproveRestaurant: true,
    canRejectRestaurant: true,
    canSuspendRestaurant: true,
    canCreateBranch: true,
    canEditBranch: true,
    canDeleteBranch: true,
    canViewAllBranches: true,
    canCreateStaff: true,
    canEditStaff: true,
    canDeleteStaff: true,
    canViewAllStaff: true,
    canManageStaffRoles: true,
    canManageStaffPermissions: true,
    canViewAllOrders: true,
    canCancelAnyOrder: true,
    canCompleteAnyOrder: true,
    canManageDelivery: true,
    canViewAllPayments: true,
    canRefundPayment: true,
    canManagePaymentMethods: true,
    canCreateDish: true,
    canEditDish: true,
    canDeleteDish: true,
    canViewAllMenus: true,
    canManageCategories: true,
    canViewAllInventory: true,
    canManageInventory: true,
    canManageSuppliers: true,
    canCreatePurchase: true,
    canViewAllReports: true,
    canExportReports: true,
    canViewFinancialReports: true,
    canManageSystemSettings: true,
    canViewAuditLogs: true,
    canViewSubscriptions: true,
    canManageSubscriptions: true,
    canViewCommissions: true,
    canManageCommissions: true,
    canManageAllRestaurants: true,
    canManageAllBranches: true,
  },
  restaurant_manager: {
    ...DEFAULT_PERMISSIONS,
    canCreateRestaurant: true,
    canEditRestaurant: true,
    canDeleteRestaurant: false,
    canSuspendRestaurant: false,
    canDeleteBranch: false,
    canDeleteStaff: false,
    canCancelAnyOrder: false,
    canCompleteAnyOrder: false,
    canRefundPayment: false,
    canDeleteDish: false,
    canExportReports: false,
    canViewFinancialReports: false,
    canManageSystemSettings: false,
    canManageSubscriptions: false,
    canManageCommissions: false,
  },
  view_only: {
    canCreateRestaurant: false,
    canEditRestaurant: false,
    canDeleteRestaurant: false,
    canViewAllRestaurants: true,
    canApproveRestaurant: false,
    canRejectRestaurant: false,
    canSuspendRestaurant: false,
    canCreateBranch: false,
    canEditBranch: false,
    canDeleteBranch: false,
    canViewAllBranches: true,
    canCreateStaff: false,
    canEditStaff: false,
    canDeleteStaff: false,
    canViewAllStaff: true,
    canManageStaffRoles: false,
    canManageStaffPermissions: false,
    canViewAllOrders: true,
    canCancelAnyOrder: false,
    canCompleteAnyOrder: false,
    canManageDelivery: false,
    canViewAllPayments: true,
    canRefundPayment: false,
    canManagePaymentMethods: false,
    canCreateDish: false,
    canEditDish: false,
    canDeleteDish: false,
    canViewAllMenus: true,
    canManageCategories: false,
    canViewAllInventory: true,
    canManageInventory: false,
    canManageSuppliers: false,
    canCreatePurchase: false,
    canViewAllReports: true,
    canExportReports: false,
    canViewFinancialReports: false,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canViewSubscriptions: true,
    canManageSubscriptions: false,
    canViewCommissions: true,
    canManageCommissions: false,
    canManageAllRestaurants: true,
    canManageAllBranches: true,
  },
  staff_manager: {
    ...DEFAULT_PERMISSIONS,
    canCreateRestaurant: false,
    canEditRestaurant: false,
    canDeleteRestaurant: false,
    canApproveRestaurant: false,
    canRejectRestaurant: false,
    canSuspendRestaurant: false,
    canCreateBranch: false,
    canEditBranch: false,
    canDeleteBranch: false,
    canCreateStaff: true,
    canEditStaff: true,
    canDeleteStaff: true,
    canManageStaffRoles: true,
    canManageStaffPermissions: true,
    canViewAllOrders: false,
    canCancelAnyOrder: false,
    canCompleteAnyOrder: false,
    canManageDelivery: false,
    canViewAllPayments: false,
    canRefundPayment: false,
    canManagePaymentMethods: false,
    canCreateDish: false,
    canEditDish: false,
    canDeleteDish: false,
    canViewAllMenus: false,
    canManageCategories: false,
    canViewAllInventory: false,
    canManageInventory: false,
    canManageSuppliers: false,
    canCreatePurchase: false,
    canViewAllReports: false,
    canExportReports: false,
    canViewFinancialReports: false,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canViewSubscriptions: false,
    canManageSubscriptions: false,
    canViewCommissions: false,
    canManageCommissions: false,
    canManageAllRestaurants: false,
    canManageAllBranches: false,
  },
  financial_manager: {
    ...DEFAULT_PERMISSIONS,
    canCreateRestaurant: false,
    canEditRestaurant: false,
    canDeleteRestaurant: false,
    canApproveRestaurant: false,
    canRejectRestaurant: false,
    canSuspendRestaurant: false,
    canCreateBranch: false,
    canEditBranch: false,
    canDeleteBranch: false,
    canCreateStaff: false,
    canEditStaff: false,
    canDeleteStaff: false,
    canManageStaffRoles: false,
    canManageStaffPermissions: false,
    canViewAllOrders: true,
    canCancelAnyOrder: false,
    canCompleteAnyOrder: false,
    canManageDelivery: false,
    canViewAllPayments: true,
    canRefundPayment: true,
    canManagePaymentMethods: true,
    canCreateDish: false,
    canEditDish: false,
    canDeleteDish: false,
    canViewAllMenus: false,
    canManageCategories: false,
    canViewAllInventory: false,
    canManageInventory: false,
    canManageSuppliers: false,
    canCreatePurchase: false,
    canViewAllReports: true,
    canExportReports: true,
    canViewFinancialReports: true,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canViewSubscriptions: true,
    canManageSubscriptions: true,
    canViewCommissions: true,
    canManageCommissions: true,
    canManageAllRestaurants: false,
    canManageAllBranches: false,
  },
};

export default function MasterAdminCreateSuperAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    restaurant: true,
    branch: true,
    staff: true,
    order: true,
    payment: true,
    menu: true,
    inventory: true,
    report: true,
    system: true,
    subscription: true,
  });

  // ─── Form State ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organizationName: '',
    notes: '',
    password: '',      // ✅ Added
    confirmPassword: '', // ✅ Added
  });

  // ─── Permissions State ──────────────────────────────────────────────────
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Update Form ────────────────────────────────────────────────────────
  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // ─── Update Permission ──────────────────────────────────────────────────
  const updatePermission = (key: string, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Toggle Section ─────────────────────────────────────────────────────
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ─── Apply Preset ──────────────────────────────────────────────────────
  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === 'custom') {
      return;
    }
    const preset = PRESET_PERMISSIONS[presetId];
    if (preset) {
      setPermissions(preset);
      toast.success(`Applied "${PERMISSION_PRESETS.find(p => p.id === presetId)?.label}" preset`);
    }
  };

  // ─── Validate ──────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!form.firstName.trim()) {
      errors.firstName = 'First name is required';
      isValid = false;
    } else if (form.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
      isValid = false;
    }

    if (!form.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required';
      isValid = false;
    }

    if (!form.organizationName.trim()) {
      errors.organizationName = 'Organization name is required';
      isValid = false;
    }

    // ✅ Validate password
    if (!form.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        organizationName: form.organizationName.trim(),
        notes: form.notes.trim(),
        password: form.password, // ✅ Send password
        confirmPassword: form.confirmPassword, // ✅ Send confirm password
        ...permissions,
      };

      console.log('📤 Creating Super Admin:', { ...payload, password: '***', confirmPassword: '***' });

      const response = await masterAdminApi.post('/master-admin/super-admins', payload);

      if (response.data.success) {
        toast.success('✅ Super Admin created successfully!');
        navigate('/master-admin/super-admins');
      } else {
        toast.error(response.data.error || 'Failed to create Super Admin');
      }
    } catch (err: any) {
      console.error('❌ Create Super Admin error:', err);
      toast.error(err.response?.data?.error || 'Failed to create Super Admin');
    } finally {
      setLoading(false);
    }
  };

  // ─── Permission Group Components ───────────────────────────────────────
  const PermissionToggle = ({ label, key, description }: { label: string; key: string; description?: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => updatePermission(key, !permissions[key as keyof typeof permissions])}
        className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center ${
          permissions[key as keyof typeof permissions] ? 'bg-amber-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-all duration-200 ${
            permissions[key as keyof typeof permissions] ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );

  const PermissionSection = ({
    title,
    icon: Icon,
    section,
    permissions: sectionPermissions,
  }: {
    title: string;
    icon: any;
    section: string;
    permissions: Array<{ key: string; label: string; description?: string }>;
  }) => (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Icon size={16} className="text-amber-500" />
          </div>
          <span className="font-medium text-gray-800">{title}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-200 ${
            expandedSections[section] ? 'rotate-180' : ''
          }`}
        />
      </button>
      {expandedSections[section] && (
        <div className="px-4 pb-3">
          {sectionPermissions.map((perm) => (
            <PermissionToggle
              key={perm.key}
              label={perm.label}
              key={perm.key}
              description={perm.description}
            />
          ))}
        </div>
      )}
    </div>
  );

  // ─── Permission Groups ─────────────────────────────────────────────────
  const permissionGroups = [
    {
      section: 'restaurant',
      title: 'Restaurant Management',
      icon: Store,
      permissions: [
        { key: 'canCreateRestaurant', label: 'Create Restaurants' },
        { key: 'canEditRestaurant', label: 'Edit Restaurants' },
        { key: 'canDeleteRestaurant', label: 'Delete Restaurants' },
        { key: 'canViewAllRestaurants', label: 'View All Restaurants' },
        { key: 'canApproveRestaurant', label: 'Approve Restaurants' },
        { key: 'canRejectRestaurant', label: 'Reject Restaurants' },
        { key: 'canSuspendRestaurant', label: 'Suspend Restaurants' },
      ],
    },
    {
      section: 'branch',
      title: 'Branch Management',
      icon: MapPin,
      permissions: [
        { key: 'canCreateBranch', label: 'Create Branches' },
        { key: 'canEditBranch', label: 'Edit Branches' },
        { key: 'canDeleteBranch', label: 'Delete Branches' },
        { key: 'canViewAllBranches', label: 'View All Branches' },
      ],
    },
    {
      section: 'staff',
      title: 'Staff Management',
      icon: Users,
      permissions: [
        { key: 'canCreateStaff', label: 'Create Staff' },
        { key: 'canEditStaff', label: 'Edit Staff' },
        { key: 'canDeleteStaff', label: 'Delete Staff' },
        { key: 'canViewAllStaff', label: 'View All Staff' },
        { key: 'canManageStaffRoles', label: 'Manage Staff Roles' },
        { key: 'canManageStaffPermissions', label: 'Manage Staff Permissions' },
      ],
    },
    {
      section: 'order',
      title: 'Order Management',
      icon: ShoppingBag,
      permissions: [
        { key: 'canViewAllOrders', label: 'View All Orders' },
        { key: 'canCancelAnyOrder', label: 'Cancel Any Order' },
        { key: 'canCompleteAnyOrder', label: 'Complete Any Order' },
        { key: 'canManageDelivery', label: 'Manage Delivery Orders' },
      ],
    },
    {
      section: 'payment',
      title: 'Payment Management',
      icon: CreditCard,
      permissions: [
        { key: 'canViewAllPayments', label: 'View All Payments' },
        { key: 'canRefundPayment', label: 'Refund Payments' },
        { key: 'canManagePaymentMethods', label: 'Manage Payment Methods' },
      ],
    },
    {
      section: 'menu',
      title: 'Menu Management',
      icon: Utensils,
      permissions: [
        { key: 'canCreateDish', label: 'Create Dishes' },
        { key: 'canEditDish', label: 'Edit Dishes' },
        { key: 'canDeleteDish', label: 'Delete Dishes' },
        { key: 'canViewAllMenus', label: 'View All Menus' },
        { key: 'canManageCategories', label: 'Manage Categories' },
      ],
    },
    {
      section: 'inventory',
      title: 'Inventory Management',
      icon: Package,
      permissions: [
        { key: 'canViewAllInventory', label: 'View All Inventory' },
        { key: 'canManageInventory', label: 'Manage Inventory' },
        { key: 'canManageSuppliers', label: 'Manage Suppliers' },
        { key: 'canCreatePurchase', label: 'Create Purchase Orders' },
      ],
    },
    {
      section: 'report',
      title: 'Report Management',
      icon: FileText,
      permissions: [
        { key: 'canViewAllReports', label: 'View All Reports' },
        { key: 'canExportReports', label: 'Export Reports' },
        { key: 'canViewFinancialReports', label: 'View Financial Reports' },
      ],
    },
    {
      section: 'system',
      title: 'System Management',
      icon: Settings,
      permissions: [
        { key: 'canManageSystemSettings', label: 'Manage System Settings' },
        { key: 'canViewAuditLogs', label: 'View Audit Logs' },
      ],
    },
    {
      section: 'subscription',
      title: 'Subscription & Commission',
      icon: Award,
      permissions: [
        { key: 'canViewSubscriptions', label: 'View Subscriptions' },
        { key: 'canManageSubscriptions', label: 'Manage Subscriptions' },
        { key: 'canViewCommissions', label: 'View Commissions' },
        { key: 'canManageCommissions', label: 'Manage Commissions' },
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/master-admin/super-admins')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Shield size={24} className="text-amber-500" />
              Create Super Admin
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create a new Super Admin with custom permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/master-admin/super-admins')}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            {loading ? 'Creating...' : 'Create Super Admin'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT: Form ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={18} className="text-amber-500" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  placeholder="John"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    formErrors.firstName ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {formErrors.firstName && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="admin@company.com"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    formErrors.email ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="+91 9876543210"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    formErrors.phone ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {formErrors.phone && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>
                )}
              </div>

              {/* Organization */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.organizationName}
                  onChange={(e) => updateForm('organizationName', e.target.value)}
                  placeholder="Acme Corp"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    formErrors.organizationName ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {formErrors.organizationName && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.organizationName}</p>
                )}
              </div>

              {/* ✅ Password Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      formErrors.password ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                {formErrors.password && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => updateForm('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                      formErrors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  placeholder="Additional notes about this Super Admin..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Lock size={18} className="text-amber-500" />
                Permissions
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedPreset(null);
                  setPermissions(DEFAULT_PERMISSIONS);
                  toast.info('Permissions reset to default');
                }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Reset to Default
              </button>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {PERMISSION_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isActive = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      isActive
                        ? `${preset.borderColor} bg-${preset.color.split('-')[1]}-50 ring-2 ring-${preset.color.split('-')[1]}-200`
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <Icon size={20} className={`mx-auto mb-1 ${preset.color}`} />
                    <p className={`text-xs font-medium ${isActive ? preset.color : 'text-gray-600'}`}>
                      {preset.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Permission Sections */}
            <div className="space-y-3">
              {permissionGroups.map((group) => (
                <PermissionSection
                  key={group.section}
                  title={group.title}
                  icon={group.icon}
                  section={group.section}
                  permissions={group.permissions}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Summary ────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm sticky top-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={18} className="text-amber-500" />
              Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Name</span>
                <span className="font-medium text-gray-800">
                  {form.firstName || '—'} {form.lastName || ''}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-800 truncate max-w-[120px]">
                  {form.email || '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Organization</span>
                <span className="font-medium text-gray-800 truncate max-w-[120px]">
                  {form.organizationName || '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Permissions</span>
                <span className="font-medium text-gray-800">
                  {selectedPreset ? PERMISSION_PRESETS.find(p => p.id === selectedPreset)?.label || 'Custom' : 'Default'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Total Permissions</span>
                <span className="font-medium text-amber-600">
                  {Object.values(permissions).filter(v => v === true).length} / {Object.keys(permissions).length}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <AlertCircle size={14} />
                <span>The Super Admin will use the password you set above.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}