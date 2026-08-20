// controllers/templateController.js - Template Management

import Template from '../models/Template.js';
import Dish from '../models/Dish.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';
import { 
  isValidObjectId, 
  isValidText,
  MAX_NAME_LENGTH,
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_TEMPLATE_NAME_LENGTH = 100;
const MAX_TEMPLATE_DESCRIPTION_LENGTH = 500;
const MAX_SECTIONS_PER_TEMPLATE = 20;
const MAX_DISHES_PER_SECTION = 100;
const ALLOWED_TEMPLATE_TYPES = ['daily', 'weekly', 'special', 'seasonal', 'custom'];
const ALLOWED_DISPLAY_LAYOUTS = ['grid', 'list', 'card', 'carousel'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ============================================================
//  VALIDATION HELPERS
// ============================================================

const isValidTemplateName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_TEMPLATE_NAME_LENGTH) return false;
  const nameRegex = /^[a-zA-Z0-9\s\-_.,&()'"]+$/;
  return nameRegex.test(trimmed);
};

const isValidTemplateType = (type) => {
  return ALLOWED_TEMPLATE_TYPES.includes(type);
};

const isValidDayOfWeek = (day) => {
  if (!day) return true;
  return DAYS_OF_WEEK.includes(day);
};

const isValidDisplayLayout = (layout) => {
  return ALLOWED_DISPLAY_LAYOUTS.includes(layout);
};

const sanitizeTemplate = (template) => {
  if (!template) return null;
  return {
    _id: template._id,
    id: template._id,
    restaurantId: template.restaurantId,
    restaurantName: sanitizeInput(template.restaurantName || ''),
    branchId: template.branchId,
    branchName: sanitizeInput(template.branchName || ''),
    name: sanitizeInput(template.name || ''),
    description: sanitizeInput(template.description || ''),
    templateType: template.templateType,
    dayOfWeek: template.dayOfWeek,
    sections: template.sections?.map(section => ({
      _id: section._id,
      name: sanitizeInput(section.name || ''),
      description: sanitizeInput(section.description || ''),
      displayOrder: section.displayOrder,
      dishIds: section.dishIds || [],
      isVisible: section.isVisible,
    })) || [],
    displayLayout: template.displayLayout,
    itemsPerRow: template.itemsPerRow,
    isActive: template.isActive,
    isDefault: template.isDefault,
    usageCount: template.usageCount,
    lastUsedAt: template.lastUsedAt,
    tags: template.tags || [],
    sectionCount: template.sectionCount,
    totalDishes: template.totalDishes,
    displayName: template.displayName,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
};

// ============================================================
//  TEMPLATE CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get all templates
// @route   GET /api/templates
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const getTemplates = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = req.query.search || '';
    const templateType = req.query.templateType || '';
    const isActive = req.query.isActive;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = {
      restaurantId: req.user?.restaurantId,
    };

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (templateType && isValidTemplateType(templateType)) {
      filter.templateType = templateType;
    }

    if (search && search.trim()) {
      const sanitizedSearch = sanitizeInput(search.trim());
      filter.$text = { $search: sanitizedSearch };
    }

    const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'usageCount'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [templates, total] = await Promise.all([
      Template.find(filter)
        .sort({ [finalSortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sections.dishIds', 'name image price')
        .lean(),
      Template.countDocuments(filter),
    ]);

    const sanitizedTemplates = templates.map(sanitizeTemplate);

    return res.json({
      success: true,
      data: {
        templates: sanitizedTemplates,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        count: templates.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/templates] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get template by ID
// @route   GET /api/templates/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format',
      });
    }

    const template = await Template.findById(id)
      .populate('sections.dishIds', 'name image price dietaryType')
      .lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (template.restaurantId.toString() !== req.user?.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this template',
      });
    }

    return res.json({
      success: true,
      data: sanitizeTemplate(template),
    });
  } catch (err) {
    console.error('[GET /api/templates/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Create template
// @route   POST /api/templates
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

// controllers/templateController.js - Fix createTemplate

// controllers/templateController.js - Fixed createTemplate

export const createTemplate = async (req, res) => {
  try {
    console.log('📝 Creating template...');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

    const body = sanitizeObject(req.body);

    // Validate required fields
    const required = ['name', 'templateType'];
    for (const field of required) {
      if (!body[field]) {
        return res.status(400).json({
          success: false,
          error: `${field} is required`,
        });
      }
    }

    // Validate name
    if (!isValidTemplateName(body.name)) {
      return res.status(400).json({
        success: false,
        error: `Template name must be between 1 and ${MAX_TEMPLATE_NAME_LENGTH} characters`,
      });
    }

    // Validate description
    if (body.description && !isValidText(body.description, MAX_TEMPLATE_DESCRIPTION_LENGTH)) {
      return res.status(400).json({
        success: false,
        error: `Description cannot exceed ${MAX_TEMPLATE_DESCRIPTION_LENGTH} characters`,
      });
    }

    // Validate template type
    if (!isValidTemplateType(body.templateType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid template type. Allowed: ${ALLOWED_TEMPLATE_TYPES.join(', ')}`,
      });
    }

    // ✅ Validate dayOfWeek ONLY for daily templates
    if (body.templateType === 'daily') {
      if (!body.dayOfWeek) {
        return res.status(400).json({
          success: false,
          error: 'Day of week is required for daily templates',
        });
      }
      if (!isValidDayOfWeek(body.dayOfWeek)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid day of week',
        });
      }
    }

    // Validate display layout
    if (body.displayLayout && !isValidDisplayLayout(body.displayLayout)) {
      return res.status(400).json({
        success: false,
        error: `Invalid display layout. Allowed: ${ALLOWED_DISPLAY_LAYOUTS.join(', ')}`,
      });
    }

    // Validate items per row
    if (body.itemsPerRow !== undefined) {
      if (!Number.isInteger(body.itemsPerRow) || body.itemsPerRow < 1 || body.itemsPerRow > 6) {
        return res.status(400).json({
          success: false,
          error: 'Items per row must be between 1 and 6',
        });
      }
    }

    // Validate sections
    if (body.sections && Array.isArray(body.sections)) {
      if (body.sections.length > MAX_SECTIONS_PER_TEMPLATE) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_SECTIONS_PER_TEMPLATE} sections allowed`,
        });
      }

      for (let i = 0; i < body.sections.length; i++) {
        const section = body.sections[i];

        if (!section.name || section.name.trim().length < 1) {
          return res.status(400).json({
            success: false,
            error: `Section ${i + 1}: Name is required`,
          });
        }

        if (section.dishIds && Array.isArray(section.dishIds)) {
          if (section.dishIds.length > MAX_DISHES_PER_SECTION) {
            return res.status(400).json({
              success: false,
              error: `Section ${i + 1}: Maximum ${MAX_DISHES_PER_SECTION} dishes allowed`,
            });
          }

          for (const dishId of section.dishIds) {
            if (!isValidObjectId(dishId)) {
              return res.status(400).json({
                success: false,
                error: `Section ${i + 1}: Invalid dish ID format`,
              });
            }
          }
        }
      }
    }

    // Check for duplicate template name
    const existingTemplate = await Template.findOne({
      name: { $regex: new RegExp(`^${sanitizeInput(body.name.trim())}$`, 'i') },
      restaurantId: req.user?.restaurantId,
    });

    if (existingTemplate) {
      return res.status(409).json({
        success: false,
        error: `Template '${body.name}' already exists`,
      });
    }

    // ✅ Build template data - ONLY include dayOfWeek if templateType is 'daily'
    const templateData = {
      restaurantId: req.user?.restaurantId,
      restaurantName: req.user?.restaurantName || '',
      branchId: body.branchId || req.user?.branchId || null,
      branchName: body.branchName || 'All Branches',
      name: sanitizeInput(body.name.trim()),
      description: body.description ? sanitizeInput(body.description.trim()) : '',
      templateType: body.templateType,
      displayLayout: body.displayLayout || 'grid',
      itemsPerRow: body.itemsPerRow || 3,
      isActive: body.isActive !== false,
      isDefault: body.isDefault || false,
      createdBy: req.user?._id,
      tags: body.tags || [],
      sections: (body.sections || []).map((section, index) => ({
        _id: new mongoose.Types.ObjectId(),
        name: sanitizeInput(section.name),
        description: sanitizeInput(section.description || ''),
        displayOrder: index,
        dishIds: section.dishIds || [],
        isVisible: section.isVisible !== false,
      })),
    };

    // ✅ Only add dayOfWeek if templateType is 'daily' AND dayOfWeek is provided
    if (body.templateType === 'daily' && body.dayOfWeek) {
      templateData.dayOfWeek = body.dayOfWeek;
    }

    console.log('📝 Final template data:', JSON.stringify(templateData, null, 2));

    const template = await Template.create(templateData);

    console.log('✅ Template created:', template._id);

    return res.status(201).json({
      success: true,
      data: sanitizeTemplate(template),
      message: 'Template created successfully',
    });
  } catch (err) {
    console.error('❌ [POST /api/templates] ERROR:', err.message);
    console.error('❌ Full error:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create template',
    });
  }
};
// ──────────────────────────────────────────────────────────────────────────
// @desc    Update template
// @route   PATCH /api/templates/:id
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

// controllers/templateController.js - Fix updateTemplate

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format',
      });
    }

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (template.restaurantId.toString() !== req.user?.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this template',
      });
    }

    const body = sanitizeObject(req.body);
    const updateData = {};

    // Validate and update name
    if (body.name !== undefined) {
      if (!isValidTemplateName(body.name)) {
        return res.status(400).json({
          success: false,
          error: `Template name must be between 1 and ${MAX_TEMPLATE_NAME_LENGTH} characters`,
        });
      }

      const conflict = await Template.findOne({
        name: { $regex: new RegExp(`^${sanitizeInput(body.name.trim())}$`, 'i') },
        _id: { $ne: id },
        restaurantId: req.user?.restaurantId,
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `Template '${body.name}' already exists`,
        });
      }

      updateData.name = sanitizeInput(body.name.trim());
    }

    // Validate and update description
    if (body.description !== undefined) {
      if (body.description && !isValidText(body.description, MAX_TEMPLATE_DESCRIPTION_LENGTH)) {
        return res.status(400).json({
          success: false,
          error: `Description cannot exceed ${MAX_TEMPLATE_DESCRIPTION_LENGTH} characters`,
        });
      }
      updateData.description = body.description ? sanitizeInput(body.description.trim()) : '';
    }

    // Validate and update template type
    if (body.templateType !== undefined) {
      if (!isValidTemplateType(body.templateType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid template type`,
        });
      }
      updateData.templateType = body.templateType;
    }

    // ✅ Fix: Only update dayOfWeek if templateType is 'daily'
    if (body.dayOfWeek !== undefined) {
      if (body.templateType === 'daily' || template.templateType === 'daily') {
        if (body.dayOfWeek && !isValidDayOfWeek(body.dayOfWeek)) {
          return res.status(400).json({
            success: false,
            error: `Invalid day of week`,
          });
        }
        updateData.dayOfWeek = body.dayOfWeek || null;
      } else {
        // If not daily template, set dayOfWeek to null
        updateData.dayOfWeek = null;
      }
    }

    // Validate and update display layout
    if (body.displayLayout !== undefined) {
      if (!isValidDisplayLayout(body.displayLayout)) {
        return res.status(400).json({
          success: false,
          error: `Invalid display layout`,
        });
      }
      updateData.displayLayout = body.displayLayout;
    }

    // Validate and update items per row
    if (body.itemsPerRow !== undefined) {
      if (!Number.isInteger(body.itemsPerRow) || body.itemsPerRow < 1 || body.itemsPerRow > 6) {
        return res.status(400).json({
          success: false,
          error: 'Items per row must be between 1 and 6',
        });
      }
      updateData.itemsPerRow = body.itemsPerRow;
    }

    // Validate and update sections
    if (body.sections !== undefined) {
      if (body.sections.length > MAX_SECTIONS_PER_TEMPLATE) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_SECTIONS_PER_TEMPLATE} sections allowed`,
        });
      }

      for (let i = 0; i < body.sections.length; i++) {
        const section = body.sections[i];

        if (!section.name || section.name.trim().length < 1) {
          return res.status(400).json({
            success: false,
            error: `Section ${i + 1}: Name is required`,
          });
        }

        if (section.dishIds && Array.isArray(section.dishIds)) {
          if (section.dishIds.length > MAX_DISHES_PER_SECTION) {
            return res.status(400).json({
              success: false,
              error: `Section ${i + 1}: Maximum ${MAX_DISHES_PER_SECTION} dishes allowed`,
            });
          }

          for (const dishId of section.dishIds) {
            if (!isValidObjectId(dishId)) {
              return res.status(400).json({
                success: false,
                error: `Section ${i + 1}: Invalid dish ID format`,
              });
            }
          }
        }
      }

      updateData.sections = body.sections.map((section, index) => ({
        _id: section._id || new mongoose.Types.ObjectId(),
        name: sanitizeInput(section.name),
        description: sanitizeInput(section.description || ''),
        displayOrder: index,
        dishIds: section.dishIds || [],
        isVisible: section.isVisible !== false,
      }));
    }

    // Update other fields
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (body.isDefault !== undefined) {
      updateData.isDefault = body.isDefault;
    }

    if (body.tags !== undefined && Array.isArray(body.tags)) {
      updateData.tags = body.tags;
    }

    updateData.updatedBy = req.user?._id;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    const updated = await Template.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('sections.dishIds', 'name image price');

    console.log('✅ Template updated:', updated._id);

    return res.json({
      success: true,
      data: sanitizeTemplate(updated),
      message: 'Template updated successfully',
    });
  } catch (err) {
    console.error('[PATCH /api/templates/:id] ERROR:', err.message);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update template',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Add section to template
// @route   POST /api/templates/:id/sections
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

export const addSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format',
      });
    }

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (template.restaurantId.toString() !== req.user?.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this template',
      });
    }

    if (template.sections.length >= MAX_SECTIONS_PER_TEMPLATE) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_SECTIONS_PER_TEMPLATE} sections allowed`,
      });
    }

    const body = sanitizeObject(req.body);

    if (!body.name || body.name.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Section name is required',
      });
    }

    const sectionId = template.addSection({
      name: sanitizeInput(body.name.trim()),
      description: body.description ? sanitizeInput(body.description.trim()) : '',
      dishIds: body.dishIds || [],
    });

    await template.save();

    console.log('✅ Section added:', sectionId);

    return res.status(201).json({
      success: true,
      data: {
        sectionId,
        section: template.sections.find(s => s._id.equals(sectionId)),
      },
      message: 'Section added successfully',
    });
  } catch (err) {
    console.error('[POST /api/templates/:id/sections] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to add section',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete section from template
// @route   DELETE /api/templates/:id/sections/:sectionId
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

export const removeSection = async (req, res) => {
  try {
    const { id, sectionId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(sectionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
      });
    }

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (template.restaurantId.toString() !== req.user?.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this template',
      });
    }

    template.removeSection(sectionId);
    await template.save();

    console.log('✅ Section removed:', sectionId);

    return res.json({
      success: true,
      message: 'Section removed successfully',
    });
  } catch (err) {
    console.error('[DELETE /api/templates/:id/sections/:sectionId] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove section',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Add dish to section
// @route   POST /api/templates/:id/sections/:sectionId/dishes/:dishId
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

export const addDishToSection = async (req, res) => {
  try {
    const { id, sectionId, dishId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(sectionId) || !isValidObjectId(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
      });
    }

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (template.restaurantId.toString() !== req.user?.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this template',
      });
    }

    const section = template.sections.find(s => s._id.equals(sectionId));
    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'Section not found',
      });
    }

    if (section.dishIds.length >= MAX_DISHES_PER_SECTION) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_DISHES_PER_SECTION} dishes per section allowed`,
      });
    }

    // Verify dish exists
    const dish = await Dish.findById(dishId).lean();
    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found',
      });
    }

    template.addDishToSection(sectionId, dishId);
    await template.save();

    console.log('✅ Dish added to section:', dishId);

    return res.status(201).json({
      success: true,
      message: 'Dish added to section successfully',
    });
  } catch (err) {
    console.error('[POST /api/templates/:id/sections/:sectionId/dishes/:dishId] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to add dish to section',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Remove dish from section
// @route   DELETE /api/templates/:id/sections/:sectionId/dishes/:dishId
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

export const removeDishFromSection = async (req, res) => {
  try {
    const { id, sectionId, dishId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(sectionId) || !isValidObjectId(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
      });
    }

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (template.restaurantId.toString() !== req.user?.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this template',
      });
    }

    template.removeDishFromSection(sectionId, dishId);
    await template.save();

    console.log('✅ Dish removed from section:', dishId);

    return res.json({
      success: true,
      message: 'Dish removed from section successfully',
    });
  } catch (err) {
    console.error('[DELETE /api/templates/:id/sections/:sectionId/dishes/:dishId] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove dish from section',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Delete template
// @route   DELETE /api/templates/:id
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format',
      });
    }

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (template.restaurantId.toString() !== req.user?.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this template',
      });
    }

    await Template.findByIdAndDelete(id);

    console.log('✅ Template deleted:', id);

    return res.json({
      success: true,
      message: `Template '${sanitizeInput(template.name)}' deleted successfully`,
    });
  } catch (err) {
    console.error('[DELETE /api/templates/:id] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete template',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Duplicate template
// @route   POST /api/templates/:id/duplicate
// @access  Private (Admin)
// ──────────────────────────────────────────────────────────────────────────

export const duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID format',
      });
    }

    const originalTemplate = await Template.findById(id).lean();
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (originalTemplate.restaurantId.toString() !== req.user?.restaurantId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to duplicate this template',
      });
    }

    const newTemplate = new Template({
      ...originalTemplate,
      _id: new mongoose.Types.ObjectId(),
      name: `${originalTemplate.name} (Copy)`,
      isDefault: false,
      usageCount: 0,
      lastUsedAt: null,
      createdBy: req.user?._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newTemplate.save();

    console.log('✅ Template duplicated:', newTemplate._id);

    return res.status(201).json({
      success: true,
      data: sanitizeTemplate(newTemplate),
      message: 'Template duplicated successfully',
    });
  } catch (err) {
    console.error('[POST /api/templates/:id/duplicate] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to duplicate template',
    });
  }
};