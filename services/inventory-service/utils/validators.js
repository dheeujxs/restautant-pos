// utils/validators.js
import mongoose from 'mongoose';

// ============================================================
//  CONSTANTS
// ============================================================

export const ALLOWED_ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'];
export const ALLOWED_ORDER_STATUS = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
export const ALLOWED_PAYMENT_METHODS = ['cash', 'card', 'upi', 'online'];
export const ALLOWED_PAYMENT_STATUS = ['pending', 'paid', 'refunded'];
export const ALLOWED_ROLES = ['admin', 'manager', 'chef', 'cook', 'waiter', 'cashier', 'delivery_boy', 'helper'];
export const MAX_ITEMS_PER_ORDER = 50;
export const MAX_ORDER_AMOUNT = 1000000;
export const MIN_ORDER_AMOUNT = 0;
export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_NOTES_LENGTH = 500;
export const MAX_PASSWORD_LENGTH = 50;
export const MIN_PASSWORD_LENGTH = 6;

// ============================================================
//  ID VALIDATION
// ============================================================

export const isValidObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id);
};

export const isValidObjectIds = (ids) => {
  if (!Array.isArray(ids)) return false;
  if (ids.length === 0) return true;
  return ids.every(id => isValidObjectId(id));
};

// ============================================================
//  STRING VALIDATION
// ============================================================

export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  if (!phone) return true;
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

export const isValidName = (name, maxLength = MAX_NAME_LENGTH) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > maxLength) return false;
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  return nameRegex.test(trimmed);
};

export const isValidText = (text, maxLength = MAX_DESCRIPTION_LENGTH) => {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length > maxLength) return false;
  return true;
};

export const isValidPassword = (password) => {
  if (!password) return false;
  if (password.length < MIN_PASSWORD_LENGTH) return false;
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  return hasNumber && hasLetter;
};

// ============================================================
//  NUMBER VALIDATION
// ============================================================

export const isValidPrice = (price) => {
  if (price === undefined || price === null) return false;
  if (typeof price !== 'number') return false;
  if (price < MIN_ORDER_AMOUNT) return false;
  if (price > MAX_ORDER_AMOUNT) return false;
  return true;
};

export const isValidQuantity = (quantity) => {
  if (quantity === undefined || quantity === null) return false;
  if (!Number.isInteger(quantity)) return false;
  if (quantity < 1) return false;
  if (quantity > 999) return false;
  return true;
};

export const isValidPercentage = (percentage) => {
  if (percentage === undefined || percentage === null) return false;
  if (typeof percentage !== 'number') return false;
  if (percentage < 0) return false;
  if (percentage > 100) return false;
  return true;
};

// ============================================================
//  ENUM VALIDATION
// ============================================================

export const isValidOrderType = (type) => {
  if (!type) return false;
  return ALLOWED_ORDER_TYPES.includes(type);
};

export const isValidOrderStatus = (status) => {
  if (!status) return false;
  return ALLOWED_ORDER_STATUS.includes(status);
};

export const isValidPaymentMethod = (method) => {
  if (!method) return true;
  return ALLOWED_PAYMENT_METHODS.includes(method);
};

export const isValidPaymentStatus = (status) => {
  if (!status) return false;
  return ALLOWED_PAYMENT_STATUS.includes(status);
};

export const isValidRole = (role) => {
  if (!role) return false;
  return ALLOWED_ROLES.includes(role);
};

// ============================================================
//  ORDER ITEMS VALIDATION
// ============================================================

export const validateOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }

  if (items.length > MAX_ITEMS_PER_ORDER) {
    return { valid: false, error: `Maximum ${MAX_ITEMS_PER_ORDER} items allowed per order` };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (!item.productId) {
      return { valid: false, error: `Item ${i + 1}: Product ID is required` };
    }
    if (!isValidObjectId(item.productId)) {
      return { valid: false, error: `Item ${i + 1}: Invalid product ID format` };
    }

    if (!item.productName) {
      return { valid: false, error: `Item ${i + 1}: Product name is required` };
    }
    if (item.productName.length > 100) {
      return { valid: false, error: `Item ${i + 1}: Product name too long` };
    }

    if (!isValidQuantity(item.quantity)) {
      return { valid: false, error: `Item ${i + 1}: Invalid quantity` };
    }

    if (!isValidPrice(item.unitPrice)) {
      return { valid: false, error: `Item ${i + 1}: Invalid unit price` };
    }

    const calculatedTotal = item.quantity * item.unitPrice;
    if (Math.abs(item.totalPrice - calculatedTotal) > 0.01) {
      return { 
        valid: false, 
        error: `Item ${i + 1}: Total price (${item.totalPrice}) does not match quantity * unit price (${calculatedTotal})` 
      };
    }
  }

  return { valid: true };
};

// ============================================================
//  ORDER VALIDATION
// ============================================================

export const validateOrder = (orderData) => {
  const errors = [];

  if (!orderData.orderType) {
    errors.push('Order type is required');
  } else if (!isValidOrderType(orderData.orderType)) {
    errors.push(`Invalid order type. Allowed: ${ALLOWED_ORDER_TYPES.join(', ')}`);
  }

  const itemsValidation = validateOrderItems(orderData.items);
  if (!itemsValidation.valid) {
    errors.push(itemsValidation.error);
  }

  if (orderData.customerPhone && !isValidPhone(orderData.customerPhone)) {
    errors.push('Invalid phone number. Must be 10 digits');
  }

  if (orderData.customerEmail && !isValidEmail(orderData.customerEmail)) {
    errors.push('Invalid email format');
  }

  if (orderData.customerName && !isValidName(orderData.customerName)) {
    errors.push(`Invalid customer name. Max ${MAX_NAME_LENGTH} characters`);
  }

  if (orderData.subtotal !== undefined && !isValidPrice(orderData.subtotal)) {
    errors.push('Invalid subtotal amount');
  }

  if (orderData.total !== undefined && !isValidPrice(orderData.total)) {
    errors.push('Invalid total amount');
  }

  if (orderData.paymentMethod && !isValidPaymentMethod(orderData.paymentMethod)) {
    errors.push(`Invalid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`);
  }

  if (orderData.notes && orderData.notes.length > MAX_NOTES_LENGTH) {
    errors.push(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================
//  DELIVERY VALIDATION
// ============================================================

export const validateDeliveryOrder = (deliveryData) => {
  const errors = [];

  if (deliveryData.orderType === 'delivery') {
    if (!deliveryData.restaurantName) {
      errors.push('Restaurant name is required for delivery orders');
    }

    if (!deliveryData.restaurantAddress) {
      errors.push('Restaurant address is required for delivery orders');
    }

    if (!deliveryData.customerAddress) {
      errors.push('Customer address is required for delivery orders');
    }

    if (deliveryData.distance !== undefined) {
      if (typeof deliveryData.distance !== 'number' || deliveryData.distance < 0) {
        errors.push('Distance must be a positive number');
      }
    }

    if (deliveryData.estimatedTime !== undefined) {
      if (typeof deliveryData.estimatedTime !== 'number' || deliveryData.estimatedTime < 0) {
        errors.push('Estimated time must be a positive number');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================
//  STAFF VALIDATION
// ============================================================

export const validateStaff = (staffData) => {
  const errors = [];

  if (!staffData.name || !isValidName(staffData.name)) {
    errors.push('Valid name is required');
  }

  if (!staffData.phoneNumber || !isValidPhone(staffData.phoneNumber)) {
    errors.push('Valid 10-digit phone number is required');
  }

  if (!staffData.employeeId) {
    errors.push('Employee ID is required');
  }

  if (staffData.role && !isValidRole(staffData.role)) {
    errors.push(`Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};