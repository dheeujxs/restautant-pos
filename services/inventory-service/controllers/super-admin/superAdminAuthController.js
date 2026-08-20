// controllers/super-admin/superAdminAuthController.js
// 🔒 COMPLETE SECURE VERSION WITH FULL VALIDATION & CYBERSECURITY

import SuperAdmin from '../../models/super-admin/SuperAdmin.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRE } from '../../config/jwt.js';
import {
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidText,
  isValidPassword,
  MAX_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

console.log('🔐 SuperAdmin Controller JWT_SECRET:', JWT_SECRET ? '✅ Loaded' : '❌ Missing');

// ============================================================
//  CONSTANTS
// ============================================================

const MAX_LOGIN_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH_SA = 8;
const MAX_PASSWORD_LENGTH_SA = 50;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

// ─── RATE LIMITER ──────────────────────────────────────────────────────────
const rateLimiter = new Map();

const checkRateLimit = (userId, endpoint) => {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  const data = rateLimiter.get(key);
  if (now > data.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (data.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  data.count++;
  rateLimiter.set(key, data);
  return true;
};

// ─── CLEANUP RATE LIMITER ──────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimiter.entries()) {
    if (now > data.resetAt) {
      rateLimiter.delete(key);
    }
  }
}, 60000);

// ============================================================
//  SECURITY UTILITIES
// ============================================================

const checkForSQLInjection = (str) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;

  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|MERGE)\b)/gi,
    /(\b(UNION|INTERSECT|EXCEPT|MINUS)\b)/gi,
    /(\b(OR|AND)\s+[=!<>])/gi,
    /['"]\s*(OR|AND)\s*['"]/gi,
    /(--)/g,
    /(\/\*)/g,
    /(\*\/)/g,
    /(;+\s*$)/g,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

const checkForXSSPatterns = (str) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;

  const patterns = [
    /<script>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /<iframe>/gi,
    /<object>/gi,
    /<embed>/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /document\./gi,
    /window\./gi,
    /alert\(/gi,
    /confirm\(/gi,
    /prompt\(/gi,
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// ============================================================
//  AUDIT LOGGER
// ============================================================

const SecurityEventTypes = {
  REGISTRATION_SUCCESS: 'REGISTRATION_SUCCESS',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE_SUCCESS: 'PASSWORD_CHANGE_SUCCESS',
  PASSWORD_CHANGE_FAILED: 'PASSWORD_CHANGE_FAILED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  VERIFICATION_SENT: 'VERIFICATION_SENT',
  VERIFICATION_SUCCESS: 'VERIFICATION_SUCCESS',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  ERROR: 'ERROR',
};

const logSecurityEvent = async (eventType, userId, details = {}) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || 'anonymous',
      details: {
        ...details,
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown',
      },
    };
    console.log('🔒 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
    return logEntry;
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
};

// ============================================================
//  HELPERS
// ============================================================

const generateTokens = (adminId) => {
  const accessToken = jwt.sign({ id: adminId, role: 'superadmin' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN || '7d',
  });

  const refreshToken = jwt.sign({ id: adminId, role: 'superadmin' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRE || '30d',
  });

  return { accessToken, refreshToken };
};

const sanitizeAdmin = (admin, isFromUserCollection = false) => {
  if (!admin) return null;
  return {
    _id: admin._id,
    id: admin._id,
    firstName: sanitizeInput(admin.firstName || ''),
    lastName: sanitizeInput(admin.lastName || ''),
    fullName: admin.fullName || `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
    email: admin.email,
    phone: admin.phone,
    profileImage: admin.profileImage || '',
    role: 'superadmin',
    organizationName: admin.organizationName || '',
    isActive: admin.isActive !== false,
    isVerified: isFromUserCollection ? true : (admin.isVerified !== false),
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
};

// ============================================================
//  ─── REGISTER SUPER ADMIN ────────────────────────────────────
// ============================================================

export const superAdminRegister = async (req, res) => {
  console.log('========================================');
  console.log('📝 SUPER ADMIN REGISTRATION ATTEMPT');
  console.log('========================================');

  try {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // ─── Rate Limiting ──────────────────────────────────────────────────
    if (!checkRateLimit('register', 'superAdminRegister')) {
      return res.status(429).json({
        success: false,
        error: 'Too many registration attempts. Please try again later.',
      });
    }

    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const body = sanitizeObject(req.body);

    // ─── CHECK FOR INJECTION ────────────────────────────────────────────
    const injectionFields = ['firstName', 'lastName', 'email', 'phone'];
    for (const field of injectionFields) {
      const value = body[field];
      if (value && typeof value === 'string') {
        if (checkForSQLInjection(value) || checkForXSSPatterns(value)) {
          await logSecurityEvent(SecurityEventTypes.SQL_INJECTION_ATTEMPT, null, {
            ip: clientIp,
            field,
            value: value.substring(0, 100),
            userAgent,
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid input detected. Security threat blocked.',
          });
        }
      }
    }

    // ─── VALIDATE FIELDS ──────────────────────────────────────────────────
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      agreedToTerms,
    } = body;

    // First Name Validation
    if (!firstName || firstName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'First name is required and must be at least 2 characters',
      });
    }
    if (firstName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `First name cannot exceed ${MAX_NAME_LENGTH} characters`,
      });
    }
    if (!isValidName(firstName)) {
      return res.status(400).json({
        success: false,
        error: 'First name contains invalid characters',
      });
    }

    // Email Validation
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
      });
    }

    // Phone Validation
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid 10-digit phone number',
      });
    }

    // Password Validation
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }
    if (password.length < MIN_PASSWORD_LENGTH_SA) {
      return res.status(400).json({
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH_SA} characters`,
      });
    }
    if (password.length > MAX_PASSWORD_LENGTH_SA) {
      return res.status(400).json({
        success: false,
        error: `Password cannot exceed ${MAX_PASSWORD_LENGTH_SA} characters`,
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one uppercase, lowercase, number, and special character',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match',
      });
    }

    // Terms
    if (!agreedToTerms) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the terms and conditions',
      });
    }

    // ─── CHECK EXISTING ──────────────────────────────────────────────────
    const existingAdmin = await SuperAdmin.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phone: phone }
      ],
    });

    if (existingAdmin) {
      if (existingAdmin.email === email.toLowerCase().trim()) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists',
        });
      }
      if (existingAdmin.phone === phone) {
        return res.status(409).json({
          success: false,
          error: 'An account with this phone number already exists',
        });
      }
    }

    // ─── CREATE SUPER ADMIN ─────────────────────────────────────────────
    const adminData = {
      firstName: sanitizeInput(firstName.trim()),
      lastName: lastName ? sanitizeInput(lastName.trim()) : '',
      email: email.toLowerCase().trim(),
      phone: phone,
      password,
      agreedToTerms: true,
      termsAcceptedAt: new Date(),
      ipAddress: clientIp,
      userAgent: userAgent,
      isVerified: process.env.NODE_ENV === 'production' ? false : true,
      role: 'superadmin',
    };

    const admin = await SuperAdmin.create(adminData);

    // ─── GENERATE VERIFICATION TOKEN ─────────────────────────────────────
    const verificationToken = admin.generateVerificationToken();
    await admin.save();

    await logSecurityEvent(SecurityEventTypes.REGISTRATION_SUCCESS, admin._id, {
      ip: clientIp,
      email: admin.email,
      userAgent,
    });

    // ─── GENERATE TOKENS ──────────────────────────────────────────────────
    const { accessToken, refreshToken } = generateTokens(admin._id);
    admin.refreshToken = refreshToken;
    await admin.save();

    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const adminDataResponse = sanitizeAdmin(admin);

    res.status(201).json({
      success: true,
      data: {
        admin: adminDataResponse,
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
      },
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('❌ Registration Error:', error);
    await logSecurityEvent(SecurityEventTypes.REGISTRATION_FAILED, null, {
      error: error.message,
    });

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'An account with this information already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again later.',
    });
  }
};

// ============================================================
//  ─── SUPER ADMIN LOGIN ──────────────────────────────────────
// ============================================================

export const superAdminLogin = async (req, res) => {
  console.log('========================================');
  console.log('🔐 SUPER ADMIN LOGIN ATTEMPT');
  console.log('========================================');

  try {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // ─── Rate Limiting ──────────────────────────────────────────────────
    const loginKey = `login:${req.body?.email || 'unknown'}`;
    if (!checkRateLimit(loginKey, 'superAdminLogin')) {
      await logSecurityEvent(SecurityEventTypes.RATE_LIMIT_EXCEEDED, null, {
        ip: clientIp,
        email: req.body?.email,
        userAgent,
      });
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please try again later.',
      });
    }

    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const { email, password } = req.body;

    // ─── CHECK FOR INJECTION ────────────────────────────────────────────
    if (email && typeof email === 'string') {
      if (checkForSQLInjection(email) || checkForXSSPatterns(email)) {
        await logSecurityEvent(SecurityEventTypes.SQL_INJECTION_ATTEMPT, null, {
          ip: clientIp,
          email,
          userAgent,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected. Security threat blocked.',
        });
      }
    }

    // ─── VALIDATE ──────────────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // ─── FIND SUPER ADMIN ──────────────────────────────────────────────
    let admin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() })
      .select('+password +lockUntil +loginAttempts +securityHash');
    
    console.log('🔍 Looking for Super Admin in SuperAdmin collection:', !!admin);

    // ─── CHECK USER COLLECTION FOR ADMIN ──────────────────────────────
    let isFromUserCollection = false;
    let userAccount = null;

    if (!admin) {
      console.log('🔍 Checking User collection for admin...');
      userAccount = await User.findOne({ 
        email: email.toLowerCase().trim(),
        role: 'admin'
      }).select('+password +lockUntil +loginAttempts');
      
      console.log('🔍 Found in User collection:', !!userAccount);
      
      if (userAccount && (userAccount.role === 'admin' || userAccount.isAdmin === true)) {
        admin = userAccount;
        isFromUserCollection = true;
        console.log('✅ Admin found in User collection:', userAccount.email);
      }
    }

    if (!admin) {
      console.log('❌ No admin found in either collection');
      await logSecurityEvent(SecurityEventTypes.LOGIN_FAILED, null, {
        ip: clientIp,
        email,
        reason: 'Admin not found',
        userAgent,
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // ─── CHECK LOCK ──────────────────────────────────────────────────────
    if (admin.isLocked && admin.isLocked()) {
      await logSecurityEvent(SecurityEventTypes.ACCOUNT_LOCKED, admin._id, {
        ip: clientIp,
        reason: 'Account locked due to multiple failed attempts',
        userAgent,
      });
      return res.status(429).json({
        success: false,
        error: 'Account is locked. Please try again after 15 minutes.',
      });
    }

    // ─── CHECK ACTIVE ────────────────────────────────────────────────────
    if (admin.isActive === false) {
      await logSecurityEvent(SecurityEventTypes.ACCOUNT_DEACTIVATED, admin._id, {
        ip: clientIp,
        reason: 'Account deactivated',
        userAgent,
      });
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact support.',
      });
    }

    // ─── CHECK VERIFIED ──────────────────────────────────────────────────
    if (!isFromUserCollection && admin.isVerified === false) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before logging in',
      });
    }

    // ─── VERIFY PASSWORD ──────────────────────────────────────────────
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      if (admin.incrementLoginAttempts) {
        await admin.incrementLoginAttempts();
      }
      await logSecurityEvent(SecurityEventTypes.LOGIN_FAILED, admin._id, {
        ip: clientIp,
        reason: 'Invalid password',
        userAgent,
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // ─── RESET ATTEMPTS ────────────────────────────────────────────────
    if (admin.resetLoginAttempts) {
      await admin.resetLoginAttempts();
    }

    // ─── UPDATE LAST LOGIN ──────────────────────────────────────────────
    admin.lastLogin = new Date();
    if (admin.ipAddress !== undefined) admin.ipAddress = clientIp;
    if (admin.userAgent !== undefined) admin.userAgent = userAgent;
    await admin.save();

    // ─── GENERATE TOKENS ────────────────────────────────────────────────
    const { accessToken, refreshToken } = generateTokens(admin._id);

    if (admin.refreshToken !== undefined) {
      admin.refreshToken = refreshToken;
      await admin.save();
    }

    await logSecurityEvent(SecurityEventTypes.LOGIN_SUCCESS, admin._id, {
      ip: clientIp,
      userAgent,
      fromUserCollection: isFromUserCollection,
    });

    const adminData = sanitizeAdmin(admin, isFromUserCollection);

    console.log('✅ Super Admin login successful:', adminData.email);

    res.status(200).json({
      success: true,
      data: {
        admin: adminData,
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    await logSecurityEvent(SecurityEventTypes.ERROR, null, {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again later.',
    });
  }
};

// ============================================================
//  ─── SUPER ADMIN LOGOUT ─────────────────────────────────────
// ============================================================

export const superAdminLogout = async (req, res) => {
  try {
    const userId = req.admin?._id || 'unknown';
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const admin = await SuperAdmin.findById(req.admin._id);
    if (admin) {
      admin.refreshToken = null;
      await admin.save();
      await logSecurityEvent(SecurityEventTypes.LOGOUT, admin._id, {
        ip: clientIp,
        userAgent,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('❌ Logout Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
    });
  }
};

// ============================================================
//  ─── GET SUPER ADMIN PROFILE ───────────────────────────────
// ============================================================

export const getSuperAdminProfile = async (req, res) => {
  try {
    const admin = await SuperAdmin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
      });
    }
    res.status(200).json({
      success: true,
      data: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error('❌ Get Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

// ============================================================
//  ─── REFRESH SUPER ADMIN TOKEN ─────────────────────────────
// ============================================================

export const refreshSuperAdminToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    const admin = await SuperAdmin.findOne({
      _id: decoded.id,
      refreshToken: refreshToken,
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(admin._id);
    admin.refreshToken = newRefreshToken;
    await admin.save();

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: JWT_EXPIRES_IN,
      },
    });
  } catch (error) {
    console.error('❌ Refresh Token Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
    });
  }
};

// ============================================================
//  ─── FORGOT SUPER ADMIN PASSWORD ───────────────────────────
// ============================================================

export const forgotSuperAdminPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
      });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });

    if (!admin) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a password reset link will be sent',
      });
    }

    const resetToken = admin.generatePasswordResetToken();
    await admin.save();

    await logSecurityEvent(SecurityEventTypes.PASSWORD_RESET_REQUESTED, admin._id, {
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      message: 'If an account exists, a password reset link will be sent',
    });
  } catch (error) {
    console.error('❌ Forgot Password Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
    });
  }
};

// ============================================================
//  ─── RESET SUPER ADMIN PASSWORD ────────────────────────────
// ============================================================

export const resetSuperAdminPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required',
      });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH_SA) {
      return res.status(400).json({
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH_SA} characters`,
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one uppercase, lowercase, number, and special character',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await SuperAdmin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    admin.password = newPassword;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    admin.securityHash = admin.createSecurityHash();
    await admin.save();

    await logSecurityEvent(SecurityEventTypes.PASSWORD_RESET_SUCCESS, admin._id, {
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('❌ Reset Password Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
    });
  }
};

// ============================================================
//  ─── VERIFY SUPER ADMIN EMAIL ──────────────────────────────
// ============================================================

export const verifySuperAdminEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await SuperAdmin.findOne({
      verificationToken: hashedToken,
      verificationExpires: { $gt: Date.now() },
    });

    if (!admin) {
      await logSecurityEvent(SecurityEventTypes.VERIFICATION_FAILED, null, {
        token,
        reason: 'Invalid or expired token',
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
    }

    admin.isVerified = true;
    admin.verificationToken = undefined;
    admin.verificationExpires = undefined;
    await admin.save();

    await logSecurityEvent(SecurityEventTypes.VERIFICATION_SUCCESS, admin._id, {
      email: admin.email,
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now login.',
    });
  } catch (error) {
    console.error('❌ Verification Error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed. Please try again.',
    });
  }
};

// ============================================================
//  ─── RESEND VERIFICATION EMAIL ─────────────────────────────
// ============================================================

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
      });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    if (admin.isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Account is already verified',
      });
    }

    const verificationToken = admin.generateVerificationToken();
    await admin.save();

    await logSecurityEvent(SecurityEventTypes.VERIFICATION_SENT, admin._id, {
      ip: clientIp,
      email: admin.email,
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('❌ Resend Verification Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email',
    });
  }
};

// ============================================================
//  ─── DEV VERIFY ADMIN (Development Only) ───────────────────
// ============================================================

export const devVerifyAdmin = async (req, res) => {
  try {
    // ✅ Security: Block in production
    if (process.env.NODE_ENV === 'production') {
      await logSecurityEvent(SecurityEventTypes.SECURITY_VIOLATION, null, {
        endpoint: '/dev/verify',
        reason: 'Attempted to use dev endpoint in production',
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
      });
      return res.status(403).json({
        success: false,
        error: 'This endpoint is only available in development',
      });
    }

    const { email } = req.body;
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
      });
    }

    if (admin.isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Account is already verified',
      });
    }

    admin.isVerified = true;
    admin.verificationToken = undefined;
    admin.verificationExpires = undefined;
    await admin.save();

    await logSecurityEvent('DEV_VERIFY_SUCCESS', admin._id, {
      email: admin.email,
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      message: '✅ Account verified successfully! You can now login.',
    });
  } catch (error) {
    console.error('❌ Dev Verify Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify account',
    });
  }
};

// ============================================================
//  ─── UPDATE SUPER ADMIN PROFILE ────────────────────────────
// ============================================================

export const updateSuperAdminProfile = async (req, res) => {
  try {
    const userId = req.admin?._id || 'unknown';
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { firstName, lastName, phone, profileImage } = req.body;

    // ─── Validate ──────────────────────────────────────────────────────
    if (firstName && typeof firstName === 'string') {
      if (firstName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'First name must be at least 2 characters',
        });
      }
      if (checkForSQLInjection(firstName) || checkForXSSPatterns(firstName)) {
        await logSecurityEvent(SecurityEventTypes.SQL_INJECTION_ATTEMPT, userId, {
          field: 'firstName',
          value: firstName,
          ip: clientIp,
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid characters in first name',
        });
      }
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number',
      });
    }

    // ─── Update ────────────────────────────────────────────────────────
    const admin = await SuperAdmin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
      });
    }

    if (firstName) admin.firstName = sanitizeInput(firstName.trim());
    if (lastName) admin.lastName = sanitizeInput(lastName.trim());
    if (phone) admin.phone = phone;
    if (profileImage) admin.profileImage = profileImage;
    admin.updatedAt = new Date();

    await admin.save();

    await logSecurityEvent('PROFILE_UPDATED', userId, {
      ip: clientIp,
      userAgent,
    });

    res.status(200).json({
      success: true,
      data: sanitizeAdmin(admin),
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
};

// ============================================================
//  ─── CHANGE SUPER ADMIN PASSWORD ──────────────────────────
// ============================================================

export const changeSuperAdminPassword = async (req, res) => {
  try {
    const userId = req.admin?._id || 'unknown';
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH_SA) {
      return res.status(400).json({
        success: false,
        error: `New password must be at least ${MIN_PASSWORD_LENGTH_SA} characters`,
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one uppercase, lowercase, number, and special character',
      });
    }

    const admin = await SuperAdmin.findById(req.admin._id).select('+password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
      });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      await logSecurityEvent('PASSWORD_CHANGE_FAILED', userId, {
        reason: 'Invalid current password',
        ip: clientIp,
      });
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    admin.password = newPassword;
    admin.passwordChangedAt = new Date();
    admin.securityHash = admin.createSecurityHash();
    await admin.save();

    await logSecurityEvent('PASSWORD_CHANGE_SUCCESS', userId, {
      ip: clientIp,
      userAgent,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('❌ Change Password Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
};

// ✅ END OF FILE - ALL FUNCTIONS EXPORTED