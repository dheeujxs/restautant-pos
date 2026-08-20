// middleware/superAdminAuth.js - COMPLETE FIXED VERSION (WITH MASTER ADMIN)

import jwt from 'jsonwebtoken';
import SuperAdmin from '../models/super-admin/SuperAdmin.js';
import MasterAdmin from '../models/master-admin/MasterAdmin.js';
import { JWT_SECRET, JWT_EXPIRE } from '../config/jwt.js';

// ─── Token verification ────────────────────────────────────────────────
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      try {
        const decoded = jwt.decode(token);
        return { valid: false, expired: true, decoded };
      } catch {
        return { valid: false, expired: true, decoded: null };
      }
    }
    return { valid: false, expired: false, decoded: null, error };
  }
};

// ─── PROTECT SUPER ADMIN (ALLOWS MASTER ADMIN) ──────────────────────
export const protectSuperAdmin = async (req, res, next) => {
  try {
    let token;

    // ─── Get token from header ─────────────────────────────────────────
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // ─── Also check cookies ────────────────────────────────────────────
    if (!token && req.cookies) {
      token = req.cookies.superAdminToken || req.cookies.token || req.cookies.masterAdminToken;
    }

    if (!token) {
      console.log('❌ No token found');
      return res.status(401).json({
        success: false,
        error: 'Not authorized, no token provided',
      });
    }

    console.log(`🔐 Verifying token: ${token.substring(0, 30)}...`);

    // ─── Verify token ──────────────────────────────────────────────────
    const { valid, expired, decoded, error } = verifyToken(token);

    if (!valid && expired) {
      console.log('⏰ Token expired');
      return res.status(401).json({
        success: false,
        error: 'Token expired, please login again',
        expired: true,
      });
    }

    if (!valid || !decoded) {
      console.error('❌ Token verification failed:', error?.message || 'Unknown error');
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    // ─── ✅ CHECK FOR MASTER ADMIN FIRST ──────────────────────────────
    const role = decoded.role || decoded.roleName || '';
    
    if (role === 'master_admin' || role === 'platform_owner') {
      console.log(`👑 Master Admin token verified for ID: ${decoded.id}`);
      
      const masterAdmin = await MasterAdmin.findById(decoded.id)
        .select('-password -refreshToken -__v');

      if (!masterAdmin) {
        console.log(`❌ Master Admin not found for ID: ${decoded.id}`);
        return res.status(401).json({
          success: false,
          error: 'Master Admin not found',
        });
      }

      console.log(`✅ Master Admin found: ${masterAdmin.email}`);

      if (!masterAdmin.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      // ─── Attach Master Admin to request ──────────────────────────────
      req.masterAdmin = masterAdmin;
      req.admin = masterAdmin; // For compatibility
      req.adminId = masterAdmin._id;
      req.isMasterAdmin = true;
      req.token = token;
      return next();
    }

    // ─── ✅ CHECK FOR SUPER ADMIN ──────────────────────────────────────
    if (role === 'superadmin' || role === 'super_admin') {
      console.log(`✅ Super Admin token verified for ID: ${decoded.id}`);

      const admin = await SuperAdmin.findById(decoded.id)
        .select('-password -refreshToken -__v');

      if (!admin) {
        console.log(`❌ Admin not found for ID: ${decoded.id}`);
        return res.status(401).json({
          success: false,
          error: 'Admin not found',
        });
      }

      console.log(`✅ Super Admin found: ${admin.email}`);

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

      // ─── Attach admin to request ──────────────────────────────────────
      req.admin = admin;
      req.adminId = admin._id;
      req.isSuperAdmin = true;
      req.token = token;
      return next();
    }

    // ─── If neither, deny access ──────────────────────────────────────
    console.log(`❌ Invalid role: ${role}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied. Super Admin or Master Admin required.',
    });

  } catch (error) {
    console.error('❌ Super Admin Auth Error:', error);
    res.status(401).json({
      success: false,
      error: 'Not authorized',
    });
  }
};

// ─── RESTRICT TO SPECIFIC ROLES (Master Admin bypass) ──────────────
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // ✅ Master Admin bypasses role restrictions
    if (req.masterAdmin) {
      return next();
    }

    if (!req.admin || !req.admin.role) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const adminRole = req.admin.role || 'superadmin';
    if (!roles.includes(adminRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

// ─── REFRESH TOKEN MIDDLEWARE ─────────────────────────────────────────
export const refreshSuperAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.superAdminToken;
    
    if (!token) {
      return next();
    }

    const { valid, expired, decoded } = verifyToken(token);
    
    if (valid && decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const timeToExpire = decoded.exp - now;
      
      if (timeToExpire < 3600) {
        console.log('🔄 Token about to expire, refreshing...');
        
        // Check if it's a Master Admin
        if (decoded.role === 'master_admin' || decoded.role === 'platform_owner') {
          const masterAdmin = await MasterAdmin.findById(decoded.id);
          if (masterAdmin && masterAdmin.isActive) {
            const newToken = jwt.sign(
              {
                id: masterAdmin._id,
                email: masterAdmin.email,
                role: masterAdmin.role || 'master_admin',
              },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRE || '7d' }
            );
            res.setHeader('X-New-Token', newToken);
            req.refreshedToken = newToken;
          }
        } else {
          // Super Admin
          const admin = await SuperAdmin.findById(decoded.id);
          if (admin && admin.isActive) {
            const newToken = jwt.sign(
              {
                id: admin._id,
                email: admin.email,
                role: admin.role || 'superadmin',
              },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRE || '7d' }
            );
            res.setHeader('X-New-Token', newToken);
            req.refreshedToken = newToken;
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    next();
  }
};