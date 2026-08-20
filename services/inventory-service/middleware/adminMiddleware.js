// middleware/adminMiddleware.js

// ============================================================
//  ─── ADMIN MIDDLEWARES ─────────────────────────────────────
// ============================================================

/**
 * ✅ Check if user is admin
 * Allows: admin, superadmin
 */
export const isAdmin = (req, res, next) => {
  // Check for super admin first (from protect middleware)
  if (req.isSuperAdmin) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  const adminRoles = ['admin', 'superadmin'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin only.'
    });
  }

  next();
};

/**
 * ✅ Check if user is superadmin
 * Allows: superadmin only
 */
export const isSuperAdmin = (req, res, next) => {
  // Check if already marked as super admin by protect middleware
  if (req.isSuperAdmin) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Super Admin only.'
    });
  }

  next();
};

/**
 * ✅ Check if user has specific role
 * @param {string|string[]} roles - Single role or array of roles
 */
export const hasRole = (roles) => {
  // Convert to array if single role
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    // Super admin has access to everything
    if (req.isSuperAdmin) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * ✅ Check if user has specific permission
 * @param {string} permission - The permission required
 */
export const hasPermission = (permission) => {
  return (req, res, next) => {
    // Super admin has access to everything
    if (req.isSuperAdmin) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Check if user has permissions array and includes the required permission
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

/**
 * ✅ Check if user is admin or superadmin
 * Alias for isAdmin
 */
export const isAdminOrSuperAdmin = (req, res, next) => {
  return isAdmin(req, res, next);
};

/**
 * ✅ Check if user is staff
 * Allows: staff, waiter, kitchen, cashier
 */
export const isStaff = (req, res, next) => {
  // Check if staff is set by protect middleware
  if (req.staff) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  const staffRoles = ['staff', 'waiter', 'kitchen', 'cashier'];
  if (staffRoles.includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. Staff only.'
  });
};

/**
 * ✅ Check if user has any of the allowed roles
 * @param {string[]} allowedRoles - Array of allowed roles
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // Super admin has access to everything
    if (req.isSuperAdmin) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * ✅ Check if user is authenticated (any valid user)
 */
export const isAuthenticated = (req, res, next) => {
  if (!req.user && !req.isSuperAdmin) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  next();
};

/**
 * ✅ Check if user is customer (regular user)
 */
export const isCustomer = (req, res, next) => {
  if (req.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Customer only.'
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Customer only.'
    });
  }

  next();
};

/**
 * ✅ Check if user is active (not deactivated)
 */
export const isActive = (req, res, next) => {
  if (!req.user && !req.isSuperAdmin) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  // Check if user is deactivated
  if (req.user && req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      error: 'Account is deactivated. Please contact admin.'
    });
  }

  next();
};

// ============================================================
//  ─── EXPORT ALL MIDDLEWARES ───────────────────────────────
// ============================================================

export default {
  isAdmin,
  isSuperAdmin,
  hasRole,
  hasPermission,
  isAdminOrSuperAdmin,
  isStaff,
  restrictTo,
  isAuthenticated,
  isCustomer,
  isActive
};