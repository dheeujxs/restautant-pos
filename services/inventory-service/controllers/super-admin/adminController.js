// controllers/super-admin/adminController.js

import User from '../../models/User.js';
import Restaurant from '../../models/super-admin/Restaurant.js';
import Branch from '../../models/super-admin/Branch.js'; // ✅ Import Branch model
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
import generateToken from '../../utils/generateToken.js';

// ============================================================
//  ─── CREATE ADMIN WITH BRANCH ASSIGNMENT ────────────────────
// ============================================================

export const createBranchAdmin = async (req, res) => {
  try {
    console.log('📝 Creating branch admin...');
    
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password,
      restaurantId,
      branchId,
    } = req.body;

    // ─── VALIDATE ──────────────────────────────────────────────────────────
    if (!firstName || !isValidName(firstName)) {
      return res.status(400).json({
        success: false,
        error: `First name must be between 1 and ${MAX_NAME_LENGTH} characters`
      });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid phone number'
      });
    }

    if (!password || !isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`
      });
    }

    // ─── VALIDATE RESTAURANT ──────────────────────────────────────────────
    if (!restaurantId || !isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID'
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // ─── VALIDATE BRANCH USING SEPARATE BRANCH MODEL ────────────────────
    if (!branchId || !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID'
      });
    }

    // ✅ Check branch using separate Branch model
    const branch = await Branch.findOne({ 
      _id: branchId, 
      restaurantId: restaurantId 
    });
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found in this restaurant'
      });
    }

    console.log(`✅ Branch found: ${branch.name} (${branch._id})`);

    // ─── CHECK EXISTING ADMIN ─────────────────────────────────────────────
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phone: phone }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }
      if (existingUser.phone === phone) {
        return res.status(409).json({
          success: false,
          error: 'User with this phone already exists'
        });
      }
    }

    // ─── CREATE ADMIN USER WITH BRANCH ASSIGNMENT ──────────────────────
    const admin = await User.create({
      firstName: sanitizeInput(firstName.trim()),
      lastName: lastName ? sanitizeInput(lastName.trim()) : '',
      email: email.toLowerCase().trim(),
      phone: phone,
      password: password,
      role: 'admin',
      isAdmin: true,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      branchId: branch._id,
      branchName: branch.name,
    });

    console.log(`✅ Admin created: ${admin.email} for branch ${branch.name}`);

    // ─── GENERATE TOKEN ──────────────────────────────────────────────────
    const token = generateToken(admin._id.toString(), admin.role);

    // ─── RESPONSE ──────────────────────────────────────────────────────
    res.status(201).json({
      success: true,
      data: {
        admin: {
          _id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          isAdmin: admin.isAdmin,
          restaurantId: admin.restaurantId,
          restaurantName: admin.restaurantName,
          branchId: admin.branchId,
          branchName: admin.branchName,
        },
        token,
        message: `Admin created for ${branch.name} branch of ${restaurant.name}`
      }
    });
  } catch (error) {
    console.error('❌ Create Branch Admin Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create branch admin'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
//  ─── GET ALL BRANCH ADMINS ─────────────────────────────────────────────
// ============================================================

export const getBranchAdmins = async (req, res) => {
  try {
    console.log('📊 Fetching branch admins...');
    
    const { restaurantId, branchId, search, isActive, page = 1, limit = 50 } = req.query;

    const filter = { role: 'admin', isAdmin: true };

    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID'
        });
      }
      filter.restaurantId = restaurantId;
    }

    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID'
        });
      }
      filter.branchId = branchId;
    }

    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }

    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$or = [
        { firstName: { $regex: sanitizedSearch, $options: 'i' } },
        { lastName: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { phone: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    console.log('🔍 Filter:', JSON.stringify(filter, null, 2));

    const [admins, total] = await Promise.all([
      User.find(filter)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    console.log(`✅ Found ${admins.length} admins (total: ${total})`);

    res.json({
      success: true,
      data: admins,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      count: admins.length
    });
  } catch (error) {
    console.error('❌ Get Branch Admins Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch branch admins'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
//  ─── GET ADMIN BY ID ────────────────────────────────────────────────────
// ============================================================

export const getBranchAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid admin ID'
      });
    }

    const admin = await User.findOne({ 
      _id: id, 
      role: 'admin', 
      isAdmin: true 
    }).select('-password -__v');

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('❌ Get Branch Admin Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch admin'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
//  ─── UPDATE ADMIN BRANCH ASSIGNMENT ──────────────────────────────────
// ============================================================

export const updateAdminBranch = async (req, res) => {
  try {
    console.log('✏️ Updating admin branch assignment...');

    const { id } = req.params;
    const { branchId, restaurantId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid admin ID'
      });
    }

    const admin = await User.findOne({ 
      _id: id, 
      role: 'admin', 
      isAdmin: true 
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    const updateData = {};

    // ─── UPDATE RESTAURANT ──────────────────────────────────────────────
    if (restaurantId !== undefined) {
      if (restaurantId && !isValidObjectId(restaurantId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid restaurant ID'
        });
      }

      if (restaurantId) {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({
            success: false,
            error: 'Restaurant not found'
          });
        }
        updateData.restaurantId = restaurantId;
        updateData.restaurantName = restaurant.name;
      } else {
        updateData.restaurantId = null;
        updateData.restaurantName = '';
      }
    }

    // ─── UPDATE BRANCH USING SEPARATE BRANCH MODEL ──────────────────────
    if (branchId !== undefined) {
      if (branchId && !isValidObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branch ID'
        });
      }

      if (branchId) {
        // ✅ Check branch using separate Branch model
        const targetRestaurantId = restaurantId || admin.restaurantId;
        const branch = await Branch.findOne({ 
          _id: branchId,
          restaurantId: targetRestaurantId
        });
        
        if (!branch) {
          return res.status(404).json({
            success: false,
            error: 'Branch not found in this restaurant'
          });
        }
        
        updateData.branchId = branchId;
        updateData.branchName = branch.name;
        console.log(`✅ Branch found: ${branch.name} (${branch._id})`);
      } else {
        updateData.branchId = null;
        updateData.branchName = '';
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No changes to update'
      });
    }

    // ─── UPDATE ADMIN ──────────────────────────────────────────────────
    const updatedAdmin = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -__v');

    console.log(`✅ Admin ${updatedAdmin.email} branch assignment updated`);

    res.json({
      success: true,
      data: updatedAdmin,
      message: 'Admin branch assignment updated successfully'
    });
  } catch (error) {
    console.error('❌ Update Admin Branch Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update admin branch'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
//  ─── DELETE ADMIN ──────────────────────────────────────────────────────
// ============================================================

export const deleteBranchAdmin = async (req, res) => {
  try {
    console.log('🗑️ Deleting branch admin...');

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid admin ID'
      });
    }

    const admin = await User.findOne({ 
      _id: id, 
      role: 'admin', 
      isAdmin: true 
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Prevent deleting the last admin
    const adminCount = await User.countDocuments({ role: 'admin', isAdmin: true });
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the last admin user'
      });
    }

    await User.findByIdAndDelete(id);

    console.log(`✅ Admin ${admin.email} deleted successfully`);

    res.json({
      success: true,
      message: `Admin ${admin.email} deleted successfully`
    });
  } catch (error) {
    console.error('❌ Delete Admin Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete admin'
    });
  }
};