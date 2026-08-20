// controllers/super-admin/superAdminProfileController.js

import SuperAdmin from '../../models/super-admin/SuperAdmin.js';
import bcrypt from 'bcryptjs';
import { 
  isValidObjectId, 
  isValidEmail, 
  isValidPhone, 
  isValidName,
  isValidPassword,
  MAX_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

// ============================================================
//  ─── GET SUPER ADMIN PROFILE ────────────────────────────────
// ============================================================

export const getSuperAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin?._id || req.user?._id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const admin = await SuperAdmin.findById(adminId)
      .select('-password -refreshToken -verificationToken -passwordResetToken')
      .lean();

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Super Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('❌ Get Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

// ============================================================
//  ─── UPDATE SUPER ADMIN PROFILE ────────────────────────────
// ============================================================

export const updateSuperAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin?._id || req.user?._id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const body = sanitizeObject(req.body);
    const {
      firstName,
      lastName,
      email,
      phone,
      organizationName,
      address,
    } = body;

    // ─── FIND ADMIN ──────────────────────────────────────────────────
    const admin = await SuperAdmin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Super Admin not found'
      });
    }

    // ─── VALIDATE ──────────────────────────────────────────────────
    if (firstName && !isValidName(firstName)) {
      return res.status(400).json({
        success: false,
        error: `First name must be between 1 and ${MAX_NAME_LENGTH} characters`
      });
    }

    if (lastName && !isValidName(lastName)) {
      return res.status(400).json({
        success: false,
        error: `Last name must be between 1 and ${MAX_NAME_LENGTH} characters`
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid phone number'
      });
    }

    // ─── CHECK DUPLICATE EMAIL ────────────────────────────────────
    if (email && email !== admin.email) {
      const existing = await SuperAdmin.findOne({ 
        email: email.toLowerCase().trim() 
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use by another account'
        });
      }
    }

    // ─── UPDATE ──────────────────────────────────────────────────
    const updateData = {};

    if (firstName) updateData.firstName = sanitizeInput(firstName.trim());
    if (lastName) updateData.lastName = sanitizeInput(lastName.trim());
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone) updateData.phone = phone;
    if (organizationName) updateData.organizationName = sanitizeInput(organizationName.trim());

    if (address) {
      updateData.address = {
        street: sanitizeInput(address.street?.trim() || admin.address?.street || ''),
        city: sanitizeInput(address.city?.trim() || admin.address?.city || ''),
        state: sanitizeInput(address.state?.trim() || admin.address?.state || ''),
        country: address.country || admin.address?.country || 'India',
        pincode: address.pincode || admin.address?.pincode || '',
        location: address.location || admin.address?.location || {},
      };
    }

    const updatedAdmin = await SuperAdmin.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -verificationToken -passwordResetToken');

    res.status(200).json({
      success: true,
      data: updatedAdmin,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

// ============================================================
//  ─── CHANGE SUPER ADMIN PASSWORD ───────────────────────────
// ============================================================

export const changeSuperAdminPassword = async (req, res) => {
  try {
    const adminId = req.admin?._id || req.user?._id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: `New password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`
      });
    }

    // ─── FIND ADMIN WITH PASSWORD ──────────────────────────────────
    const admin = await SuperAdmin.findById(adminId).select('+password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Super Admin not found'
      });
    }

    // ─── VERIFY CURRENT PASSWORD ──────────────────────────────────
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // ─── HASH NEW PASSWORD ────────────────────────────────────────
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // ─── UPDATE PASSWORD ──────────────────────────────────────────
    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Change Password Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
};