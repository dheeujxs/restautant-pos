// controllers/salaryController.js
import Salary from '../models/Salary.js';
import Staff from '../models/Staff.js';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  isValidEmail,
  isValidPhone,
  isValidPrice,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const ALLOWED_SALARY_STATUS = ['pending', 'approved', 'paid', 'rejected'];
const MAX_SALARY_AMOUNT = 10000000; // ₹1 Crore
const MIN_SALARY_AMOUNT = 0;
const MAX_BONUS_AMOUNT = 5000000; // ₹50 Lakhs
const MAX_DEDUCTION_AMOUNT = 5000000; // ₹50 Lakhs
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

const isValidMonth = (month) => {
  if (month === undefined || month === null) return false;
  const monthNum = parseInt(month);
  if (isNaN(monthNum)) return false;
  return monthNum >= 0 && monthNum <= 11;
};

const isValidYear = (year) => {
  if (!year) return false;
  const yearNum = parseInt(year);
  if (isNaN(yearNum)) return false;
  return yearNum >= MIN_YEAR && yearNum <= MAX_YEAR;
};

const isValidSalaryAmount = (amount, maxLimit = MAX_SALARY_AMOUNT) => {
  if (amount === undefined || amount === null) return true;
  if (typeof amount !== 'number') return false;
  if (amount < MIN_SALARY_AMOUNT) return false;
  if (amount > maxLimit) return false;
  return true;
};

const isValidBonus = (bonus) => {
  if (bonus === undefined || bonus === null) return true;
  if (typeof bonus !== 'number') return false;
  if (bonus < 0) return false;
  if (bonus > MAX_BONUS_AMOUNT) return false;
  return true;
};

const isValidDeduction = (deduction) => {
  if (deduction === undefined || deduction === null) return true;
  if (typeof deduction !== 'number') return false;
  if (deduction < 0) return false;
  if (deduction > MAX_DEDUCTION_AMOUNT) return false;
  return true;
};

const isValidSalaryStatus = (status) => {
  if (!status) return false;
  return ALLOWED_SALARY_STATUS.includes(status);
};

const isValidNotes = (notes) => {
  if (!notes) return true;
  const trimmed = notes.trim();
  if (trimmed.length > MAX_NOTES_LENGTH) return false;
  return true;
};

const isValidRejectionReason = (reason) => {
  if (!reason) return true;
  const trimmed = reason.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) return false;
  return true;
};

const isValidMonthYear = (month, year) => {
  if (!isValidMonth(month)) return false;
  if (!isValidYear(year)) return false;
  return true;
};

const sanitizeSalary = (salary) => {
  if (!salary) return null;
  return {
    _id: salary._id,
    id: salary._id,
    staffId: salary.staffId?._id || salary.staffId,
    staffName: sanitizeInput(salary.staffName || ''),
    employeeId: salary.employeeId || '',
    month: salary.month,
    monthName: MONTH_NAMES[salary.month] || '',
    year: salary.year,
    baseSalary: salary.baseSalary || 0,
    bonuses: salary.bonuses || 0,
    deductions: salary.deductions || 0,
    netSalary: salary.netSalary || 0,
    status: salary.status || 'pending',
    notes: sanitizeInput(salary.notes || ''),
    rejectionReason: salary.rejectionReason ? sanitizeInput(salary.rejectionReason) : null,
    createdAt: salary.createdAt,
    updatedAt: salary.updatedAt,
    approvedAt: salary.approvedAt || null,
    paidAt: salary.paidAt || null,
    rejectedAt: salary.rejectedAt || null,
    approvedBy: salary.approvedBy,
    paidBy: salary.paidBy,
    rejectedBy: salary.rejectedBy,
  };
};

// ============================================================
//  SALARY CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all salaries
// @route   GET /api/salaries
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getSalaries = async (req, res) => {
  try {
    const { month, year, status, staffId } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (month !== undefined) {
      if (!isValidMonth(month)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid month. Must be between 0 (January) and 11 (December)',
        });
      }
      filter.month = parseInt(month);
    }

    if (year) {
      if (!isValidYear(year)) {
        return res.status(400).json({
          success: false,
          error: `Invalid year. Must be between ${MIN_YEAR} and ${MAX_YEAR}`,
        });
      }
      filter.year = parseInt(year);
    }

    if (status) {
      if (!isValidSalaryStatus(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid salary status. Allowed: ${ALLOWED_SALARY_STATUS.join(', ')}`,
        });
      }
      filter.status = status;
    }

    if (staffId) {
      if (!isValidObjectId(staffId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid staff ID format',
        });
      }
      filter.staffId = staffId;
    }

    const [salaries, total] = await Promise.all([
      Salary.find(filter)
        .populate('staffId', 'name phoneNumber email role profileImage')
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .populate('paidBy', 'firstName lastName email')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Salary.countDocuments(filter),
    ]);

    const sanitizedSalaries = salaries.map(sanitizeSalary);

    const totalAmount = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const pendingAmount = salaries
      .filter(s => s.status === 'pending')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const paidAmount = salaries
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);

    return res.json({
      success: true,
      data: {
        salaries: sanitizedSalaries,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: salaries.length,
        summary: {
          totalAmount,
          pendingAmount,
          paidAmount,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/salaries] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch salaries',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get salary by ID
// @route   GET /api/salaries/:id
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getSalaryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid salary ID format',
      });
    }

    const salary = await Salary.findById(id)
      .populate('staffId', 'name phoneNumber email role profileImage')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('paidBy', 'firstName lastName email')
      .lean();

    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizeSalary(salary),
    });
  } catch (error) {
    console.error('[GET /api/salaries/:id] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch salary',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get salaries for a specific staff member
// @route   GET /api/salaries/staff/:staffId
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getStaffSalaries = async (req, res) => {
  try {
    const { staffId } = req.params;
    if (!isValidObjectId(staffId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }

    const { year } = req.query;
    const filter = { staffId };

    if (year) {
      if (!isValidYear(year)) {
        return res.status(400).json({
          success: false,
          error: `Invalid year. Must be between ${MIN_YEAR} and ${MAX_YEAR}`,
        });
      }
      filter.year = parseInt(year);
    }

    const salaries = await Salary.find(filter)
      .sort({ year: -1, month: -1 })
      .lean();

    const sanitizedSalaries = salaries.map(sanitizeSalary);

    const totalPaid = sanitizedSalaries
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const totalPending = sanitizedSalaries
      .filter(s => s.status === 'pending')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);

    return res.json({
      success: true,
      data: {
        salaries: sanitizedSalaries,
        count: salaries.length,
        summary: {
          totalPaid,
          totalPending,
          total: totalPaid + totalPending,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/salaries/staff/:staffId] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch staff salaries',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create new salary - FIXED
// @route   POST /api/salaries
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const createSalary = async (req, res) => {
  console.log('========================================');
  console.log('📝 CREATE SALARY');
  console.log('========================================');
  
  try {
    // ─── GET USER ID FROM REQUEST ──────────────────────────────────────
    // ✅ FIX: Get userId from req.user or req.admin
    const userId = req.user?._id || req.admin?._id || req.user?.id;
    
    console.log('👤 User ID:', userId);
    console.log('📦 Request Body:', req.body);

    if (!userId) {
      console.error('❌ No userId found in request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login.',
      });
    }

    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const body = sanitizeObject(req.body);
    const { staffId, month, year, baseSalary, bonuses, deductions, notes } = body;

    console.log('📋 Parsed data:', { staffId, month, year, baseSalary, bonuses, deductions });

    // ─── VALIDATE STAFF ID ──────────────────────────────────────────────
    if (!staffId || !isValidObjectId(staffId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid staff ID is required',
      });
    }

    // ─── VALIDATE MONTH & YEAR ──────────────────────────────────────────
    if (!isValidMonthYear(month, year)) {
      return res.status(400).json({
        success: false,
        error: `Invalid month/year combination. Month must be 0-11, year must be ${MIN_YEAR}-${MAX_YEAR}`,
      });
    }

    // ─── VALIDATE STAFF EXISTS ──────────────────────────────────────────
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found',
      });
    }

    console.log('👤 Staff found:', staff.name, staff.employeeId);

    // ─── CHECK DUPLICATE ──────────────────────────────────────────────────
    const existingSalary = await Salary.findOne({
      staffId,
      month: parseInt(month),
      year: parseInt(year),
    });

    if (existingSalary) {
      return res.status(409).json({
        success: false,
        error: `Salary already exists for ${staff.name} for ${MONTH_NAMES[month]} ${year}`,
      });
    }

    // ─── VALIDATE AMOUNTS ──────────────────────────────────────────────────
    const baseSalaryAmount = Number(baseSalary) || 0;
    if (baseSalaryAmount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Base salary cannot be negative',
      });
    }
    if (baseSalaryAmount > MAX_SALARY_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Base salary cannot exceed ${MAX_SALARY_AMOUNT}`,
      });
    }

    const bonusesAmount = Number(bonuses) || 0;
    if (bonusesAmount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Bonuses cannot be negative',
      });
    }
    if (bonusesAmount > MAX_BONUS_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Bonuses cannot exceed ${MAX_BONUS_AMOUNT}`,
      });
    }

    const deductionsAmount = Number(deductions) || 0;
    if (deductionsAmount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Deductions cannot be negative',
      });
    }
    if (deductionsAmount > MAX_DEDUCTION_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Deductions cannot exceed ${MAX_DEDUCTION_AMOUNT}`,
      });
    }

    // ─── VALIDATE NOTES ──────────────────────────────────────────────────
    if (notes && !isValidNotes(notes)) {
      return res.status(400).json({
        success: false,
        error: `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`,
      });
    }

    // ─── CALCULATE NET SALARY ────────────────────────────────────────────
    const netSalary = baseSalaryAmount + bonusesAmount - deductionsAmount;
    if (netSalary < 0) {
      return res.status(400).json({
        success: false,
        error: 'Net salary cannot be negative. Please check deductions.',
      });
    }

    console.log('💰 Net Salary calculated:', netSalary);

    // ─── CREATE SALARY ──────────────────────────────────────────────────
    const salaryData = {
      staffId,
      staffName: sanitizeInput(staff.name),
      employeeId: staff.employeeId || 'EMP' + Date.now(),
      month: parseInt(month),
      year: parseInt(year),
      baseSalary: baseSalaryAmount,
      bonuses: bonusesAmount,
      deductions: deductionsAmount,
      netSalary,
      notes: notes ? sanitizeInput(notes.trim()) : '',
      status: 'pending',
      createdBy: userId,
    };

    console.log('📝 Salary data:', salaryData);

    const salary = await Salary.create(salaryData);

    // ─── POPULATE FOR RESPONSE ──────────────────────────────────────────
    const populatedSalary = await Salary.findById(salary._id)
      .populate('staffId', 'name phoneNumber email role')
      .lean();

    console.log('✅ Salary created successfully for:', staff.name);

    return res.status(201).json({
      success: true,
      data: sanitizeSalary(populatedSalary),
      message: `Salary created for ${staff.name} for ${MONTH_NAMES[month]} ${year}`,
    });
  } catch (error) {
    console.error('[POST /api/salaries] ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Salary already exists for this staff member for the selected month',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create salary: ' + error.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update salary
// @route   PATCH /api/salaries/:id
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const updateSalary = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid salary ID format',
      });
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary not found',
      });
    }

    if (salary.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update a paid salary',
      });
    }

    const body = sanitizeObject(req.body);
    const { baseSalary, bonuses, deductions, notes } = body;

    const newBase = baseSalary !== undefined ? baseSalary : salary.baseSalary;
    const newBonuses = bonuses !== undefined ? bonuses : salary.bonuses;
    const newDeductions = deductions !== undefined ? deductions : salary.deductions;

    if (baseSalary !== undefined && !isValidSalaryAmount(newBase)) {
      return res.status(400).json({
        success: false,
        error: `Base salary must be between ${MIN_SALARY_AMOUNT} and ${MAX_SALARY_AMOUNT}`,
      });
    }

    if (bonuses !== undefined && !isValidBonus(newBonuses)) {
      return res.status(400).json({
        success: false,
        error: `Bonuses cannot exceed ${MAX_BONUS_AMOUNT}`,
      });
    }

    if (deductions !== undefined && !isValidDeduction(newDeductions)) {
      return res.status(400).json({
        success: false,
        error: `Deductions cannot exceed ${MAX_DEDUCTION_AMOUNT}`,
      });
    }

    if (notes !== undefined && !isValidNotes(notes)) {
      return res.status(400).json({
        success: false,
        error: `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`,
      });
    }

    const netSalary = newBase + newBonuses - newDeductions;
    if (netSalary < 0) {
      return res.status(400).json({
        success: false,
        error: 'Net salary cannot be negative. Please check deductions.',
      });
    }

    const updateData = {
      baseSalary: newBase,
      bonuses: newBonuses,
      deductions: newDeductions,
      netSalary,
      notes: notes !== undefined ? (notes ? sanitizeInput(notes.trim()) : '') : salary.notes,
    };

    if (salary.status === 'approved') {
      updateData.status = 'pending';
    }

    const updated = await Salary.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('staffId', 'name phoneNumber email role');

    return res.json({
      success: true,
      data: sanitizeSalary(updated),
      message: 'Salary updated successfully',
    });
  } catch (error) {
    console.error('[PATCH /api/salaries/:id] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update salary',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Approve salary
// @route   PATCH /api/salaries/:id/approve
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const approveSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.admin?._id || req.user?.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid salary ID format',
      });
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary not found',
      });
    }

    if (salary.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Salary is already ${salary.status}`,
      });
    }

    salary.status = 'approved';
    salary.approvedBy = userId;
    salary.approvedAt = new Date();
    await salary.save();

    const updated = await Salary.findById(salary._id)
      .populate('staffId', 'name phoneNumber email role')
      .populate('approvedBy', 'firstName lastName email')
      .lean();

    return res.json({
      success: true,
      data: sanitizeSalary(updated),
      message: 'Salary approved successfully',
    });
  } catch (error) {
    console.error('[PATCH /api/salaries/:id/approve] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to approve salary',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Pay salary (mark as paid)
// @route   PATCH /api/salaries/:id/pay
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const paySalary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.admin?._id || req.user?.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid salary ID format',
      });
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary not found',
      });
    }

    if (salary.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Salary is already paid',
      });
    }

    if (salary.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Salary must be approved before payment',
      });
    }

    salary.status = 'paid';
    salary.paidBy = userId;
    salary.paidAt = new Date();
    await salary.save();

    const updated = await Salary.findById(salary._id)
      .populate('staffId', 'name phoneNumber email role')
      .populate('approvedBy', 'firstName lastName email')
      .populate('paidBy', 'firstName lastName email')
      .lean();

    return res.json({
      success: true,
      data: sanitizeSalary(updated),
      message: 'Salary marked as paid successfully',
    });
  } catch (error) {
    console.error('[PATCH /api/salaries/:id/pay] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark salary as paid',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Reject salary
// @route   PATCH /api/salaries/:id/reject
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const rejectSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.admin?._id || req.user?.id;
    const { reason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid salary ID format',
      });
    }

    if (reason && !isValidRejectionReason(reason)) {
      return res.status(400).json({
        success: false,
        error: `Rejection reason cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
      });
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary not found',
      });
    }

    if (salary.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Salary is already ${salary.status}`,
      });
    }

    salary.status = 'rejected';
    salary.rejectedBy = userId;
    salary.rejectedAt = new Date();
    salary.rejectionReason = reason ? sanitizeInput(reason.trim()) : 'No reason provided';
    await salary.save();

    return res.json({
      success: true,
      data: sanitizeSalary(salary),
      message: 'Salary rejected successfully',
    });
  } catch (error) {
    console.error('[PATCH /api/salaries/:id/reject] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to reject salary',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete salary
// @route   DELETE /api/salaries/:id
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const deleteSalary = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid salary ID format',
      });
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary not found',
      });
    }

    if (salary.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a paid salary',
      });
    }

    await Salary.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Salary for ${MONTH_NAMES[salary.month]} ${salary.year} deleted successfully`,
    });
  } catch (error) {
    console.error('[DELETE /api/salaries/:id] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete salary',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get salary statistics
// @route   GET /api/salaries/stats
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getSalaryStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};

    if (month !== undefined) {
      if (!isValidMonth(month)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid month. Must be between 0 (January) and 11 (December)',
        });
      }
      filter.month = parseInt(month);
    }

    if (year) {
      if (!isValidYear(year)) {
        return res.status(400).json({
          success: false,
          error: `Invalid year. Must be between ${MIN_YEAR} and ${MAX_YEAR}`,
        });
      }
      filter.year = parseInt(year);
    }

    const salaries = await Salary.find(filter);

    const total = salaries.length;
    const pending = salaries.filter(s => s.status === 'pending').length;
    const approved = salaries.filter(s => s.status === 'approved').length;
    const paid = salaries.filter(s => s.status === 'paid').length;
    const rejected = salaries.filter(s => s.status === 'rejected').length;
    const totalAmount = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const pendingAmount = salaries
      .filter(s => s.status === 'pending')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const paidAmount = salaries
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const approvedAmount = salaries
      .filter(s => s.status === 'approved')
      .reduce((sum, s) => sum + (s.netSalary || 0), 0);

    const monthlyTrend = await Salary.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          total: { $sum: '$netSalary' },
          count: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    return res.json({
      success: true,
      data: {
        summary: {
          total,
          pending,
          approved,
          paid,
          rejected,
          totalAmount,
          pendingAmount,
          paidAmount,
          approvedAmount,
        },
        monthlyTrend: monthlyTrend.map(item => ({
          month: item._id.month,
          monthName: MONTH_NAMES[item._id.month] || '',
          year: item._id.year,
          total: item.total,
          count: item.count,
          paidCount: item.paidCount,
        })),
        monthName: month !== undefined ? MONTH_NAMES[parseInt(month)] : 'All',
        year: year || 'All',
      },
    });
  } catch (error) {
    console.error('[GET /api/salaries/stats] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch salary stats',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete salaries
// @route   DELETE /api/salaries/bulk
// @access  Private (Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteSalaries = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of salary IDs',
      });
    }
    
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 salaries can be deleted at once',
      });
    }
    
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ID format: ${invalidIds.join(', ')}`,
      });
    }
    
    const paidSalaries = await Salary.find({
      _id: { $in: ids },
      status: 'paid',
    }).select('_id');
    
    if (paidSalaries.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete ${paidSalaries.length} paid salary(ies). Please refund before deleting.`,
      });
    }
    
    const result = await Salary.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No salaries found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} salaries deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error('[DELETE /api/salaries/bulk] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete salaries',
    });
  }
};