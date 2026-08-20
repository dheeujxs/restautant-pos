// controllers/adminController.js
import User from '../models/User.js';
import { 
  isValidObjectId, 
  isValidEmail, 
  isValidPhone, 
  isValidName,
  isValidRole,
  MAX_NAME_LENGTH,
  ALLOWED_ROLES
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS
// ============================================================

const ADMIN_ROLES = ['admin', 'superadmin'];

// ============================================================
//  HELPER: Check Admin Access
// ============================================================

const isAdminUser = (user) => {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role?.toLowerCase());
};

// ============================================================
//  USER MANAGEMENT CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getUsers = async (req, res) => {
  try {
    // ─── ADMIN CHECK ────────────────────────────────────────────────────
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    // ─── PAGINATION & FILTERS ──────────────────────────────────────────
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role;
    const isActive = req.query.isActive;

    const filter = {};

    // Search filter
    if (search && search.length > 0) {
      const sanitizedSearch = sanitizeInput(search);
      filter.$or = [
        { firstName: { $regex: sanitizedSearch, $options: 'i' } },
        { lastName: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { phone: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    // Role filter
    if (role) {
      if (!isValidRole(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`,
        });
      }
      filter.role = role;
    }

    // Active status filter
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // ─── FETCH USERS ────────────────────────────────────────────────────
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // ─── SANITIZE RESPONSE ─────────────────────────────────────────────
    const sanitizedUsers = users.map(user => ({
      ...user,
      firstName: sanitizeInput(user.firstName || ''),
      lastName: sanitizeInput(user.lastName || ''),
      email: user.email,
      phone: user.phone || '',
    }));

    res.json({
      success: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: users.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/users] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get user by ID
// @route   GET /api/admin/users/:userId
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getUserById = async (req, res) => {
  try {
    // ─── ADMIN CHECK ────────────────────────────────────────────────────
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    // ─── VALIDATE USER ID ──────────────────────────────────────────────
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    // ─── FETCH USER ────────────────────────────────────────────────────
    const user = await User.findById(userId)
      .select('-password -__v')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // ─── SANITIZE RESPONSE ─────────────────────────────────────────────
    const sanitizedUser = {
      ...user,
      firstName: sanitizeInput(user.firstName || ''),
      lastName: sanitizeInput(user.lastName || ''),
      email: user.email,
      phone: user.phone || '',
    };

    res.json({
      success: true,
      data: sanitizedUser,
    });
  } catch (error) {
    console.error('[GET /api/admin/users/:userId] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update user role
// @route   PUT /api/admin/users/:userId/role
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const updateUserRole = async (req, res) => {
  try {
    // ─── ADMIN CHECK ────────────────────────────────────────────────────
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    // ─── VALIDATE USER ID ──────────────────────────────────────────────
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    // ─── VALIDATE ROLE ──────────────────────────────────────────────────
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role is required',
      });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    // ─── PREVENT SELF ROLE CHANGE ──────────────────────────────────────
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own role',
      });
    }

    // ─── FIND TARGET USER ──────────────────────────────────────────────
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // ─── PREVENT REMOVING LAST ADMIN ──────────────────────────────────
    if (targetUser.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove the last admin user.',
        });
      }
    }

    // ─── UPDATE USER ROLE ──────────────────────────────────────────────
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { new: true, runValidators: true }
    ).select('-password -__v');

    res.json({
      success: true,
      message: `User ${updatedUser.email} role updated to ${role}`,
      data: {
        _id: updatedUser._id,
        firstName: sanitizeInput(updatedUser.firstName || ''),
        lastName: sanitizeInput(updatedUser.lastName || ''),
        email: updatedUser.email,
        role: updatedUser.role,
        isAdmin: updatedUser.isAdmin || false,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('[PUT /api/admin/users/:userId/role] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update user details
// @route   PUT /api/admin/users/:userId
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const updateUser = async (req, res) => {
  try {
    // ─── ADMIN CHECK ────────────────────────────────────────────────────
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    // ─── VALIDATE USER ID ──────────────────────────────────────────────
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    // ─── VALIDATE INPUTS ────────────────────────────────────────────────
    const { firstName, lastName, email, phone, isActive } = req.body;
    const updateData = {};

    // Validate firstName
    if (firstName !== undefined) {
      if (!isValidName(firstName)) {
        return res.status(400).json({
          success: false,
          error: `First name must be between 1 and ${MAX_NAME_LENGTH} characters`,
        });
      }
      updateData.firstName = sanitizeInput(firstName);
    }

    // Validate lastName
    if (lastName !== undefined) {
      if (lastName && !isValidName(lastName)) {
        return res.status(400).json({
          success: false,
          error: `Last name must be between 1 and ${MAX_NAME_LENGTH} characters`,
        });
      }
      updateData.lastName = lastName ? sanitizeInput(lastName) : '';
    }

    // Validate email
    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }
      // Check if email is taken by another user
      const existingUser = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: userId }
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use by another user',
        });
      }
      updateData.email = email.toLowerCase().trim();
    }

    // Validate phone
    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number. Must be 10 digits.',
        });
      }
      updateData.phone = phone || '';
    }

    // Validate isActive
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
        });
      }
      // Prevent deactivating self
      if (!isActive && userId === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          error: 'Cannot deactivate your own account',
        });
      }
      updateData.isActive = isActive;
    }

    // ─── UPDATE USER ────────────────────────────────────────────────────
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      message: `User ${updatedUser.email} updated successfully`,
      data: {
        _id: updatedUser._id,
        firstName: sanitizeInput(updatedUser.firstName || ''),
        lastName: sanitizeInput(updatedUser.lastName || ''),
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('[PUT /api/admin/users/:userId] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete user
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const deleteUser = async (req, res) => {
  try {
    // ─── ADMIN CHECK ────────────────────────────────────────────────────
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    // ─── VALIDATE USER ID ──────────────────────────────────────────────
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    // ─── PREVENT SELF DELETION ─────────────────────────────────────────
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account.',
      });
    }

    // ─── FIND USER ──────────────────────────────────────────────────────
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // ─── PREVENT DELETING LAST ADMIN ──────────────────────────────────
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the last admin user.',
        });
      }
    }

    // ─── SOFT DELETE vs HARD DELETE ────────────────────────────────────
    // Option 1: Hard Delete (permanent)
    await User.findByIdAndDelete(userId);

    // Option 2: Soft Delete (recommended)
    // await User.findByIdAndUpdate(userId, { 
    //   $set: { isActive: false, deletedAt: new Date() } 
    // });

    res.json({
      success: true,
      message: `User ${user.email} deleted successfully`,
      data: {
        deletedUserId: userId,
        deletedEmail: user.email,
      },
    });
  } catch (error) {
    console.error('[DELETE /api/admin/users/:userId] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Make user admin (utility function)
// @route   POST /api/admin/make-admin
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const makeAdmin = async (req, res) => {
  try {
    // ─── ADMIN CHECK ────────────────────────────────────────────────────
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    // ─── VALIDATE EMAIL ─────────────────────────────────────────────────
    const { email } = req.body;
    
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

    // ─── FIND USER ──────────────────────────────────────────────────────
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // ─── CHECK IF ALREADY ADMIN ────────────────────────────────────────
    if (user.role === 'admin' || user.isAdmin === true) {
      return res.status(409).json({
        success: false,
        error: `${user.email} is already an admin`,
      });
    }

    // ─── MAKE ADMIN ────────────────────────────────────────────────────
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: { isAdmin: true, role: 'admin' } },
      { new: true }
    ).select('-password -__v');

    res.json({
      success: true,
      message: `✅ ${updatedUser.email} is now an admin!`,
      data: {
        _id: updatedUser._id,
        firstName: sanitizeInput(updatedUser.firstName || ''),
        lastName: sanitizeInput(updatedUser.lastName || ''),
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('[POST /api/admin/make-admin] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make admin',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get admin stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getAdminStats = async (req, res) => {
  try {
    // ─── ADMIN CHECK ────────────────────────────────────────────────────
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    // ─── FETCH STATS ────────────────────────────────────────────────────
    const [
      totalUsers,
      totalAdmins,
      totalWaiters,
      totalKitchen,
      totalCashiers,
      totalDeliveryBoys,
      totalManagers,
      activeUsers,
      newUsersToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'waiter' }),
      User.countDocuments({ role: 'kitchen' }),
      User.countDocuments({ role: 'cashier' }),
      User.countDocuments({ role: 'delivery_boy' }),
      User.countDocuments({ role: 'manager' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        totalWaiters,
        totalKitchen,
        totalCashiers,
        totalDeliveryBoys,
        totalManagers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        newUsersToday,
        rolesBreakdown: {
          admin: totalAdmins,
          waiter: totalWaiters,
          kitchen: totalKitchen,
          cashier: totalCashiers,
          delivery_boy: totalDeliveryBoys,
          manager: totalManagers,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/stats] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin stats',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete users
// @route   DELETE /api/admin/users/bulk
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteUsers = async (req, res) => {
  try {
    // ─── ADMIN CHECK ────────────────────────────────────────────────────
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    // ─── VALIDATE USER IDs ─────────────────────────────────────────────
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of user IDs',
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 users can be deleted at once',
      });
    }

    // Validate all IDs
    const invalidIds = userIds.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid user ID format: ${invalidIds.join(', ')}`,
      });
    }

    // ─── PREVENT SELF DELETION ─────────────────────────────────────────
    if (userIds.includes(req.user._id.toString())) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    // ─── CHECK FOR LAST ADMIN ──────────────────────────────────────────
    const adminUsers = await User.find({ 
      _id: { $in: userIds },
      role: 'admin'
    });
    
    if (adminUsers.length > 0) {
      const totalAdmins = await User.countDocuments({ role: 'admin' });
      if (totalAdmins <= adminUsers.length) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete all admin users. At least one admin must remain.',
        });
      }
    }

    // ─── DELETE USERS ──────────────────────────────────────────────────
    const result = await User.deleteMany({ _id: { $in: userIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} users deleted successfully`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error('[DELETE /api/admin/users/bulk] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete users',
    });
  } 
};