// controllers/attendanceController.js
import Attendance from '../models/Attendance.js';
import Staff from '../models/Staff.js';
import moment from 'moment';
import { 
  isValidObjectId, 
  isValidPhone, 
  isValidName,
  isValidText,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS
// ============================================================

const MAX_LOCATION_LENGTH = 200;
const MAX_NOTES_LENGTH_ATTENDANCE = 500;

// ============================================================
//  VALIDATION HELPERS
// ============================================================

const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

const isValidTime = (timeStr) => {
  if (!timeStr) return false;
  // Validate ISO time format or HH:mm
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return isoRegex.test(timeStr) || timeRegex.test(timeStr);
};

const isValidStatus = (status) => {
  return ['pending', 'approved', 'rejected'].includes(status);
};

// ============================================================
//  ─── STAFF: Punch In ──────────────────────────────────────────────────────
// ============================================================

export const punchIn = async (req, res) => {
  try {
    const staff = req.staff;
    const { location, notes } = req.body;

    // ─── VALIDATE INPUTS ──────────────────────────────────────────────────
    if (location && typeof location === 'string') {
      const sanitizedLocation = sanitizeInput(location);
      if (sanitizedLocation.length > MAX_LOCATION_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Location cannot exceed ${MAX_LOCATION_LENGTH} characters`,
        });
      }
    }

    if (notes && typeof notes === 'string') {
      const sanitizedNotes = sanitizeInput(notes);
      if (sanitizedNotes.length > MAX_NOTES_LENGTH_ATTENDANCE) {
        return res.status(400).json({
          success: false,
          error: `Notes cannot exceed ${MAX_NOTES_LENGTH_ATTENDANCE} characters`,
        });
      }
    }

    // ─── CHECK TODAY'S ATTENDANCE ──────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await Attendance.findOne({
      staffId: staff._id,
      date: today,
    });
    
    if (existing) {
      // Check if already punched in
      if (existing.punchIn?.time) {
        return res.status(409).json({
          success: false,
          error: 'You have already punched in today',
          data: {
            punchInTime: existing.punchIn.time,
            status: existing.status,
          },
        });
      }
    }
    
    const now = new Date();
    
    // ─── CHECK LATE ──────────────────────────────────────────────────────
    const startOfDay = new Date(now);
    startOfDay.setHours(9, 30, 0, 0);
    const isLate = now > startOfDay;
    const lateMinutes = isLate ? Math.round((now.getTime() - startOfDay.getTime()) / 60000) : 0;
    
    // ─── CREATE ATTENDANCE RECORD ──────────────────────────────────────
    const attendanceData = {
      staffId: staff._id,
      staffName: sanitizeInput(staff.name),
      employeeId: staff.employeeId,
      date: today,
      punchIn: {
        time: now,
        location: location ? sanitizeInput(location) : '',
        notes: notes ? sanitizeInput(notes) : '',
      },
      status: 'pending',
      isLate,
      lateMinutes: Math.min(lateMinutes, 999), // Limit to prevent overflow
    };

    // Validate location if provided
    if (location && typeof location === 'object') {
      // If location is an object with lat/lng
      if (location.lat !== undefined && location.lng !== undefined) {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lng);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          attendanceData.punchIn.location = {
            lat,
            lng,
            address: location.address ? sanitizeInput(location.address) : '',
          };
        }
      }
    }
    
    const attendance = await Attendance.create(attendanceData);
    
    console.log(`✅ ${staff.name} punched in at ${now.toLocaleTimeString()}`);
    
    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedResponse = {
      _id: attendance._id,
      staffId: attendance.staffId,
      staffName: sanitizeInput(attendance.staffName),
      employeeId: attendance.employeeId,
      date: attendance.date,
      punchIn: {
        time: attendance.punchIn.time,
        location: typeof attendance.punchIn.location === 'object' 
          ? { lat: attendance.punchIn.location.lat, lng: attendance.punchIn.location.lng }
          : attendance.punchIn.location || '',
        notes: sanitizeInput(attendance.punchIn.notes || ''),
      },
      status: attendance.status,
      isLate: attendance.isLate,
      lateMinutes: attendance.lateMinutes,
      createdAt: attendance.createdAt,
    };
    
    res.status(201).json({
      success: true,
      data: sanitizedResponse,
      message: `Punch in successful at ${now.toLocaleTimeString()}${isLate ? ` (Late by ${lateMinutes} mins)` : ''}`,
    });
  } catch (error) {
    console.error('❌ Error punching in:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to punch in',
    });
  }
};

// ============================================================
//  ─── STAFF: Punch Out ──────────────────────────────────────────────────────
// ============================================================

export const punchOut = async (req, res) => {
  try {
    const staff = req.staff;
    const { location, notes } = req.body;

    // ─── VALIDATE INPUTS ──────────────────────────────────────────────────
    if (location && typeof location === 'string') {
      const sanitizedLocation = sanitizeInput(location);
      if (sanitizedLocation.length > MAX_LOCATION_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Location cannot exceed ${MAX_LOCATION_LENGTH} characters`,
        });
      }
    }

    if (notes && typeof notes === 'string') {
      const sanitizedNotes = sanitizeInput(notes);
      if (sanitizedNotes.length > MAX_NOTES_LENGTH_ATTENDANCE) {
        return res.status(400).json({
          success: false,
          error: `Notes cannot exceed ${MAX_NOTES_LENGTH_ATTENDANCE} characters`,
        });
      }
    }

    // ─── FIND TODAY'S ATTENDANCE ──────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.findOne({
      staffId: staff._id,
      date: today,
    });
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'No punch in record found for today',
      });
    }
    
    if (attendance.punchOut?.time) {
      return res.status(409).json({
        success: false,
        error: 'You have already punched out today',
        data: {
          punchOutTime: attendance.punchOut.time,
          totalHours: attendance.totalHours,
        },
      });
    }
    
    const now = new Date();
    
    // ─── VALIDATE PUNCH IN TIME ─────────────────────────────────────────
    if (!attendance.punchIn?.time) {
      return res.status(400).json({
        success: false,
        error: 'No punch in time found. Please contact admin.',
      });
    }

    // Prevent punch out before punch in
    if (now.getTime() < new Date(attendance.punchIn.time).getTime()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot punch out before punch in time',
      });
    }
    
    // ─── UPDATE ATTENDANCE ──────────────────────────────────────────────
    attendance.punchOut = {
      time: now,
      location: location ? sanitizeInput(location) : '',
      notes: notes ? sanitizeInput(notes) : '',
    };
    
    // Calculate total hours
    const diff = now.getTime() - new Date(attendance.punchIn.time).getTime();
    attendance.totalHours = Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
    
    // Calculate overtime
    if (attendance.totalHours > 8) {
      attendance.overtime = Math.round((attendance.totalHours - 8) * 100) / 100;
    }
    
    await attendance.save();
    
    console.log(`✅ ${staff.name} punched out at ${now.toLocaleTimeString()}`);
    
    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedResponse = {
      _id: attendance._id,
      staffId: attendance.staffId,
      staffName: sanitizeInput(attendance.staffName),
      employeeId: attendance.employeeId,
      date: attendance.date,
      punchIn: {
        time: attendance.punchIn.time,
        location: typeof attendance.punchIn.location === 'object' 
          ? { lat: attendance.punchIn.location.lat, lng: attendance.punchIn.location.lng }
          : attendance.punchIn.location || '',
        notes: sanitizeInput(attendance.punchIn.notes || ''),
      },
      punchOut: {
        time: attendance.punchOut.time,
        location: typeof attendance.punchOut.location === 'object' 
          ? { lat: attendance.punchOut.location.lat, lng: attendance.punchOut.location.lng }
          : attendance.punchOut.location || '',
        notes: sanitizeInput(attendance.punchOut.notes || ''),
      },
      totalHours: attendance.totalHours,
      overtime: attendance.overtime || 0,
      status: attendance.status,
      isLate: attendance.isLate,
      lateMinutes: attendance.lateMinutes,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
    };
    
    res.json({
      success: true,
      data: sanitizedResponse,
      message: `Punch out successful at ${now.toLocaleTimeString()}. Total hours: ${attendance.totalHours}h${attendance.overtime > 0 ? ` (Overtime: ${attendance.overtime}h)` : ''}`,
    });
  } catch (error) {
    console.error('❌ Error punching out:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to punch out',
    });
  }
};

// ============================================================
//  ─── STAFF: Get My Attendance ────────────────────────────────────────────
// ============================================================

export const getMyAttendance = async (req, res) => {
  try {
    const staff = req.staff;
    const { month, year, limit } = req.query;
    
    const filter = { staffId: staff._id };
    
    // ─── VALIDATE MONTH & YEAR ──────────────────────────────────────────
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: 'Invalid month. Must be between 1 and 12',
        });
      }
      
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year format',
        });
      }
      
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      filter.date = {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0],
      };
    }
    
    const limitNum = Math.min(parseInt(limit) || 30, 100);
    
    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .limit(limitNum)
      .lean();
    
    // ─── CALCULATE SUMMARY ──────────────────────────────────────────────
    const totalDays = records.length;
    const presentDays = records.filter(r => r.punchIn?.time).length;
    const approvedDays = records.filter(r => r.status === 'approved').length;
    const pendingDays = records.filter(r => r.status === 'pending').length;
    const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const totalOvertime = records.reduce((sum, r) => sum + (r.overtime || 0), 0);
    const lateDays = records.filter(r => r.isLate).length;
    
    // ─── GET TODAY'S STATUS ─────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = records.find(r => r.date === today);
    
    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedRecords = records.map(record => ({
      _id: record._id,
      staffId: record.staffId,
      staffName: sanitizeInput(record.staffName || ''),
      employeeId: record.employeeId,
      date: record.date,
      punchIn: record.punchIn ? {
        time: record.punchIn.time,
        location: typeof record.punchIn.location === 'object' 
          ? { lat: record.punchIn.location.lat, lng: record.punchIn.location.lng }
          : record.punchIn.location || '',
        notes: sanitizeInput(record.punchIn.notes || ''),
      } : null,
      punchOut: record.punchOut ? {
        time: record.punchOut.time,
        location: typeof record.punchOut.location === 'object' 
          ? { lat: record.punchOut.location.lat, lng: record.punchOut.location.lng }
          : record.punchOut.location || '',
        notes: sanitizeInput(record.punchOut.notes || ''),
      } : null,
      totalHours: record.totalHours || 0,
      overtime: record.overtime || 0,
      status: record.status,
      isLate: record.isLate || false,
      lateMinutes: record.lateMinutes || 0,
      createdAt: record.createdAt,
    }));
    
    res.json({
      success: true,
      data: {
        records: sanitizedRecords,
        summary: {
          totalDays,
          presentDays,
          approvedDays,
          pendingDays,
          totalHours: Math.round(totalHours * 100) / 100,
          totalOvertime: Math.round(totalOvertime * 100) / 100,
          lateDays,
        },
        today: todayRecord ? {
          punchedIn: !!todayRecord.punchIn?.time,
          punchedOut: !!todayRecord.punchOut?.time,
          status: todayRecord.status,
          punchInTime: todayRecord.punchIn?.time,
          punchOutTime: todayRecord.punchOut?.time,
          totalHours: todayRecord.totalHours || 0,
          isLate: todayRecord.isLate || false,
          lateMinutes: todayRecord.lateMinutes || 0,
        } : null,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance',
    });
  }
};

// ============================================================
//  ─── ADMIN: Get All Attendance Records ────────────────────────────────────
// ============================================================

export const getAllAttendance = async (req, res) => {
  try {
    const { status, date, staffId, startDate, endDate, page, limit } = req.query;
    
    const filter = {};
    
    // ─── VALIDATE STATUS ──────────────────────────────────────────────────
    if (status) {
      if (!isValidStatus(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be pending, approved, or rejected',
        });
      }
      filter.status = status;
    }
    
    // ─── VALIDATE STAFF ID ──────────────────────────────────────────────
    if (staffId) {
      if (!isValidObjectId(staffId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid staff ID format',
        });
      }
      filter.staffId = staffId;
    }
    
    // ─── VALIDATE DATE ──────────────────────────────────────────────────
    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
      }
      filter.date = date;
    }
    
    if (startDate && endDate) {
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
      }
      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date cannot be after end date',
        });
      }
      filter.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const skip = (pageNum - 1) * limitNum;
    
    // ─── FETCH RECORDS ──────────────────────────────────────────────────
    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate('staffId', 'name employeeId role phoneNumber')
        .sort({ date: -1, 'punchIn.time': -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Attendance.countDocuments(filter),
    ]);
    
    // ─── GET STAFF LIST FOR FILTER ──────────────────────────────────────
    const staffList = await Staff.find({ status: 'active' })
      .select('name employeeId role')
      .sort({ name: 1 })
      .lean();
    
    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedRecords = records.map(record => ({
      ...record,
      staffName: sanitizeInput(record.staffName || ''),
      notes: record.notes ? sanitizeInput(record.notes) : '',
      punchIn: record.punchIn ? {
        ...record.punchIn,
        notes: record.punchIn.notes ? sanitizeInput(record.punchIn.notes) : '',
      } : null,
      punchOut: record.punchOut ? {
        ...record.punchOut,
        notes: record.punchOut.notes ? sanitizeInput(record.punchOut.notes) : '',
      } : null,
    }));
    
    res.json({
      success: true,
      data: {
        records: sanitizedRecords,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        staffList: staffList.map(s => ({
          _id: s._id,
          name: sanitizeInput(s.name),
          employeeId: s.employeeId,
          role: s.role,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching all attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance records',
    });
  }
};

// ============================================================
//  ─── ADMIN: Approve/Reject Attendance ────────────────────────────────────
// ============================================================

export const updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const admin = req.user || req.staff;
    
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid attendance ID format',
      });
    }
    
    // ─── VALIDATE STATUS ──────────────────────────────────────────────────
    if (!status || !isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be approved or rejected',
      });
    }
    
    // ─── VALIDATE REJECTION REASON ──────────────────────────────────────
    if (status === 'rejected') {
      if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required when rejecting',
        });
      }
      if (rejectionReason.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason cannot exceed 500 characters',
        });
      }
    }
    
    // ─── FIND ATTENDANCE ────────────────────────────────────────────────
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }
    
    // ─── CHECK IF ALREADY PROCESSED ────────────────────────────────────
    if (attendance.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: `Attendance already ${attendance.status}`,
        data: {
          currentStatus: attendance.status,
          processedBy: attendance.approvedByName,
          processedAt: attendance.approvedAt,
        },
      });
    }
    
    // ─── UPDATE STATUS ──────────────────────────────────────────────────
    attendance.status = status;
    attendance.approvedBy = admin._id;
    attendance.approvedByName = admin.name || admin.firstName || 'Admin';
    attendance.approvedAt = new Date();
    
    if (status === 'rejected' && rejectionReason) {
      attendance.rejectionReason = sanitizeInput(rejectionReason);
    }
    
    await attendance.save();
    
    console.log(`✅ Attendance ${attendance._id} ${status} by ${attendance.approvedByName}`);
    
    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedResponse = {
      _id: attendance._id,
      staffId: attendance.staffId,
      staffName: sanitizeInput(attendance.staffName || ''),
      date: attendance.date,
      status: attendance.status,
      approvedBy: attendance.approvedBy,
      approvedByName: sanitizeInput(attendance.approvedByName || ''),
      approvedAt: attendance.approvedAt,
      rejectionReason: attendance.rejectionReason ? sanitizeInput(attendance.rejectionReason) : null,
      updatedAt: attendance.updatedAt,
    };
    
    res.json({
      success: true,
      data: sanitizedResponse,
      message: `Attendance ${status} successfully`,
    });
  } catch (error) {
    console.error('❌ Error updating attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update attendance',
    });
  }
};

// ============================================================
//  ─── ADMIN: Get Attendance Stats ──────────────────────────────────────────
// ============================================================

export const getAttendanceStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    
    // ─── FETCH STATS ────────────────────────────────────────────────────
    const [todayStats, monthStats, pendingApprovals] = await Promise.all([
      Attendance.aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            punchedIn: { $sum: { $cond: [{ $ne: ['$punchIn.time', null] }, 1, 0] } },
            punchedOut: { $sum: { $cond: [{ $ne: ['$punchOut.time', null] }, 1, 0] } },
            late: { $sum: { $cond: ['$isLate', 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          },
        },
      ]),
      
      Attendance.aggregate([
        { $match: { date: { $gte: startOfMonthStr } } },
        {
          $group: {
            _id: null,
            totalDays: { $sum: 1 },
            totalHours: { $sum: '$totalHours' },
            totalOvertime: { $sum: '$overtime' },
          },
        },
      ]),
      
      Attendance.countDocuments({ status: 'pending' }),
    ]);
    
    // ─── GET RECENT PENDING APPROVALS ──────────────────────────────────
    const pendingRecords = await Attendance.find({ status: 'pending' })
      .populate('staffId', 'name employeeId phoneNumber')
      .sort({ date: -1, 'punchIn.time': -1 })
      .limit(10)
      .lean();
    
    // ─── SANITIZE RESPONSE ──────────────────────────────────────────────
    const sanitizedPendingRecords = pendingRecords.map(record => ({
      _id: record._id,
      staffId: record.staffId,
      staffName: sanitizeInput(record.staffName || ''),
      employeeId: record.employeeId,
      date: record.date,
      punchIn: record.punchIn ? {
        time: record.punchIn.time,
        location: typeof record.punchIn.location === 'object' 
          ? { lat: record.punchIn.location.lat, lng: record.punchIn.location.lng }
          : record.punchIn.location || '',
      } : null,
      punchOut: record.punchOut ? {
        time: record.punchOut.time,
      } : null,
      isLate: record.isLate || false,
      lateMinutes: record.lateMinutes || 0,
      createdAt: record.createdAt,
    }));
    
    res.json({
      success: true,
      data: {
        today: todayStats[0] || { total: 0, punchedIn: 0, punchedOut: 0, late: 0, pending: 0, approved: 0 },
        month: monthStats[0] || { totalDays: 0, totalHours: 0, totalOvertime: 0 },
        pendingApprovals,
        pendingRecords: sanitizedPendingRecords,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance stats',
    });
  }
};