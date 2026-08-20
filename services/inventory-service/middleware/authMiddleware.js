// middleware/authMiddleware.js - FIXED VERSION

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import SuperAdmin from '../models/super-admin/SuperAdmin.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';

console.log('🔐 Auth Middleware JWT_SECRET:', JWT_SECRET ? '✅ Loaded' : '❌ Missing');

// ============================================================
//  ─── MAIN PROTECT MIDDLEWARE ──────────────────────────────
// ============================================================

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authorized, no token' 
    });
  }

  try {
    console.log('🔐 Verifying token...');
    console.log('🔐 Token preview:', token.substring(0, 30) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified for ID:', decoded.id || decoded.userId || decoded.staffId);
    console.log('✅ Token role:', decoded.role);

    // ─── Check for Staff Token ──────────────────────────────────────────
    if (decoded.staffId || decoded.isStaff) {
      const staff = await Staff.findById(decoded.staffId || decoded.id);
      if (!staff) {
        return res.status(401).json({ 
          success: false, 
          error: 'Staff not found' 
        });
      }
      req.staff = staff;
      req.user = staff;
      req.isSuperAdmin = false;
      return next();
    }

    const userId = decoded.id || decoded.userId;
    
    if (userId) {
      // ─── FIRST: Check if it's a Super Admin token ──────────────────────
      // ✅ Check the role from the token first
      if (decoded.role === 'superadmin') {
        const superAdmin = await SuperAdmin.findById(userId);
        if (superAdmin) {
          if (!superAdmin.isActive) {
            return res.status(403).json({ 
              success: false, 
              error: 'Account is deactivated' 
            });
          }
          req.user = superAdmin;
          req.admin = superAdmin;
          req.isSuperAdmin = true;
          console.log('✅ Super Admin found:', superAdmin.email);
          return next();
        }
        // If token says superadmin but user not found in SuperAdmin collection
        return res.status(401).json({ 
          success: false, 
          error: 'Super Admin not found' 
        });
      }

      // ─── SECOND: Check User collection (regular admin/user) ────────────
      const user = await User.findById(userId);
      
      if (user) {
        if (user.isActive === false) {
          return res.status(403).json({ 
            success: false, 
            error: 'Account is deactivated' 
          });
        }
        req.user = user;
        req.isSuperAdmin = false;
        console.log('✅ User found in User collection:', user.email, 'Role:', user.role);
        return next();
      }
      
      // ─── THIRD: Try SuperAdmin collection (if role not specified) ──────
      const superAdmin = await SuperAdmin.findById(userId);
      if (superAdmin) {
        if (!superAdmin.isActive) {
          return res.status(403).json({ 
            success: false, 
            error: 'Account is deactivated' 
          });
        }
        req.user = superAdmin;
        req.admin = superAdmin;
        req.isSuperAdmin = true;
        console.log('✅ Super Admin found in SuperAdmin collection:', superAdmin.email);
        return next();
      }
      
      console.log('❌ No user found for ID:', userId);
      return res.status(401).json({ 
        success: false, 
        error: 'User not found. Please login again.' 
      });
    }

    console.log('❌ Invalid token payload - no ID found');
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token. Please login again.' 
    });
    
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    
    if (error.message === 'invalid signature' || 
        error.message === 'invalid token' || 
        error.message === 'jwt malformed') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token signature. Please login again.',
        clearToken: true 
      });
    }
    
    if (error.message === 'jwt expired') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired. Please login again.',
        clearToken: true 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Not authorized, invalid token' 
    });
  }
};

// ============================================================
//  ─── PROTECT SUPER ADMIN ──────────────────────────────────
// ============================================================

export const protectSuperAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized, no token',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // ✅ Check if token role is superadmin
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin only.',
      });
    }

    const admin = await SuperAdmin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    if (!admin.isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Account is not verified',
      });
    }

    req.admin = admin;
    req.user = admin;
    req.isSuperAdmin = true;
    next();
  } catch (error) {
    console.error('❌ Auth Middleware Error:', error);
    res.status(401).json({
      success: false,
      error: 'Not authorized',
    });
  }
};

// ============================================================
//  ─── ROLE CHECK MIDDLEWARES ──────────────────────────────
// ============================================================

export const isAdmin = (req, res, next) => {
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

export const isSuperAdmin = (req, res, next) => {
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

export const hasRole = (roles) => {
  return (req, res, next) => {
    if (req.isSuperAdmin) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (req.isSuperAdmin) {
      return next();
    }

    if (!req.admin || !req.admin.role) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

export const isStaff = (req, res, next) => {
  if (req.staff) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  if (req.user.role === 'staff' || req.user.userType === 'Staff') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. Staff only.'
  });
};

export const isAdminOrSuperAdmin = (req, res, next) => {
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
  if (adminRoles.includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. Admin or Super Admin required.'
  });
};

export const hasPermission = (permission) => {
  return (req, res, next) => {
    if (req.isSuperAdmin) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

// ─── Default Export ──────────────────────────────────────────────
export default {
  protect,
  protectSuperAdmin,
  isAdmin,
  isSuperAdmin,
  hasRole,
  restrictTo,
  isStaff,
  isAdminOrSuperAdmin,
  hasPermission
};