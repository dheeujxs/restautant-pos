// src/types/permissions.ts
import type { ElementType } from 'react';
import type { Permission } from '../utils/permissions';

// Re-export Permission type from utils
export type { Permission };

// Dashboard permissions (fixed - everyone gets these)
export type FixedPermission = 'view_dashboard' | 'view_stats';

// Staff interface
export interface StaffData {
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
  // ✅ Delivery specific fields
  deliveryDetails?: {
    vehicleType?: 'bike' | 'scooter' | 'car';
    vehicleNumber?: string;
    licenseNumber?: string;
    isAvailable?: boolean;
    currentLocation?: {
      lat: number;
      lng: number;
      updatedAt: string;
    };
    totalDeliveries?: number;
    rating?: number;
    earnings?: number;
    tips?: number;
  };
}

// Role interface
export interface RoleData {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Menu item interface for sidebar
export interface MenuItem {
  icon: ElementType;
  label: string;
  href: string;
  permission?: Permission;
  isFixed?: boolean;
  iconColor?: string;
}

// Delivery Order interface
export interface DeliveryOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLandmark?: string;
  deliveryInstructions?: string;
  items: Array<{ productName: string; quantity: number }>;
  total: number;
  paymentMethod: 'cod' | 'card' | 'upi' | 'online';
  paymentStatus: 'pending' | 'paid' | 'cod';
  deliveryStatus: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  distance: number;
  estimatedTime: number;
  isVip: boolean;
  createdAt: string;
  readyTime?: string;
  deliveryTime?: string;
  riderId?: string;
  riderName?: string;
  priority: 'normal' | 'urgent' | 'vip';
}

// Delivery Stats interface
export interface DeliveryStats {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  earnings: number;
  tips: number;
  rating: number;
  onTimeRate: number;
}