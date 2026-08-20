// controllers/floorController.js
import Floor from '../models/Floor.js';
import Table from '../models/Table.js';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_NAME_LENGTH_FLOOR = 100;
const MAX_DESCRIPTION_LENGTH_FLOOR = 500;

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Validate floor name with XSS protection
const isValidFloorName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_NAME_LENGTH_FLOOR) return false;
  // Only allow safe characters (alphanumeric, spaces, and basic punctuation)
  const nameRegex = /^[a-zA-Z0-9\s\-_.,&()'"]+$/;
  return nameRegex.test(trimmed);
};

// Validate description
const isValidDescription = (description) => {
  if (!description) return true;
  const trimmed = description.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH_FLOOR) return false;
  return true;
};

// Validate display order
const isValidDisplayOrder = (order) => {
  if (order === undefined || order === null) return true;
  if (!Number.isInteger(order)) return false;
  if (order < 0 || order > 9999) return false;
  return true;
};

// Validate isActive
const isValidBoolean = (value) => {
  if (value === undefined || value === null) return true;
  return typeof value === 'boolean';
};

// Sanitize floor for response
const sanitizeFloor = (floor) => {
  if (!floor) return null;
  return {
    _id: floor._id,
    id: floor._id,
    name: sanitizeInput(floor.name || ''),
    description: sanitizeInput(floor.description || ''),
    displayOrder: floor.displayOrder || 0,
    isActive: floor.isActive !== false,
    tableCount: floor.tableCount || 0,
    createdAt: floor.createdAt,
    updatedAt: floor.updatedAt,
  };
};

// ============================================================
//  FLOOR CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all floors
// @route   GET /api/floors
// @access  Public
// ──────────────────────────────────────────────────────────────────────────

export const getFloors = async (req, res) => {
  try {
    // ─── VALIDATE QUERY PARAMS ──────────────────────────────────────────
    const search = req.query.search || '';
    const isActive = req.query.isActive;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    // Search filter (sanitized)
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$text = { $search: sanitizedSearch };
    }

    // Active status filter
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // ─── FETCH FLOORS ────────────────────────────────────────────────────
    const [floors, total] = await Promise.all([
      Floor.find(filter)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Floor.countDocuments(filter),
    ]);

    // ─── GET TABLE COUNTS ──────────────────────────────────────────────
    const floorsWithCount = await Promise.all(
      floors.map(async (floor) => {
        const tableCount = await Table.countDocuments({ 
          floorId: floor._id.toString(), 
          isActive: true 
        });
        return { ...sanitizeFloor(floor), tableCount };
      })
    );

    return res.json({
      success: true,
      data: {
        floors: floorsWithCount,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: floors.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/floors] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch floors',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get floor by ID
// @route   GET /api/floors/:id
// @access  Public
// ──────────────────────────────────────────────────────────────────────────

export const getFloorById = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid floor ID format',
      });
    }

    // ─── FETCH FLOOR ────────────────────────────────────────────────────
    const floor = await Floor.findById(id).lean();
    if (!floor) {
      return res.status(404).json({
        success: false,
        error: 'Floor not found',
      });
    }

    // ─── FETCH TABLES ──────────────────────────────────────────────────
    const tables = await Table.find({ 
      floorId: floor._id.toString(), 
      isActive: true 
    }).sort({ number: 1 }).lean();

    // ─── SANITIZE TABLES ──────────────────────────────────────────────
    const sanitizedTables = tables.map(table => ({
      _id: table._id,
      number: table.number,
      name: sanitizeInput(table.name || ''),
      capacity: table.capacity,
      status: table.status,
      isActive: table.isActive,
    }));

    return res.json({
      success: true,
      data: {
        ...sanitizeFloor(floor),
        tables: sanitizedTables,
        tableCount: tables.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/floors/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch floor',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create floor
// @route   POST /api/floors
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const createFloor = async (req, res) => {
  try {
    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const { name, description, displayOrder, isActive } = req.body;

    // ─── VALIDATE NAME ──────────────────────────────────────────────────
    if (!name || !isValidFloorName(name)) {
      return res.status(400).json({
        success: false,
        error: `Floor name is required and must be between 1 and ${MAX_NAME_LENGTH_FLOOR} characters. Only letters, numbers, spaces, hyphens, underscores, dots, ampersands, parentheses, and quotes are allowed.`,
      });
    }

    // ─── VALIDATE DESCRIPTION ────────────────────────────────────────────
    if (description && !isValidDescription(description)) {
      return res.status(400).json({
        success: false,
        error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH_FLOOR} characters`,
      });
    }

    // ─── VALIDATE DISPLAY ORDER ─────────────────────────────────────────
    if (displayOrder !== undefined && !isValidDisplayOrder(displayOrder)) {
      return res.status(400).json({
        success: false,
        error: 'Display order must be a positive integer between 0 and 9999',
      });
    }

    // ─── VALIDATE IS ACTIVE ─────────────────────────────────────────────
    if (isActive !== undefined && !isValidBoolean(isActive)) {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean',
      });
    }

    // ─── CHECK DUPLICATE ─────────────────────────────────────────────────
    const sanitizedName = sanitizeInput(name.trim());
    const existing = await Floor.findOne({
      name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') }
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Floor '${sanitizedName}' already exists`,
      });
    }

    // ─── CREATE FLOOR ────────────────────────────────────────────────────
    const floorData = {
      name: sanitizedName,
      description: description ? sanitizeInput(description.trim()) : '',
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    };

    const floor = await Floor.create(floorData);

    return res.status(201).json({
      success: true,
      data: sanitizeFloor(floor),
      message: 'Floor created successfully',
    });
  } catch (err) {
    console.error('[POST /api/floors] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Floor with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create floor',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update floor
// @route   PATCH /api/floors/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const updateFloor = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid floor ID format',
      });
    }

    // ─── FIND EXISTING FLOOR ────────────────────────────────────────────
    const existingFloor = await Floor.findById(id);
    if (!existingFloor) {
      return res.status(404).json({
        success: false,
        error: 'Floor not found',
      });
    }

    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const { name, description, displayOrder, isActive } = req.body;
    const updateData = {};

    // ─── VALIDATE NAME ──────────────────────────────────────────────────
    if (name !== undefined) {
      if (!isValidFloorName(name)) {
        return res.status(400).json({
          success: false,
          error: `Floor name must be between 1 and ${MAX_NAME_LENGTH_FLOOR} characters. Only letters, numbers, spaces, hyphens, underscores, dots, ampersands, parentheses, and quotes are allowed.`,
        });
      }

      const sanitizedName = sanitizeInput(name.trim());
      
      // Check duplicate
      const conflict = await Floor.findOne({
        name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `Floor '${sanitizedName}' already exists`,
        });
      }
      
      updateData.name = sanitizedName;
    }

    // ─── VALIDATE DESCRIPTION ────────────────────────────────────────────
    if (description !== undefined) {
      if (!isValidDescription(description)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH_FLOOR} characters`,
        });
      }
      updateData.description = description ? sanitizeInput(description.trim()) : '';
    }

    // ─── VALIDATE DISPLAY ORDER ─────────────────────────────────────────
    if (displayOrder !== undefined) {
      if (!isValidDisplayOrder(displayOrder)) {
        return res.status(400).json({
          success: false,
          error: 'Display order must be a positive integer between 0 and 9999',
        });
      }
      updateData.displayOrder = displayOrder;
    }

    // ─── VALIDATE IS ACTIVE ─────────────────────────────────────────────
    if (isActive !== undefined) {
      if (!isValidBoolean(isActive)) {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
        });
      }
      updateData.isActive = isActive;
    }

    // ─── UPDATE FLOOR ────────────────────────────────────────────────────
    const updated = await Floor.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // ─── UPDATE TABLES FLOOR NAME ──────────────────────────────────────
    if (updateData.name) {
      await Table.updateMany(
        { floorId: id },
        { $set: { floorName: updateData.name } }
      );
    }

    return res.json({
      success: true,
      data: sanitizeFloor(updated),
      message: 'Floor updated successfully',
    });
  } catch (err) {
    console.error('[PATCH /api/floors/:id] ERROR:', err.message);
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Floor with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update floor',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete floor
// @route   DELETE /api/floors/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const deleteFloor = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid floor ID format',
      });
    }

    // ─── FIND FLOOR ─────────────────────────────────────────────────────
    const floor = await Floor.findById(id);
    if (!floor) {
      return res.status(404).json({
        success: false,
        error: 'Floor not found',
      });
    }

    // ─── CHECK IF FLOOR HAS TABLES ─────────────────────────────────────
    const tableCount = await Table.countDocuments({ floorId: id });
    if (tableCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete floor '${sanitizeInput(floor.name)}'. It has ${tableCount} table(s) assigned. Please delete or reassign the tables first.`,
      });
    }

    // ─── DELETE FLOOR ────────────────────────────────────────────────────
    await Floor.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Floor '${sanitizeInput(floor.name)}' deleted successfully`,
    });
  } catch (err) {
    console.error('[DELETE /api/floors/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete floor',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete floors
// @route   DELETE /api/floors/bulk
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteFloors = async (req, res) => {
  try {
    // ─── VALIDATE INPUT ──────────────────────────────────────────────────
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of floor IDs',
      });
    }
    
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 floors can be deleted at once',
      });
    }
    
    // ─── VALIDATE ALL IDs ──────────────────────────────────────────────
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ID format: ${invalidIds.join(', ')}`,
      });
    }
    
    // ─── CHECK IF FLOORS HAVE TABLES ──────────────────────────────────
    const floorsWithTables = await Table.aggregate([
      { $match: { floorId: { $in: ids } } },
      { $group: { _id: '$floorId', count: { $sum: 1 } } }
    ]);
    
    if (floorsWithTables.length > 0) {
      const floorIdsWithTables = floorsWithTables.map(f => f._id);
      const floorNames = await Floor.find({
        _id: { $in: floorIdsWithTables }
      }).select('name');
      
      return res.status(400).json({
        success: false,
        error: `Cannot delete floors that have tables. Floors with tables: ${floorNames.map(f => sanitizeInput(f.name)).join(', ')}`,
      });
    }
    
    // ─── DELETE FLOORS ──────────────────────────────────────────────────
    const result = await Floor.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No floors found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} floors deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    console.error('[DELETE /api/floors/bulk] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete floors',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Toggle floor status
// @route   PATCH /api/floors/:id/toggle-status
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const toggleFloorStatus = async (req, res) => {
  try {
    // ─── VALIDATE ID ────────────────────────────────────────────────────
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid floor ID format',
      });
    }

    // ─── FIND FLOOR ─────────────────────────────────────────────────────
    const floor = await Floor.findById(id);
    if (!floor) {
      return res.status(404).json({
        success: false,
        error: 'Floor not found',
      });
    }

    // ─── TOGGLE STATUS ──────────────────────────────────────────────────
    floor.isActive = !floor.isActive;
    await floor.save();

    // ─── UPDATE TABLES STATUS ──────────────────────────────────────────
    await Table.updateMany(
      { floorId: id },
      { $set: { isActive: floor.isActive } }
    );

    return res.json({
      success: true,
      data: sanitizeFloor(floor),
      message: `Floor ${floor.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    console.error('[PATCH /api/floors/:id/toggle-status] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle floor status',
    });
  }
};