// controllers/super-admin/auditController.js

import AuditLog from '../../models/AuditLog.js';
import mongoose from 'mongoose';
import moment from 'moment';

// ============================================================
//  ─── GET AUDIT LOGS ─────────────────────────────────────────
// ============================================================

export const getAuditLogs = async (req, res) => {
  try {
    const { 
      period = 'week',
      module,
      action,
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // ─── DATE RANGE ──────────────────────────────────────────────────
    let dateRange = getDateRange(period);
    
    // ─── BUILD FILTER ──────────────────────────────────────────────────
    let filter = {
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    };

    if (module && module !== 'all') {
      filter.module = module;
    }

    if (action && action !== 'all') {
      filter.action = action;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { module: { $regex: search, $options: 'i' } },
      ];
    }

    // ─── PAGINATION ──────────────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // ─── FETCH LOGS ──────────────────────────────────────────────────
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    // ─── CALCULATE STATS ──────────────────────────────────────────────
    const stats = await getAuditStats(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
        stats,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        count: logs.length,
      }
    });
  } catch (error) {
    console.error('❌ Get Audit Logs Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────

const getDateRange = (period) => {
  const now = moment();
  let start, end;

  switch (period) {
    case 'today':
      start = now.clone().startOf('day');
      end = now.clone().endOf('day');
      break;
    case 'week':
      start = now.clone().startOf('week');
      end = now.clone().endOf('week');
      break;
    case 'month':
      start = now.clone().startOf('month');
      end = now.clone().endOf('month');
      break;
    case 'all':
      start = moment('2000-01-01');
      end = now.clone().endOf('day');
      break;
    default:
      start = now.clone().startOf('week');
      end = now.clone().endOf('week');
  }

  return {
    start: start.toDate(),
    end: end.toDate()
  };
};

const getAuditStats = async (filter) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get all logs for stats
    const allLogs = await AuditLog.find(filter).lean();

    const byModule = {};
    const byAction = {};
    const byStatus = { success: 0, failed: 0, warning: 0 };

    allLogs.forEach(log => {
      byModule[log.module] = (byModule[log.module] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      if (log.status) {
        byStatus[log.status] = (byStatus[log.status] || 0) + 1;
      }
    });

    return {
      total: allLogs.length,
      today: allLogs.filter(l => new Date(l.createdAt) >= todayStart).length,
      thisWeek: allLogs.filter(l => new Date(l.createdAt) >= weekStart).length,
      thisMonth: allLogs.filter(l => new Date(l.createdAt) >= monthStart).length,
      byModule,
      byAction,
      byStatus,
    };
  } catch (error) {
    console.error('Error calculating audit stats:', error);
    return {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      byModule: {},
      byAction: {},
      byStatus: { success: 0, failed: 0, warning: 0 },
    };
  }
};

// ──────────────────────────────────────────────────────────────────────────
//  ─── CREATE AUDIT LOG (Utility function) ─────────────────────────────
// ============================================================

export const createAuditLog = async (data) => {
  try {
    const log = new AuditLog({
      userId: data.userId || 'system',
      userName: data.userName || 'System',
      userRole: data.userRole || 'system',
      userEmail: data.userEmail || '',
      action: data.action || 'unknown',
      module: data.module || 'system',
      description: data.description || '',
      details: data.details || {},
      ip: data.ip || 'unknown',
      userAgent: data.userAgent || 'unknown',
      status: data.status || 'success',
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
};

// ──────────────────────────────────────────────────────────────────────────
//  ─── GET AUDIT LOG BY ID ─────────────────────────────────────────────
// ============================================================

export const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audit log ID'
      });
    }

    const log = await AuditLog.findById(id).lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('❌ Get Audit Log Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
//  ─── EXPORT AUDIT LOGS ────────────────────────────────────────────────
// ============================================================

export const exportAuditLogs = async (req, res) => {
  try {
    const { period = 'month', module, action, status } = req.query;

    let dateRange = getDateRange(period);
    let filter = {
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    };

    if (module && module !== 'all') filter.module = module;
    if (action && action !== 'all') filter.action = action;
    if (status && status !== 'all') filter.status = status;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Format for CSV export
    const csvData = logs.map(log => ({
      'User': log.userName || 'System',
      'Email': log.userEmail || '',
      'Action': log.action || '',
      'Module': log.module || '',
      'Description': log.description || '',
      'Status': log.status || '',
      'IP': log.ip || '',
      'Date': new Date(log.createdAt).toLocaleString(),
    }));

    res.status(200).json({
      success: true,
      data: {
        logs: csvData,
        count: logs.length,
      }
    });
  } catch (error) {
    console.error('❌ Export Audit Logs Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs'
    });
  }
};