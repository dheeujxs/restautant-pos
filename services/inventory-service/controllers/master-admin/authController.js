// controllers/master-admin/authController.js - UPDATED LOGIN WITH PERMISSIONS

import MasterAdmin from '../../models/master-admin/MasterAdmin.js';
import PlatformAuditLog from '../../models/master-admin/PlatformAuditLog.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';
import { 
  isValidEmail, 
  isValidPhone, 
  isValidName,
  isValidPassword,
  isValidObjectId 
} from '../../utils/validators.js';

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRY_MINUTES = 10;

// ─── Email Transporter ──────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Check if first Master Admin exists ──────────────────────────────────
const isFirstMasterAdmin = async () => {
  const count = await MasterAdmin.countDocuments();
  return count === 0;
};

// ─── Security: SQL Injection Detection ──────────────────────────────────
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

// ─── Security: XSS Detection ──────────────────────────────────────────────
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
  ];
  return patterns.some((pattern) => pattern.test(str));
};

// ─── Send Welcome Email (optional) ──────────────────────────────────────
const sendWelcomeEmail = async (email, fullName, loginUrl) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; text-align: center; }
        .button { display: inline-block; padding: 14px 40px; background: #1a1a2e; color: white; text-decoration: none; border-radius: 10px; margin: 20px 0; font-weight: 600; }
        .footer { background: #f8f7f4; padding: 20px; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👑 Welcome to Ap●s Platform</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${fullName}</strong>,</p>
          <p>Your Master Admin account has been created successfully!</p>
          <p>You can now login to manage the platform:</p>
          <a href="${loginUrl}" class="button">Login to Dashboard</a>
        </div>
        <div class="footer">
          <p>© 2024 Ap●s Restaurant Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Ap●s Platform" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '👑 Welcome to Ap●s Platform',
    html,
  });
};

// ─── Security Event Logger ──────────────────────────────────────────────
const logSecurityEvent = async (eventType, masterAdminId, details = {}) => {
  try {
    console.log('🔒 SECURITY EVENT:', {
      timestamp: new Date().toISOString(),
      eventType,
      masterAdminId: masterAdminId || 'anonymous',
      ...details,
    });
  } catch (error) {
    console.error('❌ Failed to log security event:', error);
  }
};

// ─── Generate JWT Token with ALL Permissions ──────────────────────────────
const generateToken = (masterAdmin) => {
  return jwt.sign(
    { 
      id: masterAdmin._id, 
      role: masterAdmin.role || 'master_admin',
      email: masterAdmin.email,
      firstName: masterAdmin.firstName,
      lastName: masterAdmin.lastName,
      // ✅ Include ALL permission fields
      canCreateSuperAdmin: masterAdmin.canCreateSuperAdmin || false,
      canDeleteSuperAdmin: masterAdmin.canDeleteSuperAdmin || false,
      canModifySuperAdminPermissions: masterAdmin.canModifySuperAdminPermissions || false,
      canViewAllSuperAdmins: masterAdmin.canViewAllSuperAdmins || false,
      canSuspendSuperAdmin: masterAdmin.canSuspendSuperAdmin || false,
      canActivateSuperAdmin: masterAdmin.canActivateSuperAdmin || false,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ============================================================
//  ─── MASTER ADMIN REGISTRATION ─────────────────────────────
// ============================================================

export const registerMasterAdmin = async (req, res) => {
  try {
    console.log('📝 [MASTER_ADMIN] Registration attempt');

    const body = sanitizeObject(req.body);
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      agreedToTerms,
    } = body;

    // ─── Security Check: SQL Injection ──────────────────────────────────
    if (checkForSQLInjection(firstName) || checkForSQLInjection(lastName)) {
      await logSecurityEvent('SQL_INJECTION_ATTEMPT', null, {
        ip: req.ip,
        firstName,
        lastName,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid input detected',
      });
    }

    // ─── Bypass self-registration check for testing ──────────────────────
    console.log('✅ Registration allowed (testing mode)');

    // ─── Validation ──────────────────────────────────────────────────────
    if (!firstName || !isValidName(firstName)) {
      return res.status(400).json({
        success: false,
        error: 'First name is required and must be at least 2 characters',
      });
    }

    if (!lastName || !isValidName(lastName)) {
      return res.status(400).json({
        success: false,
        error: 'Last name is required and must be at least 2 characters',
      });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
      });
    }

    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid phone number',
      });
    }

    if (!password || !isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match',
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the terms and conditions',
      });
    }

    // ─── Check existing Master Admin ─────────────────────────────────────
    const existingMasterAdmin = await MasterAdmin.findOne({ 
      $or: [
        { email: email.toLowerCase().trim() },
        { phone: phone }
      ]
    });

    if (existingMasterAdmin) {
      if (existingMasterAdmin.email === email.toLowerCase().trim()) {
        return res.status(409).json({
          success: false,
          error: 'A Master Admin with this email already exists',
        });
      }
      if (existingMasterAdmin.phone === phone) {
        return res.status(409).json({
          success: false,
          error: 'A Master Admin with this phone number already exists',
        });
      }
    }

    // ─── Check if this is the first Master Admin ──────────────────────
    const isFirst = await isFirstMasterAdmin();

    // ─── Create Master Admin ─────────────────────────────────────────────
    const normalizedEmail = email.toLowerCase().trim();
    const sanitizedFirstName = sanitizeInput(firstName.trim());
    const sanitizedLastName = sanitizeInput(lastName.trim());

    const masterAdminData = {
      firstName: sanitizedFirstName,
      lastName: sanitizedLastName,
      email: normalizedEmail,
      phone,
      password,
      role: isFirst ? 'platform_owner' : 'master_admin',
      permissions: isFirst ? ['*'] : [],
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
      canCreateSuperAdmin: isFirst,
      canDeleteSuperAdmin: isFirst,
      canModifySuperAdminPermissions: isFirst,
      canViewAllSuperAdmins: isFirst,
      canSuspendSuperAdmin: isFirst,
      canActivateSuperAdmin: isFirst, // ✅ Add this
      emailVerified: true,
      lastIP: req.ip || req.connection?.remoteAddress || '',
      lastUserAgent: req.headers['user-agent'] || '',
    };

    // ─── Platform settings for first Master Admin ──────────────────────
    if (isFirst) {
      masterAdminData.platformSettings = {
        maintenanceMode: false,
        maintenanceMessage: '',
        maxRestaurants: 1000,
        maxBranchesPerRestaurant: 50,
        maxStaffPerRestaurant: 200,
        allowSelfRegistration: false,
        requireEmailVerification: false,
        requirePhoneVerification: false,
      };
    }

    const masterAdmin = await MasterAdmin.create(masterAdminData);

    // ─── (Optional) Send welcome email ──────────────────────────────────
    const fullName = `${sanitizedFirstName} ${sanitizedLastName}`;
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/master-admin/login`;
    
    try {
      await sendWelcomeEmail(normalizedEmail, fullName, loginUrl);
      console.log(`📧 Welcome email sent to ${normalizedEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError);
    }

    // ─── Audit Log ──────────────────────────────────────────────────────
    await PlatformAuditLog.create({
      masterAdminId: masterAdmin._id,
      actorType: 'master_admin',
      actorEmail: masterAdmin.email,
      actorName: fullName,
      action: isFirst ? 'FIRST_MASTER_ADMIN_REGISTERED' : 'MASTER_ADMIN_REGISTERED',
      targetType: 'master_admin',
      targetId: masterAdmin._id.toString(),
      targetName: fullName,
      details: {
        isFirst,
        role: masterAdmin.role,
      },
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // ─── Response ──────────────────────────────────────────────────────
    res.status(201).json({
      success: true,
      message: isFirst 
        ? '👑 Platform Owner registered successfully! You can now login.'
        : '✅ Registration successful! You can now login.',
      data: {
        id: masterAdmin._id,
        firstName: masterAdmin.firstName,
        lastName: masterAdmin.lastName,
        email: masterAdmin.email,
        phone: masterAdmin.phone,
        role: masterAdmin.role,
        isFirst,
        emailVerified: masterAdmin.emailVerified,
        canCreateSuperAdmin: masterAdmin.canCreateSuperAdmin,
        canDeleteSuperAdmin: masterAdmin.canDeleteSuperAdmin,
        canModifySuperAdminPermissions: masterAdmin.canModifySuperAdminPermissions,
        canViewAllSuperAdmins: masterAdmin.canViewAllSuperAdmins,
        canSuspendSuperAdmin: masterAdmin.canSuspendSuperAdmin,
        canActivateSuperAdmin: masterAdmin.canActivateSuperAdmin,
      },
    });

  } catch (error) {
    console.error('❌ Master Admin Registration Error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A Master Admin with this information already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to register Master Admin. Please try again.',
    });
  }
};

// ============================================================
//  ─── MASTER ADMIN LOGIN (With Permissions in Token) ───────
// ============================================================

export const loginMasterAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔐 [MASTER_ADMIN] Login attempt: ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const masterAdmin = await MasterAdmin.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

    if (!masterAdmin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ─── Check if account is locked ─────────────────────────────────────
    if (masterAdmin.isLocked) {
      const lockUntil = masterAdmin.lockUntil;
      if (lockUntil && new Date() < lockUntil) {
        const remainingMinutes = Math.ceil((lockUntil - new Date()) / 60000);
        return res.status(403).json({
          success: false,
          error: `Account locked. Please try again in ${remainingMinutes} minutes.`,
          lockUntil,
        });
      }
      if (lockUntil && new Date() >= lockUntil) {
        masterAdmin.isLocked = false;
        masterAdmin.failedLoginAttempts = 0;
        await masterAdmin.save();
      }
    }

    // ─── Check password ──────────────────────────────────────────────────
    const isMatch = await masterAdmin.comparePassword(password);
    if (!isMatch) {
      masterAdmin.failedLoginAttempts += 1;
      
      if (masterAdmin.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        masterAdmin.isLocked = true;
        masterAdmin.lockUntil = new Date(Date.now() + LOCKOUT_DURATION);
        await masterAdmin.save();
        
        return res.status(403).json({
          success: false,
          error: `Too many failed attempts. Account locked for 15 minutes.`,
          lockUntil: masterAdmin.lockUntil,
        });
      }
      
      await masterAdmin.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - masterAdmin.failedLoginAttempts,
      });
    }

    // ─── Check if account is active ─────────────────────────────────────
    if (!masterAdmin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact support.',
      });
    }

    // ─── Reset failed attempts and update login info ────────────────────
    masterAdmin.failedLoginAttempts = 0;
    masterAdmin.isLocked = false;
    masterAdmin.lockUntil = null;
    masterAdmin.lastLogin = new Date();
    masterAdmin.loginCount += 1;
    masterAdmin.lastIP = req.ip || req.connection?.remoteAddress || '';
    masterAdmin.lastUserAgent = req.headers['user-agent'] || '';
    await masterAdmin.save();

    // ✅ ─── Generate Token with ALL Permissions ──────────────────────────
    const token = generateToken(masterAdmin);

    // ─── Audit Log ──────────────────────────────────────────────────────
    await PlatformAuditLog.create({
      masterAdminId: masterAdmin._id,
      actorType: 'master_admin',
      actorEmail: masterAdmin.email,
      actorName: `${masterAdmin.firstName} ${masterAdmin.lastName}`,
      action: 'LOGIN_SUCCESS',
      targetType: 'master_admin',
      targetId: masterAdmin._id.toString(),
      targetName: `${masterAdmin.firstName} ${masterAdmin.lastName}`,
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // ─── Response ────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      masterAdmin: {
        id: masterAdmin._id,
        firstName: masterAdmin.firstName,
        lastName: masterAdmin.lastName,
        fullName: masterAdmin.fullName,
        email: masterAdmin.email,
        phone: masterAdmin.phone,
        role: masterAdmin.role,
        permissions: masterAdmin.permissions,
        isActive: masterAdmin.isActive,
        emailVerified: masterAdmin.emailVerified,
        platformSettings: masterAdmin.platformSettings,
        stats: masterAdmin.stats,
        canCreateSuperAdmin: masterAdmin.canCreateSuperAdmin,
        canDeleteSuperAdmin: masterAdmin.canDeleteSuperAdmin,
        canModifySuperAdminPermissions: masterAdmin.canModifySuperAdminPermissions,
        canViewAllSuperAdmins: masterAdmin.canViewAllSuperAdmins,
        canSuspendSuperAdmin: masterAdmin.canSuspendSuperAdmin,
        canActivateSuperAdmin: masterAdmin.canActivateSuperAdmin,
        lastLogin: masterAdmin.lastLogin,
        loginCount: masterAdmin.loginCount,
      },
    });

  } catch (error) {
    console.error('❌ Master Admin Login Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
};

// ─── Logout Master Admin ──────────────────────────────────────────────────
export const logoutMasterAdmin = async (req, res) => {
  try {
    const masterAdmin = req.masterAdmin;
    
    if (masterAdmin) {
      await PlatformAuditLog.create({
        masterAdminId: masterAdmin._id,
        actorType: 'master_admin',
        actorEmail: masterAdmin.email,
        actorName: `${masterAdmin.firstName} ${masterAdmin.lastName}`,
        action: 'LOGOUT',
        targetType: 'master_admin',
        targetId: masterAdmin._id.toString(),
        targetName: `${masterAdmin.firstName} ${masterAdmin.lastName}`,
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
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

// ─── Get Master Admin Profile ──────────────────────────────────────────
export const getMasterAdminProfile = async (req, res) => {
  try {
    const masterAdmin = req.masterAdmin;
    
    if (!masterAdmin) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: masterAdmin._id,
        firstName: masterAdmin.firstName,
        lastName: masterAdmin.lastName,
        fullName: masterAdmin.fullName,
        email: masterAdmin.email,
        phone: masterAdmin.phone,
        role: masterAdmin.role,
        permissions: masterAdmin.permissions,
        isActive: masterAdmin.isActive,
        emailVerified: masterAdmin.emailVerified,
        platformSettings: masterAdmin.platformSettings,
        stats: masterAdmin.stats,
        canCreateSuperAdmin: masterAdmin.canCreateSuperAdmin,
        canDeleteSuperAdmin: masterAdmin.canDeleteSuperAdmin,
        canModifySuperAdminPermissions: masterAdmin.canModifySuperAdminPermissions,
        canViewAllSuperAdmins: masterAdmin.canViewAllSuperAdmins,
        canSuspendSuperAdmin: masterAdmin.canSuspendSuperAdmin,
        canActivateSuperAdmin: masterAdmin.canActivateSuperAdmin,
        lastLogin: masterAdmin.lastLogin,
        loginCount: masterAdmin.loginCount,
        createdAt: masterAdmin.createdAt,
        updatedAt: masterAdmin.updatedAt,
      },
    });

  } catch (error) {
    console.error('❌ Get Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

// ─── Resend Verification (No-op) ──────────────────────────────────────────
export const resendVerificationEmail = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Email verification is not required for Master Admin accounts.',
  });
};

// ─── Verify Email (No-op) ────────────────────────────────────────────────
export const verifyMasterAdminEmail = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Email verification is not required for Master Admin accounts.',
  });
};