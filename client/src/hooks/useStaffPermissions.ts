// src/hooks/useStaffPermissions.ts
import { useState, useEffect } from 'react';
import type { Permission, StaffData } from '../types/permissions';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  isKitchenRole,
  isFrontStaffRole,
  isManagementRole,
  getRoleDisplayName,
  getRoleIcon
} from '../utils/permissions';

export interface StaffDataWithPermissions {
  _id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  employeeId: string;
  role: string;
  roleId?: string;
  permissions: Permission[];
  canLoginKitchenPortal: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface UseStaffPermissionsReturn {
  staff: StaffDataWithPermissions | null;
  permissions: Permission[];
  loading: boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  role: string;
  roleDisplayName: string;
  roleIcon: string;
  isKitchenStaff: boolean;
  isFrontStaff: boolean;
  isManagement: boolean;
  isChef: boolean;
  isCook: boolean;
  isHelper: boolean;
  isSectionChef: boolean;
  isKOTStaff: boolean;
  isWaiter: boolean;
  isCashier: boolean;
  isManager: boolean;
  isAdmin: boolean;
}

export const useStaffPermissions = (): UseStaffPermissionsReturn => {
  const [staff, setStaff] = useState<StaffDataWithPermissions | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const staffData = localStorage.getItem('staffData');
      if (staffData) {
        const parsed: StaffDataWithPermissions = JSON.parse(staffData);
        setStaff(parsed);
        setPermissions(parsed.permissions || []);
      }
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const role = staff?.role?.toLowerCase() || '';

  return {
    staff,
    permissions,
    loading,
    can: (permission: Permission) => hasPermission(permissions, permission),
    canAny: (permissionList: Permission[]) => hasAnyPermission(permissions, permissionList),
    canAll: (permissionList: Permission[]) => hasAllPermissions(permissions, permissionList),
    role: staff?.role || '',
    roleDisplayName: getRoleDisplayName(role),
    roleIcon: getRoleIcon(role),
    isKitchenStaff: isKitchenRole(role),
    isFrontStaff: isFrontStaffRole(role),
    isManagement: isManagementRole(role),
    isChef: role === 'chef',
    isCook: role === 'cook',
    isHelper: role === 'helper',
    isSectionChef: role === 'section_chef',
    isKOTStaff: role === 'kot_staff',
    isWaiter: role === 'waiter',
    isCashier: role === 'cashier',
    isManager: role === 'manager',
    isAdmin: role === 'admin',
  };
};