// controllers/staff-portal/staffPortalController.js - FIXED (profile endpoints no longer merge role permissions)

import Staff from '../../models/Staff.js';
import Role from '../../models/Role.js';
import Order from '../../models/Order.js';
import Table from '../../models/Table.js'; 
import Bill from '../../models/Bill.js';
import KOT from '../../models/KOT.js';
import Salary from '../../models/Salary.js';
import jwt from 'jsonwebtoken';
import { 
  isValidObjectId, 
  isValidPhone, 
  isValidEmail, 
  isValidName,
  isValidText,
  isValidRole,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH
} from '../../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

// ============================================================
//  CONSTANTS
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || 'staff_secret_key';

// ============================================================
//  ✅ STAFF LOGIN - FIXED
// ============================================================

export const staffLogin = async (req, res) => {
  console.log('========================================');
  console.log('🔐 STAFF LOGIN ATTEMPT');
  console.log('========================================');

  try {
    const { employeeId, phoneNumber, password, pin } = req.body;
    
    // ─── VALIDATE INPUTS ────────────────────────────────────────────────
    if (!employeeId && !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID or phone number is required',
      });
    }

    if (!password && !pin) {
      return res.status(400).json({
        success: false,
        error: 'Password or PIN is required',
      });
    }

    // ─── FIND STAFF ──────────────────────────────────────────────────────
    let staff;
    
    if (employeeId) {
      const sanitizedEmployeeId = sanitizeInput(employeeId);
      staff = await Staff.findOne({ employeeId: sanitizedEmployeeId })
        .populate('role')
        .populate('roles')
        .populate('restaurantId', 'name')
        .populate('branchId', 'name');
      console.log('🔍 Found by employeeId:', !!staff);
    } else if (phoneNumber) {
      const sanitizedPhone = phoneNumber.replace(/\D/g, '');
      staff = await Staff.findOne({ phoneNumber: sanitizedPhone })
        .populate('role')
        .populate('roles')
        .populate('restaurantId', 'name')
        .populate('branchId', 'name');
      console.log('🔍 Found by phoneNumber:', !!staff);
    }
    
    if (!staff) {
      console.warn(`⚠️ Login attempt failed: Staff not found`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }
    
    console.log('👤 Staff found:', staff.name, 'Employee ID:', staff.employeeId);
    console.log('📋 Staff permissions from DB:', staff.permissions || []);
    console.log('📋 Staff permissions type:', typeof staff.permissions);
    console.log('📋 Is staff.permissions an array?', Array.isArray(staff.permissions));
    console.log('📋 staff.permissions length:', staff.permissions?.length);
    
    // ─── CHECK PERMISSIONS ──────────────────────────────────────────────
    if (!staff.canLoginKitchenPortal) {
      console.warn(`⚠️ Login attempt failed: ${staff.name} - No portal access`);
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to access the staff portal.',
      });
    }
    
    if (staff.status !== 'active') {
      console.warn(`⚠️ Login attempt failed: ${staff.name} - Account inactive`);
      return res.status(401).json({
        success: false,
        error: 'Your account is inactive. Please contact administrator.',
      });
    }
    
    // ─── AUTHENTICATE ────────────────────────────────────────────────────
    let isAuthenticated = false;
    
    if (password) {
      isAuthenticated = await staff.comparePassword(password);
      console.log('🔑 Password match:', isAuthenticated);
    } else if (pin) {
      isAuthenticated = await staff.comparePin(pin);
      console.log('🔑 PIN match:', isAuthenticated);
    }
    
    if (!isAuthenticated) {
      console.warn(`⚠️ Login attempt failed: ${staff.name} - Invalid credentials`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }
    
    // ─── ✅ GET ROLES & PERMISSIONS (FIXED) ─────────────────────────────
    const { roles: allRoles } = await staff.getAllRolesAndPermissions();
    const primaryRole = allRoles.length > 0 ? allRoles[0] : 'Staff';
    
    // ✅ CRITICAL FIX: Check if staff has custom permissions
    // staff.permissions is an array - check if it's defined (not undefined/null)
    // Even if it's an empty array, we should use it (not fall back to role)
    let finalPermissions = [];
    
    // ✅ Check if staff has custom permissions set (could be empty array)
    if (staff.permissions !== undefined && staff.permissions !== null) {
      // ✅ Staff has custom permissions - use them (even if empty array)
      finalPermissions = Array.isArray(staff.permissions) ? staff.permissions : [];
      console.log(`✅ Using CUSTOM permissions (admin selected): ${finalPermissions.length}`);
      console.log(`📋 Custom permissions:`, finalPermissions);
    } else {
      // ✅ Fall back to role permissions ONLY if staff has NO custom permissions
      const { permissions: rolePermissions } = await staff.getAllRolesAndPermissions();
      finalPermissions = rolePermissions;
      console.log(`✅ Using ROLE permissions (fallback): ${finalPermissions.length}`);
      console.log(`📋 Role permissions:`, finalPermissions);
    }
    
    console.log('🎭 All Roles:', allRoles);
    console.log('⭐ Primary Role:', primaryRole);
    console.log('✅ FINAL permissions sent to client:', finalPermissions);
    
    // ─── GET RESTAURANT & BRANCH IDs ─────────────────────────────────────
    const restaurantId = staff.restaurantId?._id || staff.restaurantId || null;
    const branchId = staff.branchId?._id || staff.branchId || null;
    const restaurantName = staff.restaurantId?.name || staff.restaurantName || '';
    const branchName = staff.branchId?.name || staff.branchName || 'All Branches';
    
    // ─── ✅ GENERATE TOKEN WITH FINAL PERMISSIONS ────────────────────────
    const token = jwt.sign(
      {
        staffId: staff._id.toString(),
        id: staff._id.toString(),
        userId: staff._id.toString(),
        employeeId: staff.employeeId,
        roles: allRoles,
        primaryRole: primaryRole,
        // ✅ CRITICAL: Use final permissions
        permissions: finalPermissions,
        role: 'staff',
        isStaff: true,
        restaurantId: restaurantId ? restaurantId.toString() : null,
        branchId: branchId ? branchId.toString() : null,
        restaurantName: restaurantName,
        branchName: branchName,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    console.log('✅ Token generated for:', staff.name);
    console.log('✅ Permissions in token:', finalPermissions.length);
    
    // ─── REMOVE SENSITIVE DATA ──────────────────────────────────────────
    const staffObj = staff.toObject();
    delete staffObj.password;
    if (staffObj.pin) delete staffObj.pin;
    if (staffObj.__v) delete staffObj.__v;
    
    // ─── RESPONSE WITH COMPLETE DATA ──────────────────────────────────
    const responseData = {
      success: true,
      token: token,
      staff: {
        _id: staffObj._id,
        id: staffObj._id,
        name: staffObj.name,
        employeeId: staffObj.employeeId,
        phoneNumber: staffObj.phoneNumber,
        email: staffObj.email || '',
        role: primaryRole,
        allRoles: allRoles,
        // ✅ Include final permissions in response
        permissions: finalPermissions,
        canLoginKitchenPortal: staffObj.canLoginKitchenPortal,
        status: staffObj.status,
        profileImage: staffObj.profileImage || '',
        userType: 'Staff',
        isAdmin: false,
        restaurantId: restaurantId ? restaurantId.toString() : null,
        branchId: branchId ? branchId.toString() : null,
        restaurantName: restaurantName,
        branchName: branchName,
        restaurant: staffObj.restaurantId || null,
        branch: staffObj.branchId || null,
      },
      expiresIn: 8 * 60 * 60,
      message: 'Login successful',
    };
    
    console.log('📤 Response permissions count:', responseData.staff.permissions?.length || 0);
    console.log('📤 Response permissions:', responseData.staff.permissions);
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Error during staff login:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
};

// ============================================================
//  ✅ VERIFY STAFF TOKEN
// ============================================================

export const verifyStaffToken = async (req, res) => {
  try {
    const { staffToken } = req.body;
    
    if (!staffToken) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }
    
    if (typeof staffToken !== 'string' || staffToken.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format',
      });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(staffToken, JWT_SECRET);
      console.log('✅ Token verified for staff:', decoded.employeeId);
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
    
    if (!decoded.staffId || !isValidObjectId(decoded.staffId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token payload',
      });
    }
    
    const staff = await Staff.findById(decoded.staffId)
      .populate('role')
      .populate('roles')
      .select('-password -pin -__v');
    
    if (!staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    if (staff.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is inactive',
      });
    }
    
    const { roles: allRoles } = await staff.getAllRolesAndPermissions();

    // ✅ Same override rule as staffLogin / getStaffProfile — only the
    // staff's own custom permissions, not merged with role permissions.
    const finalPermissions = Array.isArray(staff.permissions) ? staff.permissions : [];
    
    console.log('✅ Token verified for:', staff.name);
    console.log('🎭 Roles:', allRoles);
    
    res.status(200).json({
      success: true,
      data: {
        ...staff.toObject(),
        role: allRoles.length > 0 ? allRoles[0] : 'Staff',
        allRoles: allRoles,
        permissions: finalPermissions,
      },
    });
  } catch (error) {
    console.error('❌ Error verifying token:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

// ============================================================
//  ✅ GET STAFF DASHBOARD
// ============================================================

export const getStaffDashboard = async (req, res) => {
  try {
    const staff = req.staff;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // ─── FETCH ORDERS ────────────────────────────────────────────────────
    const orders = await Order.find({
      createdAt: { $gte: today },
      orderStatus: { $in: ['pending', 'preparing', 'ready'] }
    }).sort({ createdAt: -1 }).limit(50).lean();
    
    // ─── KOT BY STATION ─────────────────────────────────────────────────
    const kotByStation = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const station = item.kotStation || 'Main Kitchen';
          if (!kotByStation[station]) {
            kotByStation[station] = { count: 0, items: [] };
          }
          kotByStation[station].count++;
          kotByStation[station].items.push({
            productName: sanitizeInput(item.productName),
            quantity: item.quantity,
          });
        });
      }
    });
    
    const kotItems = Object.keys(kotByStation).map(station => ({
      _id: station,
      count: kotByStation[station].count,
      items: kotByStation[station].items.slice(0, 20)
    }));
    
    res.status(200).json({
      success: true,
      data: {
        staff: {
          _id: staff._id,
          name: sanitizeInput(staff.name),
          role: staff.role,
          employeeId: staff.employeeId,
          phoneNumber: staff.phoneNumber,
          email: staff.email || '',
        },
        stats: {
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.orderStatus === 'pending').length,
          preparingOrders: orders.filter(o => o.orderStatus === 'preparing').length,
          readyOrders: orders.filter(o => o.orderStatus === 'ready').length,
        },
        recentOrders: orders.slice(0, 20).map(order => ({
          _id: order._id,
          orderNumber: order.orderNumber || order._id,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
          totalAmount: order.total || 0,
          itemsCount: order.items?.length || 0,
          customerName: sanitizeInput(order.customerName || ''),
          tableNumber: order.tableNumber || '',
        })),
        kotByStation: kotItems,
      }
    });
  } catch (error) {
    console.error('❌ Error fetching staff dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
};

// ============================================================
//  ✅ GET STAFF PROFILE - FIXED (no longer merges role permissions)
// ============================================================

export const getStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff._id;

    const staff = await Staff.findById(staffId)
      .populate('role')
      .populate('roles')
      .select('-password -pin -__v');

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }

    const { roles: allRoles } = await staff.getAllRolesAndPermissions();

    // ✅ Use ONLY the staff's own custom permissions — exactly what the
    // admin selected in "Add Staff" / "Edit Staff". Do NOT merge in role
    // permissions here; that was causing the sidebar to show more items
    // than what was explicitly granted, once the profile got re-fetched
    // on page refresh. This matches the override logic already used in
    // staffLogin.
    const finalPermissions = Array.isArray(staff.permissions) ? staff.permissions : [];

    console.log(`📋 [getStaffProfile] ${staff.name} - permissions sent: ${finalPermissions.length}`);

    res.status(200).json({
      success: true,
      data: {
        ...staff.toObject(),
        roleName: allRoles[0] || staff.role?.name || '',
        roles: allRoles,
        permissions: finalPermissions,
        name: sanitizeInput(staff.name),
        email: staff.email || '',
        phoneNumber: staff.phoneNumber,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching staff profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

// ============================================================
//  ✅ UPDATE STAFF PROFILE - FIXED (no longer merges role permissions)
// ============================================================

export const updateStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff._id;
    
    // ─── VALIDATE INPUTS ─────────────────────────────────────────────────
    const { name, email, phoneNumber } = req.body;
    const updateData = {};

    if (name) {
      if (!isValidName(name)) {
        return res.status(400).json({
          success: false,
          error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters`,
        });
      }
      updateData.name = sanitizeInput(name);
    }

    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }
      updateData.email = email.toLowerCase().trim();
    }

    if (phoneNumber) {
      if (!isValidPhone(phoneNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number. Must be 10 digits.',
        });
      }
      updateData.phoneNumber = phoneNumber.replace(/\D/g, '');
    }

    // ─── UPDATE STAFF ────────────────────────────────────────────────────
    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -pin -__v');
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    const { roles: allRoles } = await staff.getAllRolesAndPermissions();

    // ✅ Same fix as getStaffProfile — only the staff's own permissions,
    // not merged with role permissions.
    const finalPermissions = Array.isArray(staff.permissions) ? staff.permissions : [];

    res.status(200).json({
      success: true,
      data: {
        ...staff.toObject(),
        roleName: allRoles[0] || '',
        roles: allRoles,
        permissions: finalPermissions,
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating staff profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
};

// ============================================================
//  ✅ GET STAFF BILLS - COMPLETE FIXED VERSION
// ============================================================

export const getStaffBills = async (req, res) => {
  try {
    const staff = req.staff;
    console.log('📊 Fetching bills for staff:', staff?.name, 'ID:', staff?._id);
    console.log('📊 Staff restaurantId:', staff?.restaurantId);
    console.log('📊 Staff branchId:', staff?.branchId);
    
    // ─── GET STAFF ROLES ──────────────────────────────────────────────────
    const { roles: allRoles } = await staff.getAllRolesAndPermissions?.() || { roles: [] };
    const roleNames = allRoles.map(r => r.toLowerCase());
    
    console.log('🎭 Staff roles:', roleNames);
    
    // ─── BUILD FILTER ────────────────────────────────────────────────────
    let filter = {};
    
    // ✅ For waiters: show all bills in their restaurant (not just their orders)
    // This gives them visibility into all bills
    const isWaiter = roleNames.some(r => 
      ['waiter', 'waitress', 'server'].includes(r)
    );
    
    // ✅ For kitchen staff: show all bills
    const isKitchen = roleNames.some(r => 
      ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'].includes(r)
    );
    
    // ✅ For cashiers: show all bills
    const isCashier = roleNames.some(r => 
      ['cashier'].includes(r)
    );
    
    // ✅ For managers/admins: show all bills
    const isManager = roleNames.some(r => 
      ['manager', 'admin', 'superadmin'].includes(r)
    );
    
    // ─── FILTER BY RESTAURANT AND BRANCH ────────────────────────────────
    // Always filter by restaurant if staff has one
    if (staff?.restaurantId) {
      filter.restaurantId = staff.restaurantId;
    }
    
    // Branch filter - only apply if staff is assigned to a specific branch
    // AND they are not a manager (managers see all branches)
    if (staff?.branchId && !isManager) {
      filter.branchId = staff.branchId;
    }
    
    // ─── IF NO RESTAURANT ID, TRY TO FIND FROM ORDERS ──────────────────
    if (!filter.restaurantId && !isManager) {
      console.log('⚠️ Staff has no restaurantId, trying to find from orders...');
      const orders = await Order.find({ servedBy: staff._id }).select('restaurantId branchId').lean();
      const restaurantIds = [...new Set(orders.map(o => o.restaurantId?.toString()).filter(Boolean))];
      const branchIds = [...new Set(orders.map(o => o.branchId?.toString()).filter(Boolean))];
      
      if (restaurantIds.length > 0) {
        filter.restaurantId = { $in: restaurantIds };
        console.log('📊 Found restaurantIds from orders:', restaurantIds);
      }
      if (branchIds.length > 0 && !isManager) {
        filter.branchId = { $in: branchIds };
        console.log('📊 Found branchIds from orders:', branchIds);
      }
    }
    
    // ─── QUERY PARAMS ──────────────────────────────────────────────────
    const { 
      paymentStatus, 
      search, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Add payment status filter
    if (paymentStatus) {
      const validStatuses = ['pending', 'paid', 'refunded'];
      if (!validStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment status. Allowed: ${validStatuses.join(', ')}`
        });
      }
      filter.paymentStatus = paymentStatus;
    }
    
    // ─── SEARCH ──────────────────────────────────────────────────────────
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { billNumber: searchRegex },
        { orderNumber: searchRegex },
        { tableNumber: searchRegex },
        { customerName: searchRegex },
      ];
    }
    
    console.log('🔍 Final Bill filter:', JSON.stringify(filter, null, 2));
    
    // ─── FETCH BILLS ──────────────────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const skip = (pageNum - 1) * limitNum;
    
    // Try to fetch bills with the filter
    let bills = [];
    let total = 0;
    
    try {
      [bills, total] = await Promise.all([
        Bill.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Bill.countDocuments(filter),
      ]);
    } catch (err) {
      console.error('❌ Error fetching bills with filter:', err);
      // If filter fails, try without restaurant/branch filter
      if (filter.restaurantId || filter.branchId) {
        console.log('🔄 Retrying without restaurant/branch filter...');
        const fallbackFilter = {};
        if (paymentStatus) fallbackFilter.paymentStatus = paymentStatus;
        if (search) {
          fallbackFilter.$or = [
            { billNumber: { $regex: search, $options: 'i' } },
            { orderNumber: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
          ];
        }
        [bills, total] = await Promise.all([
          Bill.find(fallbackFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
          Bill.countDocuments(fallbackFilter),
        ]);
        console.log(`📊 Fallback found ${bills.length} bills (total: ${total})`);
      } else {
        throw err;
      }
    }
    
    console.log(`✅ Found ${bills.length} bills (total: ${total})`);
    
    // ─── POPULATE ORDER DETAILS ──────────────────────────────────────────
    const billsWithDetails = await Promise.all(
      bills.map(async (bill) => {
        let orderDetails = null;
        if (bill.orderId) {
          try {
            const order = await Order.findById(bill.orderId)
              .select('orderNumber orderStatus tableNumber customerName customerPhone items subtotal tax total discount createdAt completedAt waiterId servedBy')
              .lean();
            if (order) {
              orderDetails = order;
            }
          } catch (err) {
            console.warn(`⚠️ Could not fetch order for bill ${bill.billNumber}:`, err.message);
          }
        }
        
        return {
          _id: bill._id,
          billNumber: bill.billNumber || `BILL-${bill._id.toString().slice(-6)}`,
          orderId: bill.orderId,
          orderNumber: bill.orderNumber || orderDetails?.orderNumber || '',
          tableNumber: bill.tableNumber || orderDetails?.tableNumber || '',
          tableId: bill.tableId,
          customerName: sanitizeInput(bill.customerName || orderDetails?.customerName || 'Guest'),
          customerPhone: bill.customerPhone || orderDetails?.customerPhone || '',
          items: (bill.items || orderDetails?.items || []).map(item => ({
            productName: sanitizeInput(item.productName || ''),
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            notes: item.notes ? sanitizeInput(item.notes) : '',
          })),
          subtotal: bill.subtotal || orderDetails?.subtotal || 0,
          tax: bill.tax || orderDetails?.tax || 0,
          taxRate: bill.taxRate || 5,
          discount: bill.discount || orderDetails?.discount || 0,
          discountType: bill.discountType || 'fixed',
          total: bill.total || orderDetails?.total || 0,
          paymentMethod: bill.paymentMethod || 'cash',
          paymentStatus: bill.paymentStatus || 'pending',
          paidAt: bill.paidAt || null,
          notes: bill.notes ? sanitizeInput(bill.notes) : '',
          generatedBy: bill.generatedBy,
          generatedByName: sanitizeInput(bill.generatedByName || 'system'),
          orderStatus: orderDetails?.orderStatus || 'completed',
          isVip: orderDetails?.isVip || false,
          createdAt: bill.createdAt,
          updatedAt: bill.updatedAt,
          restaurantId: bill.restaurantId,
          restaurantName: bill.restaurantName || '',
          branchId: bill.branchId,
          branchName: bill.branchName || '',
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        bills: billsWithDetails,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        },
        count: billsWithDetails.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching staff bills:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bills: ' + error.message,
    });
  }
};

// ============================================================
//  ✅ GET STAFF REPORTS
// ============================================================

export const getStaffReports = async (req, res) => {
  try {
    const { range } = req.query;
    
    // ─── VALIDATE RANGE ──────────────────────────────────────────────────
    const validRanges = ['today', 'yesterday', 'week', 'month', 'quarter'];
    if (range && !validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        error: `Invalid range. Allowed: ${validRanges.join(', ')}`,
      });
    }

    const staffId = req.staff._id;
    const { roles: allRoles } = await req.staff.getAllRolesAndPermissions?.() || { roles: [] };
    const isWaiter = allRoles.some(r => r.toLowerCase() === 'waiter');
    
    // ─── BUILD DATE FILTER ──────────────────────────────────────────────
    let dateFilter = {};
    const now = new Date();
    let startDate, endDate;
    
    switch (range) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(yesterday);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }
    
    dateFilter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (isWaiter && staffId) {
      dateFilter.waiterId = staffId;
    }
    
    // ─── FETCH ORDERS ────────────────────────────────────────────────────
    const orders = await Order.find(dateFilter).lean();
    
    const completedOrders = orders.filter(o => o.orderStatus === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // ─── TOP ITEMS ──────────────────────────────────────────────────────
    const itemMap = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const productName = sanitizeInput(item.productName);
        if (!itemMap[productName]) {
          itemMap[productName] = { count: 0, revenue: 0 };
        }
        itemMap[productName].count += item.quantity || 1;
        itemMap[productName].revenue += item.totalPrice || 0;
      });
    });
    
    const topItems = Object.entries(itemMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // ─── PEAK HOURS ─────────────────────────────────────────────────────
    const hourMap = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const hourKey = `${hour}:00`;
      if (!hourMap[hourKey]) hourMap[hourKey] = 0;
      hourMap[hourKey]++;
    });
    
    const peakHours = Object.entries(hourMap)
      .map(([hour, count]) => ({ hour, orders: count }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 6);
    
    // ─── RECENT ORDERS ──────────────────────────────────────────────────
    const recentOrders = orders.slice(0, 10).map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      total: order.total || 0,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
      tableNumber: order.tableNumber || '',
      customerName: sanitizeInput(order.customerName || ''),
    }));
    
    const dineIn = orders.filter(o => o.orderType === 'dine-in').length;
    const takeaway = orders.filter(o => o.orderType === 'takeaway').length;
    const delivery = orders.filter(o => o.orderType === 'delivery').length;
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    
    res.status(200).json({
      success: true,
      data: {
        totalOrders: orders.length,
        totalRevenue,
        averageOrderValue,
        vipOrders: orders.filter(o => o.isVip).length,
        dineIn,
        takeaway,
        delivery,
        topItems,
        peakHours,
        recentOrders,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching staff reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
    });
  }
};

// ============================================================
//  ✅ UPDATE ORDER STATUS (STAFF)
// ============================================================

export const updateOrderStatusStaff = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    // ─── VALIDATE ORDER ID ──────────────────────────────────────────────
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format',
      });
    }
    
    // ─── VALIDATE STATUS ─────────────────────────────────────────────────
    const allowedStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
      });
    }
    
    // ─── ROLE-BASED CHECK ───────────────────────────────────────────────
    const userRole = req.staff?.role?.name || req.staff?.roleName || '';
    const isKitchen = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'].includes(userRole?.toLowerCase());
    
    if (status === 'completed' && isKitchen) {
      return res.status(403).json({
        success: false,
        error: '❌ Kitchen staff cannot complete orders. Only waiters or delivery boys can.',
      });
    }
    
    // ─── FIND AND UPDATE ORDER ──────────────────────────────────────────
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: { orderStatus: status } },
      { new: true, runValidators: true }
    ).lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }
    
    // ─── UPDATE KOT STATUS ──────────────────────────────────────────────
    if (status === 'ready' || status === 'completed') {
      await KOT.updateMany(
        { orderId: order._id },
        { status: status === 'ready' ? 'ready' : 'served' }
      );
    }
    
    res.status(200).json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
    });
  }
};

// ============================================================
//  ✅ GET STAFF SETTINGS
// ============================================================

export const getStaffSettings = async (req, res) => {
  try {
    const staffId = req.staff._id;
    
    const staff = await Staff.findById(staffId).select('settings');
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    const defaultSettings = {
      theme: 'light',
      notifications: true,
      soundEnabled: true,
      language: 'en',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      compactView: false,
      autoRefresh: true,
      refreshInterval: 15,
    };
    
    const settings = staff.settings || defaultSettings;
    
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('❌ Error fetching staff settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
    });
  }
};

// ============================================================
//  ✅ GET CASHIER DASHBOARD - COMPLETE FIXED VERSION
// ============================================================

export const getCashierDashboard = async (req, res) => {
  try {
    const staff = req.staff;
    console.log('💰 Cashier Dashboard requested by:', staff?.name || 'Staff');
    console.log('🏢 Staff Restaurant ID:', staff?.restaurantId);
    console.log('📍 Staff Branch ID:', staff?.branchId);

    // ─── GET STAFF ROLES ──────────────────────────────────────────────────
    const { roles: allRoles } = await staff.getAllRolesAndPermissions?.() || { roles: [] };
    const roleNames = allRoles.map(r => r.toLowerCase());
    console.log('🎭 Staff roles:', roleNames);

    // ─── DATE RANGES ──────────────────────────────────────────────────────
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // ─── BUILD FILTER ────────────────────────────────────────────────────
    let filter = {};

    // Restaurant filter
    if (staff?.restaurantId) {
      filter.restaurantId = staff.restaurantId;
    }

    // Branch filter - only if staff has a specific branch
    const isManager = roleNames.some(r => ['manager', 'admin', 'superadmin'].includes(r));
    
    if (staff?.branchId && !isManager) {
      filter.branchId = staff.branchId;
    }

    // ─── FETCH TODAY'S BILLS ─────────────────────────────────────────────
    const todayBills = await Bill.find({
      ...filter,
      createdAt: { $gte: startOfDay, $lte: new Date() }
    }).lean();

    // ─── FETCH WEEKLY BILLS ──────────────────────────────────────────────
    const weeklyBills = await Bill.find({
      ...filter,
      createdAt: { $gte: startOfWeek, $lte: new Date() }
    }).lean();

    // ─── FETCH MONTHLY BILLS ─────────────────────────────────────────────
    const monthlyBills = await Bill.find({
      ...filter,
      createdAt: { $gte: startOfMonth, $lte: new Date() }
    }).lean();

    // ─── FETCH PENDING BILLS ─────────────────────────────────────────────
    const pendingBills = await Bill.find({
      ...filter,
      paymentStatus: 'pending'
    }).sort({ createdAt: -1 }).lean();

    // ─── FETCH PAID BILLS ────────────────────────────────────────────────
    const paidBills = await Bill.find({
      ...filter,
      paymentStatus: 'paid'
    }).sort({ paidAt: -1 }).limit(15).lean();

    // ─── CALCULATE STATS ──────────────────────────────────────────────────
    const todayPaid = todayBills.filter(b => b.paymentStatus === 'paid');
    const weeklyPaid = weeklyBills.filter(b => b.paymentStatus === 'paid');
    const monthlyPaid = monthlyBills.filter(b => b.paymentStatus === 'paid');

    // Payment method breakdown for today
    const paymentMethodBreakdown = {
      cash: { count: 0, total: 0 },
      upi: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      online: { count: 0, total: 0 },
    };

    todayPaid.forEach(bill => {
      const method = bill.paymentMethod || 'cash';
      if (paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method].count += 1;
        paymentMethodBreakdown[method].total += bill.total || 0;
      }
    });

    // ─── CALCULATE STATS ──────────────────────────────────────────────────
    const totalTodayRevenue = todayPaid.reduce((sum, b) => sum + (b.total || 0), 0);
    const totalWeeklyRevenue = weeklyPaid.reduce((sum, b) => sum + (b.total || 0), 0);
    const totalMonthlyRevenue = monthlyPaid.reduce((sum, b) => sum + (b.total || 0), 0);
    
    const totalTaxCollected = todayPaid.reduce((sum, b) => sum + (b.tax || 0), 0);
    const totalDiscountGiven = todayPaid.reduce((sum, b) => sum + (b.discount || 0), 0);
    
    const averageOrderValue = todayPaid.length > 0 ? totalTodayRevenue / todayPaid.length : 0;

    // ─── HOURLY BREAKDOWN FOR TODAY ──────────────────────────────────────
    const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: i, orders: 0, revenue: 0 }));
    
    todayPaid.forEach(bill => {
      const hour = new Date(bill.createdAt).getHours();
      hourlyData[hour].orders += 1;
      hourlyData[hour].revenue += bill.total || 0;
    });

    // ─── TOP ITEMS ──────────────────────────────────────────────────────
    const itemMap = {};
    todayPaid.forEach(bill => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => {
          const name = item.productName || 'Unknown';
          if (!itemMap[name]) {
            itemMap[name] = { quantity: 0, revenue: 0 };
          }
          itemMap[name].quantity += item.quantity || 1;
          itemMap[name].revenue += item.totalPrice || 0;
        });
      }
    });

    const topItems = Object.entries(itemMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ─── RESPONSE ──────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        summary: {
          todayRevenue: totalTodayRevenue,
          weeklyRevenue: totalWeeklyRevenue,
          monthlyRevenue: totalMonthlyRevenue,
          pendingBills: pendingBills.length,
          paidOrders: todayPaid.length,
          totalTransactions: todayBills.length,
          averageOrderValue,
          totalTaxCollected,
          totalDiscountGiven,
        },
        paymentMethodBreakdown,
        hourlyData,
        topItems,
        pendingBills: pendingBills.map(bill => ({
          _id: bill._id,
          billNumber: bill.billNumber,
          orderNumber: bill.orderNumber,
          tableNumber: bill.tableNumber || '',
          customerName: bill.customerName || 'Guest',
          total: bill.total || 0,
          createdAt: bill.createdAt,
          items: bill.items?.length || 0,
        })),
        recentTransactions: paidBills.map(bill => ({
          _id: bill._id,
          billNumber: bill.billNumber,
          orderNumber: bill.orderNumber,
          amount: bill.total || 0,
          paymentMethod: bill.paymentMethod || 'cash',
          customerName: bill.customerName || 'Guest',
          paidAt: bill.paidAt || bill.createdAt,
        })),
        period: {
          today: startOfDay,
          week: startOfWeek,
          month: startOfMonth,
        },
        staff: {
          name: staff.name,
          employeeId: staff.employeeId,
          branchName: staff.branchName || 'All Branches',
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching cashier dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cashier dashboard: ' + error.message,
    });
  }
};

// ============================================================
//  ✅ UPDATE STAFF SETTINGS
// ============================================================

export const updateStaffSettings = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const settings = sanitizeObject(req.body);
    
    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { $set: { settings } },
      { new: true, runValidators: true }
    ).select('settings');
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: staff.settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating staff settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    });
  }
};

// ============================================================
//  ✅ GET STAFF SALARY
// ============================================================

export const getStaffSalary = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { year } = req.query;
    
    const filter = { staffId };
    if (year) {
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year format',
        });
      }
      filter.year = yearNum;
    }
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const currentSalary = await Salary.findOne({
      staffId,
      month: currentMonth,
      year: currentYear,
    }).lean();
    
    const allSalaries = await Salary.find(filter)
      .sort({ year: -1, month: -1 })
      .lean();
    
    const totalEarned = allSalaries
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);
    
    const pendingAmount = allSalaries
      .filter(s => s.status === 'pending' || s.status === 'approved')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);
    
    res.status(200).json({
      success: true,
      data: {
        current: currentSalary || null,
        records: allSalaries.map(s => ({
          _id: s._id,
          month: s.month,
          year: s.year,
          baseSalary: s.baseSalary || 0,
          bonuses: s.bonuses || 0,
          deductions: s.deductions || 0,
          netSalary: s.netSalary || 0,
          status: s.status || 'pending',
          notes: sanitizeInput(s.notes || ''),
          paymentDate: s.paidAt || null,
          createdAt: s.createdAt,
        })),
        summary: {
          totalEarned,
          pendingAmount,
          totalRecords: allSalaries.length,
          paidRecords: allSalaries.filter(s => s.status === 'paid').length,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching staff salary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch salary',
    });
  }
};

// ============================================================
//  ✅ GET STAFF TABLES
// ============================================================

export const getStaffTables = async (req, res) => {
  try {
    console.log('📋 Fetching tables for staff...');
    const staff = req.staff;
    const { roles: allRoles } = await staff.getAllRolesAndPermissions?.() || { roles: [] };
    
    console.log('👤 Staff:', staff.name);
    console.log('🎭 Roles:', allRoles);
    
    // Check if staff has permission to view tables
    const canViewTables = allRoles.some(r => 
      ['waiter', 'manager', 'admin', 'chef', 'cook', 'section_chef', 'helper', 'kot_staff', 'cashier'].includes(r.toLowerCase())
    );
    
    if (!canViewTables) {
      console.log('❌ Access denied: User cannot view tables');
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to view tables.',
      });
    }

    // ✅ Direct import of Table model (already imported at top)
    // Build filter - show all active tables
    const filter = { isActive: true };
    
    console.log('🔍 Fetching tables with filter:', filter);
    
    const tables = await Table.find(filter)
      .sort({ number: 1 })
      .lean();
    
    console.log(`✅ Found ${tables.length} tables`);
    
    // Get order details for occupied tables
    const tablesWithDetails = await Promise.all(tables.map(async (table) => {
      let orderDetails = null;
      if (table.status === 'occupied' && table.currentOrderId) {
        try {
          const order = await Order.findById(table.currentOrderId)
            .select('orderNumber orderStatus total customerName items tableNumber createdAt')
            .lean();
          if (order) {
            orderDetails = {
              orderNumber: order.orderNumber,
              orderStatus: order.orderStatus,
              total: order.total,
              customerName: order.customerName || 'Guest',
              items: order.items?.length || 0,
              tableNumber: order.tableNumber,
              createdAt: order.createdAt,
            };
          }
        } catch (orderError) {
          console.warn('Could not fetch order details for table:', table.number, orderError.message);
        }
      }
      return { ...table, orderDetails };
    }));
    
    res.status(200).json({
      success: true,
      data: {
        tables: tablesWithDetails,
        count: tablesWithDetails.length,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching staff tables:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables: ' + error.message,
    });
  }
};

// ============================================================
//  ✅ GET STAFF ATTENDANCE
// ============================================================

export const getStaffAttendance = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { month, year } = req.query;
    
    // ─── VALIDATE MONTH & YEAR ──────────────────────────────────────────
    let targetMonth = new Date().getMonth();
    let targetYear = new Date().getFullYear();
    
    if (month) {
      const monthNum = parseInt(month);
      if (isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
        return res.status(400).json({
          success: false,
          error: 'Invalid month. Must be between 0 and 11',
        });
      }
      targetMonth = monthNum;
    }
    
    if (year) {
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year format',
        });
      }
      targetYear = yearNum;
    }
    
    // TODO: Create Attendance model when ready
    const attendanceRecords = [];
    
    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      totalHours: 0,
      workingDays: 0,
    };
    
    res.status(200).json({
      success: true,
      data: {
        records: attendanceRecords,
        summary,
        month: targetMonth,
        year: targetYear,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching staff attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance',
    });
  }
};