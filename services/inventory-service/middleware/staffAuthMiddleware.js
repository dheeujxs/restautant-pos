// middleware/staffAuthMiddleware.js - FIXED

import Staff from '../models/Staff.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'staff_secret_key';

export const protectStaff = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;
    
    console.log('🔑 Staff Auth - Headers:', req.headers);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('✅ Token from Authorization header');
    } else if (req.cookies?.staffToken) {
      token = req.cookies.staffToken;
      console.log('✅ Token from cookies');
    } else if (req.body?.staffToken) {
      token = req.body.staffToken;
      console.log('✅ Token from body');
    }
    
    console.log('🔑 Staff Auth - Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized, no token',
      });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('📦 Decoded token:', { 
        staffId: decoded.staffId, 
        employeeId: decoded.employeeId,
        roles: decoded.roles,
        isStaff: decoded.isStaff 
      });
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
    
    // ✅ Check if token has staffId
    if (!decoded.staffId) {
      console.error('❌ No staffId in token');
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
      });
    }
    
    // ✅ POPULATE ROLE AND ROLES
    const staff = await Staff.findById(decoded.staffId)
      .populate('role')
      .populate('roles');
    
    console.log('👤 Staff found:', staff?.name);
    
    if (!staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    if (!staff.canLoginKitchenPortal) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have staff portal access.',
      });
    }
    
    if (staff.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is inactive. Please contact administrator.',
      });
    }
    
    // ✅ Get all roles and permissions
    const { roles: allRoles, permissions } = await staff.getAllRolesAndPermissions?.() || { roles: ['Staff'], permissions: [] };
    
    // ✅ Attach to request
    req.staff = staff;
    req.staff.allRoles = allRoles;
    req.staff.permissions = permissions;
    req.staff.primaryRole = allRoles.length > 0 ? allRoles[0] : 'Staff';
    
    console.log('🎭 All Roles:', allRoles);
    console.log('⭐ Primary Role:', req.staff.primaryRole);
    console.log('🔑 Permissions:', permissions);
    
    next();
  } catch (error) {
    console.error('❌ Staff auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Not authorized',
    });
  }
};

// ✅ Updated authorizeStaffRoles - Support multiple roles
export const authorizeStaffRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff not authenticated',
      });
    }
    
    // ✅ Check against all roles
    const staffRoles = req.staff.allRoles || [];
    const hasAllowedRole = staffRoles.some(role => 
      allowedRoles.some(allowed => allowed.toLowerCase() === role.toLowerCase())
    );
    
    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        error: `Role not authorized for this action. Required: ${allowedRoles.join(', ')}. Your roles: ${staffRoles.join(', ')}`,
      });
    }
    next();
  };
};

// ✅ New: Permission-based authorization
export const authorizeStaffPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff not authenticated',
      });
    }
    
    const staffPermissions = req.staff.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission =>
      staffPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: `Missing required permissions: ${requiredPermissions.join(', ')}`,
      });
    }
    next();
  };
};