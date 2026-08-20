// controllers/roleController.js - Complete with permissions endpoint

import Role from '../models/Role.js';
import Staff from '../models/Staff.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { 
  isValidObjectId, 
  isValidName, 
  isValidText,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_ROLE_NAME_LENGTH = 50;
const MAX_ROLE_DESCRIPTION_LENGTH = 200;
const ALLOWED_ICONS = ['User', 'Users', 'Shield', 'Crown', 'Star', 'Heart', 'Zap', 'Sparkles', 'Award', 'Badge', 'CheckCircle', 'Lock', 'Key', 'Settings', 'Tool'];
const DEFAULT_ICON = 'User';
const DEFAULT_COLOR = '#6B7280';
const SYSTEM_ROLES = ['admin', 'superadmin'];

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Validate role name
const isValidRoleName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_ROLE_NAME_LENGTH) return false;
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  return nameRegex.test(trimmed);
};

// Validate role description
const isValidRoleDescription = (description) => {
  if (!description) return true;
  const trimmed = description.trim();
  if (trimmed.length > MAX_ROLE_DESCRIPTION_LENGTH) return false;
  const sanitized = trimmed.replace(/<[^>]*>/g, '');
  return sanitized === trimmed;
};

// Validate color (hex color code)
const isValidColor = (color) => {
  if (!color) return true;
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
};

// Validate icon name
const isValidIcon = (icon) => {
  if (!icon) return true;
  return ALLOWED_ICONS.includes(icon);
};

// Validate permissions
const isValidPermissions = (permissions) => {
  if (!Array.isArray(permissions)) return false;
  const validPermissions = Object.values(PERMISSIONS);
  return permissions.every(p => validPermissions.includes(p));
};

// Filter only valid permissions
const filterPermissions = (perms) => {
  if (!Array.isArray(perms)) return [];
  const validPermissions = Object.values(PERMISSIONS);
  return perms.filter(p => validPermissions.includes(p));
};

// Check if role is system protected
const isSystemRole = (role) => {
  if (!role) return false;
  const roleName = role.name?.toLowerCase() || role.toLowerCase();
  return SYSTEM_ROLES.includes(roleName);
};

// Sanitize role for response
const sanitizeRole = (role) => {
  if (!role) return null;
  return {
    _id: role._id,
    id: role._id,
    name: sanitizeInput(role.name || ''),
    description: sanitizeInput(role.description || ''),
    permissions: role.permissions || [],
    color: role.color || DEFAULT_COLOR,
    icon: role.icon || DEFAULT_ICON,
    isActive: role.isActive !== false,
    isSystem: role.isSystem || false,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
};

// ============================================================
//  ROLE CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const getRoles = async (req, res) => {
  try {
    const { isActive } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {};

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const [roles, total] = await Promise.all([
      Role.find(query)
        .sort({ isSystem: -1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Role.countDocuments(query),
    ]);

    const sanitizedRoles = roles.map(sanitizeRole);

    return res.json({
      success: true,
      data: {
        roles: sanitizedRoles,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: roles.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/roles] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch roles',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role ID format',
      });
    }

    const role = await Role.findById(id).lean();
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    return res.json({
      success: true,
      data: sanitizeRole(role),
    });
  } catch (error) {
    console.error('[GET /api/roles/:id] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch role',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get role permissions - ✅ NEW ENDPOINT
// @route   GET /api/roles/:id/permissions
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role ID format',
      });
    }

    // Find role
    const role = await Role.findById(id).lean();
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    // Get all available permissions
    const availablePermissions = Object.values(PERMISSIONS);

    // Return permissions
    return res.json({
      success: true,
      data: {
        roleId: role._id,
        roleName: sanitizeInput(role.name),
        permissions: role.permissions || [],
        availablePermissions: availablePermissions,
        count: role.permissions?.length || 0,
        totalAvailable: availablePermissions.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/roles/:id/permissions] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch role permissions',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create new role
// @route   POST /api/roles
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const createRole = async (req, res) => {
  try {
    const body = sanitizeObject(req.body);
    const { name, description, permissions, color, icon } = body;

    // Validate name
    if (!name || !isValidRoleName(name)) {
      return res.status(400).json({
        success: false,
        error: `Role name is required and must be between 1 and ${MAX_ROLE_NAME_LENGTH} characters. Only letters, numbers, spaces, hyphens, and underscores are allowed.`,
      });
    }

    // Validate description
    if (description && !isValidRoleDescription(description)) {
      return res.status(400).json({
        success: false,
        error: `Description cannot exceed ${MAX_ROLE_DESCRIPTION_LENGTH} characters and must not contain HTML tags`,
      });
    }

    // Validate permissions
    if (permissions && !isValidPermissions(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid permissions provided. Please check the permission list.',
      });
    }

    // Validate color
    if (color && !isValidColor(color)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid color format. Use hex color code (e.g., #FF0000 or #F00)',
      });
    }

    // Validate icon
    if (icon && !isValidIcon(icon)) {
      return res.status(400).json({
        success: false,
        error: `Invalid icon. Allowed icons: ${ALLOWED_ICONS.join(', ')}`,
      });
    }

    // Check existing role
    const sanitizedName = sanitizeInput(name.trim());
    const existing = await Role.findOne({
      name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Role '${sanitizedName}' already exists`,
      });
    }

    // Create role
    const filteredPerms = filterPermissions(permissions || []);

    const roleData = {
      name: sanitizedName,
      description: description ? sanitizeInput(description.trim()) : '',
      permissions: filteredPerms,
      color: color || DEFAULT_COLOR,
      icon: icon || DEFAULT_ICON,
      isActive: true,
      isSystem: false,
    };

    const role = await Role.create(roleData);

    return res.status(201).json({
      success: true,
      data: sanitizeRole(role),
      message: 'Role created successfully',
    });
  } catch (error) {
    console.error('[POST /api/roles] ERROR:', error.message);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Role with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create role',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update role
// @route   PATCH /api/roles/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role ID format',
      });
    }

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        error: `Cannot modify system role '${role.name}'. System roles are protected.`,
      });
    }

    const body = sanitizeObject(req.body);
    const { name, description, permissions, color, icon, isActive } = body;
    const updateData = {};

    // Validate name
    if (name !== undefined) {
      if (!isValidRoleName(name)) {
        return res.status(400).json({
          success: false,
          error: `Role name must be between 1 and ${MAX_ROLE_NAME_LENGTH} characters. Only letters, numbers, spaces, hyphens, and underscores are allowed.`,
        });
      }

      const sanitizedName = sanitizeInput(name.trim());
      
      const conflict = await Role.findOne({
        name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') },
        _id: { $ne: id }
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `Role '${sanitizedName}' already exists`,
        });
      }

      updateData.name = sanitizedName;
    }

    // Validate description
    if (description !== undefined) {
      if (!isValidRoleDescription(description)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_ROLE_DESCRIPTION_LENGTH} characters and must not contain HTML tags`,
        });
      }
      updateData.description = description ? sanitizeInput(description.trim()) : '';
    }

    // Validate permissions
    if (permissions !== undefined) {
      if (!isValidPermissions(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid permissions provided. Please check the permission list.',
        });
      }
      updateData.permissions = filterPermissions(permissions);
    }

    // Validate color
    if (color !== undefined) {
      if (!isValidColor(color)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid color format. Use hex color code (e.g., #FF0000 or #F00)',
        });
      }
      updateData.color = color;
    }

    // Validate icon
    if (icon !== undefined) {
      if (!isValidIcon(icon)) {
        return res.status(400).json({
          success: false,
          error: `Invalid icon. Allowed icons: ${ALLOWED_ICONS.join(', ')}`,
        });
      }
      updateData.icon = icon;
    }

    // Validate isActive
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
        });
      }
      updateData.isActive = isActive;
    }

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    return res.json({
      success: true,
      data: sanitizeRole(updatedRole),
      message: 'Role updated successfully',
    });
  } catch (error) {
    console.error('[PATCH /api/roles/:id] ERROR:', error.message);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Role with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update role',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {  
      return res.status(400).json({
        success: false,
        error: 'Invalid role ID format',
      });
    }

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        error: `Cannot delete system role '${role.name}'. System roles are protected.`,
      });
    }

    const staffWithRole = await Staff.findOne({ role: role.name });
    if (staffWithRole) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete role "${role.name}" because it is assigned to staff member(s). Please reassign them first.`,
      });
    }

    await Role.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Role '${sanitizeInput(role.name)}' deleted successfully`,
    });
  } catch (error) {
    console.error('[DELETE /api/roles/:id] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete role',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Bulk delete roles
// @route   DELETE /api/roles/bulk
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const bulkDeleteRoles = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of role IDs',
      });
    }
    
    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 roles can be deleted at once',
      });
    }
    
    const invalidIds = ids.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid ID format: ${invalidIds.join(', ')}`,
      });
    }
    
    const systemRoles = await Role.find({
      _id: { $in: ids },
      isSystem: true,
    }).select('name');
    
    if (systemRoles.length > 0) {
      return res.status(403).json({
        success: false,
        error: `Cannot delete system roles: ${systemRoles.map(r => r.name).join(', ')}`,
      });
    }
    
    const roleNames = await Role.find({
      _id: { $in: ids },
    }).select('name');
    
    const assignedRoles = await Staff.find({
      role: { $in: roleNames.map(r => r.name) },
    }).select('role');
    
    if (assignedRoles.length > 0) {
      const assignedRoleNames = [...new Set(assignedRoles.map(s => s.role))];
      return res.status(400).json({
        success: false,
        error: `Cannot delete roles that are assigned to staff: ${assignedRoleNames.join(', ')}`,
      });
    }
    
    const result = await Role.deleteMany({ _id: { $in: ids } });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No roles found to delete',
      });
    }
    
    return res.json({
      success: true,
      message: `${result.deletedCount} roles deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error('[DELETE /api/roles/bulk] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete roles',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Toggle role status
// @route   PATCH /api/roles/:id/toggle-status
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const toggleRoleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role ID format',
      });
    }

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        error: `Cannot modify system role '${role.name}'. System roles are protected.`,
      });
    }

    role.isActive = !role.isActive;
    await role.save();

    return res.json({
      success: true,
      data: sanitizeRole(role),
      message: `Role ${role.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('[PATCH /api/roles/:id/toggle-status] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle role status',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update role permissions - ✅ NEW ENDPOINT
// @route   PUT /api/roles/:id/permissions
// @access  Private (Admin/Manager)
// ──────────────────────────────────────────────────────────────────────────

export const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role ID format',
      });
    }

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        error: `Cannot modify permissions of system role '${role.name}'. System roles are protected.`,
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be an array',
      });
    }

    // Validate permissions
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
      });
    }

    // Update permissions
    role.permissions = permissions;
    await role.save();

    return res.json({
      success: true,
      data: sanitizeRole(role),
      message: 'Role permissions updated successfully',
    });
  } catch (error) {
    console.error('[PUT /api/roles/:id/permissions] ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update role permissions',
    });
  }
};