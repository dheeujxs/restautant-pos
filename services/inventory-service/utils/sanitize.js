// utils/sanitize.js

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
    if (!input) return '';
    if (typeof input !== 'string') return input;
    
    // Limit length to prevent DoS
    if (input.length > 10000) {
      input = input.substring(0, 10000);
    }
    
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Remove script tags (even with variations)
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove on* event handlers
    sanitized = sanitized.replace(/\s*on\w+="[^"]*"/gi, '');
    sanitized = sanitized.replace(/\s*on\w+='[^']*'/gi, '');
    sanitized = sanitized.replace(/\s*on\w+=[^"'\s]*/gi, '');
    
    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    
    // Remove vbscript: protocol
    sanitized = sanitized.replace(/vbscript:/gi, '');
    
    // Remove eval
    sanitized = sanitized.replace(/eval\s*\(/gi, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  };
  
  /**
   * Validate and sanitize order input
   * @param {Object} orderData - Order data to validate
   * @returns {Object} - { valid: boolean, errors: Array, sanitizedData: Object }
   */
  export const validateOrderInput = (orderData) => {
    const errors = [];
    const sanitizedData = {};
  
    // ─── Sanitize all fields ──────────────────────────────────────────────
    if (orderData.customerName) {
      sanitizedData.customerName = sanitizeInput(orderData.customerName);
      if (sanitizedData.customerName.length > 100) {
        errors.push('Customer name cannot exceed 100 characters');
      }
    }
  
    if (orderData.customerPhone) {
      sanitizedData.customerPhone = orderData.customerPhone.replace(/\D/g, '');
      if (!/^[0-9]{10}$/.test(sanitizedData.customerPhone)) {
        errors.push('Invalid phone number. Must be 10 digits');
      }
    }
  
    if (orderData.customerEmail) {
      sanitizedData.customerEmail = sanitizeInput(orderData.customerEmail);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedData.customerEmail)) {
        errors.push('Invalid email format');
      }
    }
  
    if (orderData.customerAddress) {
      sanitizedData.customerAddress = sanitizeInput(orderData.customerAddress);
      if (sanitizedData.customerAddress.length > 500) {
        errors.push('Address cannot exceed 500 characters');
      }
    }
  
    if (orderData.notes) {
      sanitizedData.notes = sanitizeInput(orderData.notes);
      if (sanitizedData.notes.length > 500) {
        errors.push('Notes cannot exceed 500 characters');
      }
    }
  
    // ─── Validate Order Type ──────────────────────────────────────────────
    const allowedTypes = ['dine-in', 'takeaway', 'delivery'];
    if (orderData.orderType && !allowedTypes.includes(orderData.orderType)) {
      errors.push(`Invalid order type. Allowed: ${allowedTypes.join(', ')}`);
    } else if (orderData.orderType) {
      sanitizedData.orderType = orderData.orderType;
    } else {
      errors.push('Order type is required');
    }
  
    // ─── Validate Payment Method ──────────────────────────────────────────
    const allowedPaymentMethods = ['cash', 'card', 'upi', 'online'];
    if (orderData.paymentMethod && !allowedPaymentMethods.includes(orderData.paymentMethod)) {
      errors.push(`Invalid payment method. Allowed: ${allowedPaymentMethods.join(', ')}`);
    } else if (orderData.paymentMethod) {
      sanitizedData.paymentMethod = orderData.paymentMethod;
    }
  
    // ─── Validate Items ────────────────────────────────────────────────────
    if (orderData.items && Array.isArray(orderData.items)) {
      sanitizedData.items = orderData.items.map(item => ({
        ...item,
        productName: sanitizeInput(item.productName),
        notes: item.notes ? sanitizeInput(item.notes) : '',
      }));
  
      if (sanitizedData.items.length === 0) {
        errors.push('At least one item is required');
      }
  
      if (sanitizedData.items.length > 50) {
        errors.push('Maximum 50 items allowed per order');
      }
  
      // Validate each item
      for (let i = 0; i < sanitizedData.items.length; i++) {
        const item = sanitizedData.items[i];
        
        if (!item.productId) {
          errors.push(`Item ${i + 1}: Product ID is required`);
        }
        
        if (!item.productName || item.productName.length > 100) {
          errors.push(`Item ${i + 1}: Invalid product name`);
        }
        
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
          errors.push(`Item ${i + 1}: Quantity must be between 1 and 999`);
        }
        
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          errors.push(`Item ${i + 1}: Invalid unit price`);
        }
        
        if (item.totalPrice !== item.quantity * item.unitPrice) {
          errors.push(`Item ${i + 1}: Total price does not match quantity × unit price`);
        }
      }
    } else {
      errors.push('Items are required');
    }
  
    // ─── Validate Amounts ──────────────────────────────────────────────────
    if (orderData.subtotal !== undefined) {
      if (typeof orderData.subtotal !== 'number' || orderData.subtotal < 0 || orderData.subtotal > 1000000) {
        errors.push('Invalid subtotal amount');
      } else {
        sanitizedData.subtotal = orderData.subtotal;
      }
    }
  
    if (orderData.total !== undefined) {
      if (typeof orderData.total !== 'number' || orderData.total < 0 || orderData.total > 1000000) {
        errors.push('Invalid total amount');
      } else {
        sanitizedData.total = orderData.total;
      }
    }
  
    if (orderData.tax !== undefined) {
      if (typeof orderData.tax !== 'number' || orderData.tax < 0) {
        errors.push('Invalid tax amount');
      } else {
        sanitizedData.tax = orderData.tax;
      }
    }
  
    if (orderData.discount !== undefined) {
      if (typeof orderData.discount !== 'number' || orderData.discount < 0) {
        errors.push('Invalid discount amount');
      } else {
        sanitizedData.discount = orderData.discount;
      }
    }
  
    // ─── Validate Delivery Fields ─────────────────────────────────────────
    if (orderData.orderType === 'delivery') {
      if (!orderData.restaurantName) {
        errors.push('Restaurant name is required for delivery orders');
      } else {
        sanitizedData.restaurantName = sanitizeInput(orderData.restaurantName);
      }
  
      if (!orderData.restaurantAddress) {
        errors.push('Restaurant address is required for delivery orders');
      } else {
        sanitizedData.restaurantAddress = sanitizeInput(orderData.restaurantAddress);
      }
  
      if (!orderData.customerAddress) {
        errors.push('Customer address is required for delivery orders');
      }
  
      if (orderData.distance !== undefined) {
        if (typeof orderData.distance !== 'number' || orderData.distance < 0) {
          errors.push('Distance must be a positive number');
        } else {
          sanitizedData.distance = orderData.distance;
        }
      }
  
      if (orderData.estimatedTime !== undefined) {
        if (typeof orderData.estimatedTime !== 'number' || orderData.estimatedTime < 0) {
          errors.push('Estimated time must be a positive number');
        } else {
          sanitizedData.estimatedTime = orderData.estimatedTime;
        }
      }
    }
  
    // ─── Validate Table for Dine-in ──────────────────────────────────────
    if (orderData.orderType === 'dine-in') {
      if (!orderData.tableId) {
        errors.push('Table ID is required for dine-in orders');
      } else {
        sanitizedData.tableId = orderData.tableId;
      }
      
      if (orderData.tableNumber) {
        sanitizedData.tableNumber = sanitizeInput(orderData.tableNumber);
      }
    }
  
    // ─── VIP Validation ───────────────────────────────────────────────────
    if (orderData.isVip !== undefined) {
      sanitizedData.isVip = Boolean(orderData.isVip);
    }
  
    if (orderData.vipNotes) {
      sanitizedData.vipNotes = sanitizeInput(orderData.vipNotes);
      if (sanitizedData.vipNotes.length > 200) {
        errors.push('VIP notes cannot exceed 200 characters');
      }
    }
  
    return {
      valid: errors.length === 0,
      errors,
      sanitizedData,
    };
  };
  
  /**
   * Sanitize object (recursively)
   * @param {Object} obj - Object to sanitize
   * @returns {Object} - Sanitized object
   */
  export const sanitizeObject = (obj) => {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };
  
  // Default export for convenience
  export default {
    sanitizeInput,
    validateOrderInput,
    sanitizeObject,
  };