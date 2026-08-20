// middleware/masterAdminAuth.js - COMPLETE WITH EXPORTS

import jwt from 'jsonwebtoken';
import MasterAdmin from '../models/master-admin/MasterAdmin.js';

// ─── Protect Master Admin Routes ──────────────────────────────────────
export const protectMasterAdmin = async (req, res, next) => {
  try {
    let token;

    // ─── Extract token from header ──────────────────────────────────────
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized. Please login first.',
      });
    }

    // ─── Verify token ──────────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN',
      });
    }

    // ─── Check role ──────────────────────────────────────────────────────
    if (decoded.role !== 'master_admin' && decoded.role !== 'platform_owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Master Admin only.',
      });
    }

    // ─── Find Master Admin ──────────────────────────────────────────────
    const masterAdmin = await MasterAdmin.findById(decoded.id);
    if (!masterAdmin) {
      return res.status(401).json({
        success: false,
        error: 'Master Admin not found',
      });
    }

    // ─── Check if account is active ─────────────────────────────────────
    if (!masterAdmin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact support.',
      });
    }

    // ─── Check if account is locked ─────────────────────────────────────
    if (masterAdmin.isLocked) {
      const lockUntil = masterAdmin.lockUntil;
      if (lockUntil && new Date() < lockUntil) {
        return res.status(403).json({
          success: false,
          error: 'Account is locked. Please try again later.',
          lockUntil,
        });
      }
    }

    // ─── Check if email is verified ─────────────────────────────────────
    if (!masterAdmin.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before accessing the platform.',
        requiresVerification: true,
      });
    }

    // ─── Attach Master Admin to request ──────────────────────────────────
    req.masterAdmin = masterAdmin;
    req.masterAdminToken = token;

    console.log(`✅ Master Admin authenticated: ${masterAdmin.email} (${masterAdmin.role})`);
    next();

  } catch (error) {
    console.error('❌ Master Admin Auth Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error. Please try again.',
    });
  }
};

// ─── Permission Check Middleware ────────────────────────────────────────
export const requireMasterAdminPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.masterAdmin) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      // Platform Owner has all permissions
      if (req.masterAdmin.role === 'platform_owner') {
        return next();
      }

      // Check specific permission
      if (!req.masterAdmin.hasPermission(permission)) {
        return res.status(403).json({
          success: false,
          error: `Permission denied. Required: ${permission}`,
        });
      }

      next();
    } catch (error) {
      console.error('❌ Permission Check Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization error',
      });
    }
  };
};

// ─── Default export (for compatibility) ──────────────────────────────────
export default {
  protectMasterAdmin,
  requireMasterAdminPermission,
};