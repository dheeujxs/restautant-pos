// controllers/authController.js - COMPLETE FIX

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import SuperAdmin from '../models/super-admin/SuperAdmin.js';
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import generateToken from '../utils/generateToken.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';
import { 
  isValidObjectId, 
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidPassword,
  isValidText,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

console.log('🔐 Auth Controller JWT_SECRET:', JWT_SECRET ? '✅ Loaded' : '❌ Missing');

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();
const loginAttempts = new Map();

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Verify transporter connection
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email transporter ready');
  } catch (error) {
    console.error('❌ Email transporter error:', error.message);
  }
};
verifyTransporter();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check login attempts
const checkLoginAttempts = (email) => {
  const key = `login_${email}`;
  const now = Date.now();
  
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, { count: 1, lockUntil: null });
    return true;
  }
  
  const data = loginAttempts.get(key);
  
  if (data.lockUntil && now < data.lockUntil) {
    return false;
  }
  
  if (data.lockUntil && now >= data.lockUntil) {
    loginAttempts.set(key, { count: 1, lockUntil: null });
    return true;
  }
  
  if (data.count >= MAX_LOGIN_ATTEMPTS) {
    data.lockUntil = now + LOCKOUT_DURATION;
    loginAttempts.set(key, data);
    return false;
  }
  
  data.count++;
  loginAttempts.set(key, data);
  return true;
};

// Reset login attempts on successful login
const resetLoginAttempts = (email) => {
  const key = `login_${email}`;
  loginAttempts.delete(key);
};

// Validate OTP
const isValidOTP = (otp) => {
  if (!otp) return false;
  return /^[0-9]{6}$/.test(otp);
};

// ✅ FIXED: Sanitize user data with Super Admin support
const sanitizeUser = (user, isSuperAdmin = false) => {
  if (!user) return null;
  
  // ✅ Super Admin
  if (isSuperAdmin || user.role === 'superadmin' || user.__t === 'SuperAdmin') {
    return {
      id: user._id,
      _id: user._id,
      firstName: sanitizeInput(user.firstName || ''),
      lastName: sanitizeInput(user.lastName || ''),
      email: user.email,
      phone: user.phone || '',
      role: 'superadmin',
      isAdmin: false,
      userType: 'Super Admin',
      profileImage: user.profileImage || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
  
  // ✅ Regular User
  return {
    id: user._id,
    _id: user._id,
    firstName: sanitizeInput(user.firstName || ''),
    lastName: sanitizeInput(user.lastName || ''),
    email: user.email,
    phone: user.phone || '',
    role: user.role || 'user',
    isAdmin: user.isAdmin || false,
    userType: user.isAdmin ? 'Admin' : 'Customer',
    profileImage: user.profileImage || '',
    restaurantId: user.restaurantId || null,
    restaurantName: user.restaurantName || '',
    branchId: user.branchId || null,
    branchName: user.branchName || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// Send OTP email
const sendOTPEmail = async (email, otp, clientIp) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Password Reset OTP</title>
      <style>
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f97316, #ef4444); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; text-align: center; }
        .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f97316; background: #fff7ed; padding: 15px; border-radius: 12px; display: inline-block; margin: 20px 0; }
        .warning { background: #fef2f2; padding: 10px; border-radius: 8px; margin: 10px 0; font-size: 12px; color: #dc2626; }
        .footer { background: #f8f7f4; padding: 20px; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
          <p>We received a request to reset your password.</p>
          <div class="otp-code">${otp}</div>
          <p>This OTP is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
          <div class="warning">
            ⚠️ If you didn't request this, please ignore this email.
            <br/>Never share this OTP with anyone.
          </div>
        </div>
        <div class="footer">
          <p>Ap●s Restaurant Management System</p>
        </div>
      </div>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Ap●s Restaurant" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔐 Password Reset OTP',
      html,
    });
    console.log(`📧 OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send OTP email');
  }
};

// ============================================================
//  AUTH CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Register user
// @route   POST /api/auth/register
// ──────────────────────────────────────────────────────────────────────────

export const register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

  // Validation
  if (!firstName || !isValidName(firstName)) {
    return next(new ErrorResponse(`First name must be between 1 and ${MAX_NAME_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`, 400));
  }

  if (lastName && !isValidName(lastName)) {
    return next(new ErrorResponse(`Last name must be between 1 and ${MAX_NAME_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`, 400));
  }

  if (!email || !isValidEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  if (phone && !isValidPhone(phone)) {
    return next(new ErrorResponse('Please provide a valid 10-digit phone number', 400));
  }

  if (!password) {
    return next(new ErrorResponse('Password is required', 400));
  }

  if (!isValidPassword(password)) {
    return next(new ErrorResponse(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      400
    ));
  }

  if (password !== confirmPassword) {
    return next(new ErrorResponse('Passwords do not match', 400));
  }

  // Check existing user
  const existingUser = await User.findOne({ 
    $or: [
      { email: email.toLowerCase().trim() },
      { phone: phone || '' }
    ]
  });
  
  if (existingUser) {
    if (existingUser.email === email.toLowerCase().trim()) {
      return next(new ErrorResponse('User already exists with this email', 409));
    }
    if (phone && existingUser.phone === phone) {
      return next(new ErrorResponse('User already exists with this phone number', 409));
    }
  }

  // Create user
  const userCount = await User.countDocuments();
  const isAdmin = userCount === 0;

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName ? lastName.trim() : '',
    email: email.toLowerCase().trim(),
    phone: phone || '',
    password,
    isAdmin,
    role: isAdmin ? 'admin' : 'user',
  });

  const token = generateToken(user._id.toString(), user.role);

  res.status(201).json({
    success: true,
    message: `User registered successfully${isAdmin ? ' as Admin' : ''}`,
    token,
    user: sanitizeUser(user),
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Login user - FIXED for Super Admin
// @route   POST /api/auth/login
// ──────────────────────────────────────────────────────────────────────────

// controllers/authController.js - Update login function

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  console.log('🔐 Login attempt for:', email);

  if (!email || !isValidEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  if (!password) {
    return next(new ErrorResponse('Password is required', 400));
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!checkLoginAttempts(normalizedEmail)) {
    const attempts = loginAttempts.get(`login_${normalizedEmail}`);
    const remainingTime = Math.ceil((attempts.lockUntil - Date.now()) / 60000);
    return next(new ErrorResponse(
      `Too many failed attempts. Account locked for ${remainingTime} minutes.`,
      429
    ));
  }

  // ✅ Check SuperAdmin FIRST
  let user = await SuperAdmin.findOne({ email: normalizedEmail }).select('+password');
  let isSuperAdminUser = false;
  
  if (user) {
    isSuperAdminUser = true;
    console.log('✅ Found in SuperAdmin collection:', user.email);
  } else {
    // If not found in SuperAdmin, check User
    user = await User.findOne({ email: normalizedEmail }).select('+password');
    console.log('🔍 Found in User collection:', !!user);
  }
  
  if (!user) {
    return next(new ErrorResponse('Invalid email or password', 401));
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ErrorResponse('Invalid email or password', 401));
  }

  resetLoginAttempts(normalizedEmail);

  if (user.isActive === false) {
    return next(new ErrorResponse('Your account has been deactivated. Please contact admin.', 403));
  }

  // ✅ Generate token with proper role
  const userRole = isSuperAdminUser ? 'superadmin' : (user.role || 'user');
  const token = generateToken(user._id.toString(), userRole);

  console.log('✅ Login successful for:', email, 'Role:', userRole);

  // ✅ Return proper user data
  const userData = sanitizeUser(user, isSuperAdminUser);

  // ✅ CRITICAL: Always return the user in a consistent format
  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: userData, // Always return as 'user'
    admin: userData, // Also return as 'admin' for backward compatibility
    isAdmin: userRole === 'admin' || userRole === 'superadmin',
    role: userRole,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get current user/staff profile - FIXED for Super Admin
// @route   GET /api/auth/profile
// ──────────────────────────────────────────────────────────────────────────

// controllers/authController.js - Update getProfile function

export const getProfile = asyncHandler(async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ErrorResponse('Not authorized, no token', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('🔍 Decoded token:', { 
        id: decoded.id, 
        role: decoded.role,
        staffId: decoded.staffId,
        isStaff: decoded.isStaff,
        employeeId: decoded.employeeId
      });
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      return next(new ErrorResponse('Invalid or expired token', 401));
    }

    // ✅ Check if it's staff (by staffId OR isStaff flag)
    if (decoded.staffId || decoded.isStaff) {
      const staffId = decoded.staffId || decoded.id;
      console.log('🔍 Looking for Staff with ID:', staffId);
      
      const staff = await Staff.findById(staffId)
        .populate('role')
        .populate('roles');
      
      if (!staff) {
        console.warn('⚠️ Staff not found with ID:', staffId);
        return next(new ErrorResponse('Staff not found', 404));
      }

      const staffObj = staff.toObject();
      delete staffObj.password;
      if (staffObj.pin) delete staffObj.pin;

      // ✅ Get all roles and permissions
      const { roles: allRoles, permissions } = await staff.getAllRolesAndPermissions?.() || { 
        roles: [staff.role?.name || 'Staff'], 
        permissions: staff.role?.permissions || [] 
      };

      console.log('✅ Staff found:', staff.name, 'Roles:', allRoles);

      return res.status(200).json({
        success: true,
        data: {
          _id: staff._id,
          id: staff._id,
          firstName: sanitizeInput(staff.name),
          lastName: '',
          name: sanitizeInput(staff.name),
          email: staff.email || '',
          phone: staff.phoneNumber || '',
          role: staff.role?.name || 'Staff',
          allRoles: allRoles,
          userType: 'Staff',
          isAdmin: false,
          employeeId: staff.employeeId,
          permissions: permissions,
          profileImage: staff.profileImage || '',
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
          canLoginKitchenPortal: staff.canLoginKitchenPortal,
          status: staff.status,
        }
      });
    }

    // ✅ CHECK: Is this a Super Admin?
    if (decoded.role === 'superadmin') {
      console.log('🔍 Looking for Super Admin with ID:', decoded.id);
      const superAdmin = await SuperAdmin.findById(decoded.id).select('-password');
      
      if (superAdmin) {
        console.log('✅ Super Admin found:', superAdmin.email);
        return res.status(200).json({
          success: true,
          data: sanitizeUser(superAdmin, true)
        });
      }
      console.warn('⚠️ Super Admin not found with ID:', decoded.id);
      return next(new ErrorResponse('Super Admin not found', 404));
    }

    // ✅ Check regular User
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return next(new ErrorResponse('Invalid token payload', 401));
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.warn('⚠️ User not found with ID:', userId);
      return next(new ErrorResponse('User not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    return next(new ErrorResponse('Failed to fetch profile', 500));
  }
});;

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Update user profile
// @route   PUT /api/auth/profile
// ──────────────────────────────────────────────────────────────────────────

export const updateProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, phone } = req.body;

  if (firstName && !isValidName(firstName)) {
    return next(new ErrorResponse(`First name must be between 1 and ${MAX_NAME_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`, 400));
  }

  if (lastName && !isValidName(lastName)) {
    return next(new ErrorResponse(`Last name must be between 1 and ${MAX_NAME_LENGTH} characters and contain only letters, spaces, hyphens, and apostrophes`, 400));
  }

  if (phone && !isValidPhone(phone)) {
    return next(new ErrorResponse('Please provide a valid 10-digit phone number', 400));
  }

  const updateData = {};
  if (firstName) updateData.firstName = sanitizeInput(firstName.trim());
  if (lastName) updateData.lastName = sanitizeInput(lastName.trim());
  if (phone) updateData.phone = phone;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: sanitizeUser(user),
    message: 'Profile updated successfully'
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Update profile image
// @route   PUT /api/auth/profile-image
// ──────────────────────────────────────────────────────────────────────────

export const updateProfileImage = asyncHandler(async (req, res, next) => {
  const { profileImage } = req.body;

  if (profileImage) {
    if (profileImage.startsWith('data:image')) {
      const base64Data = profileImage.split(',')[1];
      if (!base64Data) {
        return next(new ErrorResponse('Invalid image data format', 400));
      }
      
      const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
      if (sizeInBytes > 5 * 1024 * 1024) {
        return next(new ErrorResponse('Image size exceeds 5MB limit', 400));
      }
    } else if (!profileImage.startsWith('http')) {
      return next(new ErrorResponse('Invalid image format. Provide URL or base64 image.', 400));
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { profileImage: profileImage || '' } },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: sanitizeUser(user),
    message: profileImage ? 'Profile image updated successfully' : 'Profile image removed successfully'
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Change password
// @route   PUT /api/auth/change-password
// ──────────────────────────────────────────────────────────────────────────

export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword) {
    return next(new ErrorResponse('Current password is required', 400));
  }

  if (!newPassword) {
    return next(new ErrorResponse('New password is required', 400));
  }

  if (!isValidPassword(newPassword)) {
    return next(new ErrorResponse(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      400
    ));
  }

  if (currentPassword === newPassword) {
    return next(new ErrorResponse('New password must be different from current password', 400));
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Forgot password - Send OTP
// @route   POST /api/auth/forgot-password
// ──────────────────────────────────────────────────────────────────────────

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide email', 400));
  }

  if (!isValidEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If an account exists, OTP will be sent',
    });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

  otpStore.delete(email.toLowerCase().trim());
  otpStore.set(email.toLowerCase().trim(), { 
    otp, 
    expiresAt,
    attempts: 0,
  });

  try {
    await sendOTPEmail(email, otp);
    console.log(`📧 OTP for ${email}: ${otp}`);
  } catch (error) {
    return next(new ErrorResponse(error.message || 'Failed to send OTP email. Please try again later.', 500));
  }

  res.status(200).json({
    success: true,
    message: 'OTP sent to your email',
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// ──────────────────────────────────────────────────────────────────────────

export const verifyOTP = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new ErrorResponse('Please provide email and OTP', 400));
  }

  if (!isValidEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  if (!isValidOTP(otp)) {
    return next(new ErrorResponse('Invalid OTP format. Please enter a 6-digit code.', 400));
  }

  const normalizedEmail = email.toLowerCase().trim();
  const stored = otpStore.get(normalizedEmail);
  
  if (!stored) {
    return next(new ErrorResponse('OTP expired or not found. Please request a new OTP.', 400));
  }

  if (stored.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(normalizedEmail);
    return next(new ErrorResponse('Too many failed attempts. Please request a new OTP.', 400));
  }

  if (stored.otp !== otp) {
    stored.attempts++;
    otpStore.set(normalizedEmail, stored);
    return next(new ErrorResponse('Invalid OTP', 400));
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(normalizedEmail);
    return next(new ErrorResponse('OTP expired. Please request a new OTP.', 400));
  }

  otpStore.set(`${normalizedEmail}_verified`, { 
    verified: true, 
    expiresAt: Date.now() + 5 * 60 * 1000 
  });
  
  otpStore.delete(normalizedEmail);

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Reset password
// @route   POST /api/auth/reset-password
// ──────────────────────────────────────────────────────────────────────────

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return next(new ErrorResponse('Please provide email, OTP and new password', 400));
  }

  if (!isValidEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  if (!isValidOTP(otp)) {
    return next(new ErrorResponse('Invalid OTP format. Please enter a 6-digit code.', 400));
  }

  if (!isValidPassword(newPassword)) {
    return next(new ErrorResponse(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      400
    ));
  }

  const normalizedEmail = email.toLowerCase().trim();
  
  const verified = otpStore.get(`${normalizedEmail}_verified`);
  if (!verified || !verified.verified || Date.now() > verified.expiresAt) {
    return next(new ErrorResponse('OTP not verified or expired. Please verify your OTP first.', 400));
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  user.password = newPassword;
  await user.save();

  otpStore.delete(`${normalizedEmail}_verified`);
  otpStore.delete(normalizedEmail);

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Logout user (clear token on client side)
// @route   POST /api/auth/logout
// ──────────────────────────────────────────────────────────────────────────

export const logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Check if email exists
// @route   POST /api/auth/check-email
// ──────────────────────────────────────────────────────────────────────────

export const checkEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  
  res.status(200).json({
    success: true,
    exists: !!user,
    message: user ? 'Email is registered' : 'Email is available',
  });
});

// ============================================================
//  CLEANUP (Keep for OTP and login attempts)
// ============================================================

// Clean up OTP store and login attempts periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  
  // Clean up login attempts
  for (const [key, data] of loginAttempts.entries()) {
    if (data.lockUntil && now > data.lockUntil) {
      loginAttempts.delete(key);
    }
    if (!data.lockUntil && data.count === 0) {
      loginAttempts.delete(key);
    }
  }
  
  // Clean up OTP store
  for (const [key, data] of otpStore.entries()) {
    if (data.expiresAt && now > data.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 60000); // Clean up every minute