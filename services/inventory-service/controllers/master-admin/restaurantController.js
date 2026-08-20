// controllers/master-admin/restaurantController.js - COMPLETE

import Restaurant from '../../models/super-admin/Restaurant.js';
import PlatformAuditLog from '../../models/master-admin/PlatformAuditLog.js';
import MasterAdmin from '../../models/master-admin/MasterAdmin.js';
import nodemailer from 'nodemailer';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';

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

// ─── Send Approval Email ──────────────────────────────────────────────────
const sendApprovalEmail = async (email, restaurantName, masterAdminName) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; text-align: center; }
        .button { display: inline-block; padding: 14px 40px; background: #f59e0b; color: white; text-decoration: none; border-radius: 10px; margin: 20px 0; font-weight: 600; }
        .footer { background: #f8f7f4; padding: 20px; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Restaurant Approved</h1>
        </div>
        <div class="content">
          <p>Dear Restaurant Owner,</p>
          <p>We are pleased to inform you that your restaurant <strong>"${restaurantName}"</strong> has been <strong>approved</strong> by <strong>${masterAdminName}</strong>.</p>
          <p>You can now start accepting orders and managing your restaurant.</p>
          <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Dashboard</a>
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
    subject: '✅ Restaurant Approved!',
    html,
  });
};

// ─── Send Rejection Email ──────────────────────────────────────────────────
const sendRejectionEmail = async (email, restaurantName, reason, masterAdminName) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; text-align: center; }
        .reason { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left; }
        .footer { background: #f8f7f4; padding: 20px; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Restaurant Rejection</h1>
        </div>
        <div class="content">
          <p>Dear Restaurant Owner,</p>
          <p>We regret to inform you that your restaurant <strong>"${restaurantName}"</strong> has been <strong>rejected</strong> by <strong>${masterAdminName}</strong>.</p>
          <div class="reason">
            <p><strong>Reason for rejection:</strong></p>
            <p>${reason}</p>
          </div>
          <p>If you have any questions, please contact our support team.</p>
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
    subject: '❌ Restaurant Rejection Notice',
    html,
  });
};

// ─── APPROVE RESTAURANT ──────────────────────────────────────────────────
export const approveRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const masterAdmin = req.masterAdmin;

    // ✅ Only Master Admin can approve
    if (!masterAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only Master Admin can approve restaurants',
      });
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // ─── Check current status ────────────────────────────────────────────
    if (restaurant.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Restaurant is already approved',
      });
    }

    // ─── Save previous status for audit ──────────────────────────────────
    const previousStatus = restaurant.approvalStatus;

    // ─── Update approval status ──────────────────────────────────────────
    restaurant.approvalStatus = 'approved';
    restaurant.status = 'active';
    restaurant.isActive = true;
    restaurant.approvedBy = masterAdmin._id;
    restaurant.approvedAt = new Date();
    restaurant.overriddenBy = masterAdmin._id;
    restaurant.overriddenAt = new Date();
    restaurant.overrideReason = reason ? sanitizeInput(reason.trim()) : 'Approved by Master Admin';
    restaurant.previousApprovalStatus = previousStatus;

    await restaurant.save();

    // ─── Send approval email ─────────────────────────────────────────────
    try {
      await sendApprovalEmail(
        restaurant.email,
        restaurant.name,
        `${masterAdmin.firstName} ${masterAdmin.lastName}`
      );
      console.log(`📧 Approval email sent to ${restaurant.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send approval email:', emailError);
    }

    // ─── Audit Log ──────────────────────────────────────────────────────
    await PlatformAuditLog.create({
      masterAdminId: masterAdmin._id,
      actorType: 'master_admin',
      actorEmail: masterAdmin.email,
      actorName: `${masterAdmin.firstName} ${masterAdmin.lastName}`,
      action: 'RESTAURANT_APPROVED',
      targetType: 'restaurant',
      targetId: restaurant._id.toString(),
      targetName: restaurant.name,
      details: {
        previousStatus,
        reason: reason || 'Approved by Master Admin',
        overridden: true,
      },
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      severity: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant approved successfully',
      data: restaurant,
    });

  } catch (error) {
    console.error('❌ Approve Restaurant Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve restaurant',
    });
  }
};

// ─── REJECT RESTAURANT ──────────────────────────────────────────────────
export const rejectRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const masterAdmin = req.masterAdmin;

    // ✅ Only Master Admin can reject
    if (!masterAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only Master Admin can reject restaurants',
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a detailed rejection reason (minimum 10 characters)',
      });
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // ─── Check current status ────────────────────────────────────────────
    if (restaurant.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Cannot reject an approved restaurant. Suspend it instead.',
      });
    }

    // ─── Save previous status for audit ──────────────────────────────────
    const previousStatus = restaurant.approvalStatus;

    // ─── Update approval status ──────────────────────────────────────────
    restaurant.approvalStatus = 'rejected';
    restaurant.status = 'inactive';
    restaurant.isActive = false;
    restaurant.rejectedBy = masterAdmin._id;
    restaurant.rejectedAt = new Date();
    restaurant.rejectionReason = sanitizeInput(reason.trim());
    restaurant.overriddenBy = masterAdmin._id;
    restaurant.overriddenAt = new Date();
    restaurant.overrideReason = `Rejected: ${sanitizeInput(reason.trim())}`;
    restaurant.previousApprovalStatus = previousStatus;

    await restaurant.save();

    // ─── Send rejection email ─────────────────────────────────────────────
    try {
      await sendRejectionEmail(
        restaurant.email,
        restaurant.name,
        reason,
        `${masterAdmin.firstName} ${masterAdmin.lastName}`
      );
      console.log(`📧 Rejection email sent to ${restaurant.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send rejection email:', emailError);
    }

    // ─── Audit Log ──────────────────────────────────────────────────────
    await PlatformAuditLog.create({
      masterAdminId: masterAdmin._id,
      actorType: 'master_admin',
      actorEmail: masterAdmin.email,
      actorName: `${masterAdmin.firstName} ${masterAdmin.lastName}`,
      action: 'RESTAURANT_REJECTED',
      targetType: 'restaurant',
      targetId: restaurant._id.toString(),
      targetName: restaurant.name,
      details: {
        previousStatus,
        reason: reason,
        overridden: true,
      },
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      severity: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant rejected successfully',
      data: restaurant,
    });

  } catch (error) {
    console.error('❌ Reject Restaurant Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject restaurant',
    });
  }
};

// ─── SUSPEND RESTAURANT ──────────────────────────────────────────────────
export const suspendRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const masterAdmin = req.masterAdmin;

    if (!masterAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only Master Admin can suspend restaurants',
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a detailed suspension reason (minimum 10 characters)',
      });
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    if (restaurant.approvalStatus === 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'Restaurant is already suspended',
      });
    }

    const previousStatus = restaurant.approvalStatus;

    restaurant.approvalStatus = 'suspended';
    restaurant.status = 'suspended';
    restaurant.isActive = false;
    restaurant.overriddenBy = masterAdmin._id;
    restaurant.overriddenAt = new Date();
    restaurant.overrideReason = `Suspended: ${sanitizeInput(reason.trim())}`;
    restaurant.previousApprovalStatus = previousStatus;

    await restaurant.save();

    await PlatformAuditLog.create({
      masterAdminId: masterAdmin._id,
      actorType: 'master_admin',
      actorEmail: masterAdmin.email,
      actorName: `${masterAdmin.firstName} ${masterAdmin.lastName}`,
      action: 'RESTAURANT_SUSPENDED',
      targetType: 'restaurant',
      targetId: restaurant._id.toString(),
      targetName: restaurant.name,
      details: {
        previousStatus,
        reason: reason,
        overridden: true,
      },
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      severity: 'warning',
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant suspended successfully',
      data: restaurant,
    });

  } catch (error) {
    console.error('❌ Suspend Restaurant Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend restaurant',
    });
  }
};

// ─── UNSUSPEND RESTAURANT ──────────────────────────────────────────────────
export const unsuspendRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const masterAdmin = req.masterAdmin;

    if (!masterAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only Master Admin can unsuspend restaurants',
      });
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    if (restaurant.approvalStatus !== 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'Restaurant is not suspended',
      });
    }

    const previousStatus = restaurant.approvalStatus;

    restaurant.approvalStatus = 'approved';
    restaurant.status = 'active';
    restaurant.isActive = true;
    restaurant.overriddenBy = masterAdmin._id;
    restaurant.overriddenAt = new Date();
    restaurant.overrideReason = reason ? `Unsuspended: ${sanitizeInput(reason.trim())}` : 'Unsuspended by Master Admin';
    restaurant.previousApprovalStatus = previousStatus;

    await restaurant.save();

    await PlatformAuditLog.create({
      masterAdminId: masterAdmin._id,
      actorType: 'master_admin',
      actorEmail: masterAdmin.email,
      actorName: `${masterAdmin.firstName} ${masterAdmin.lastName}`,
      action: 'RESTAURANT_UNSUSPENDED',
      targetType: 'restaurant',
      targetId: restaurant._id.toString(),
      targetName: restaurant.name,
      details: {
        previousStatus,
        reason: reason || 'Unsuspended by Master Admin',
        overridden: true,
      },
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      severity: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant unsuspended successfully',
      data: restaurant,
    });

  } catch (error) {
    console.error('❌ Unsuspend Restaurant Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsuspend restaurant',
    });
  }
};

// controllers/master-admin/restaurantController.js

// ... your existing imports

// ─── GET ALL RESTAURANTS ──────────────────────────────────────────────────
export const getAllRestaurants = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        approvalStatus,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;
  
      // Build filter
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'owner.name': { $regex: search, $options: 'i' } },
          { 'owner.email': { $regex: search, $options: 'i' } },
        ];
      }
  
      if (approvalStatus && approvalStatus !== 'all') {
        filter.approvalStatus = approvalStatus;
      }
  
      if (status && status !== 'all') {
        filter.status = status;
      }
  
      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  
      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      // Get total count
      const total = await Restaurant.countDocuments(filter);
  
      // Get restaurants with populated fields
      const restaurants = await Restaurant.find(filter)
        .populate('owner', 'name email phone')
        .populate('approvedBy', 'firstName lastName email')
        .populate('rejectedBy', 'firstName lastName email')
        .populate('overriddenBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
  
      res.status(200).json({
        success: true,
        data: {
          restaurants,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
  
    } catch (error) {
      console.error('❌ Get Restaurants Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurants',
      });
    }
  };
  
  // ─── GET SINGLE RESTAURANT ──────────────────────────────────────────────────
  export const getRestaurantById = async (req, res) => {
    try {
      const { id } = req.params;
  
      const restaurant = await Restaurant.findById(id)
        .populate('owner', 'name email phone')
        .populate('approvedBy', 'firstName lastName email')
        .populate('rejectedBy', 'firstName lastName email')
        .populate('overriddenBy', 'firstName lastName email')
        .lean();
  
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }
  
      res.status(200).json({
        success: true,
        data: restaurant,
      });
  
    } catch (error) {
      console.error('❌ Get Restaurant Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurant details',
      });
    }
  };
  
