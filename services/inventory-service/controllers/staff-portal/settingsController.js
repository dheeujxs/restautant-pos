// controllers/staff/staffSettingsController.js

import StaffSettings from '../../models/StaffSettings.js';
import Staff from '../../models/Staff.js';
import { isValidObjectId } from '../../utils/validators.js';
import { sanitizeInput } from '../../utils/sanitize.js';
import toast from 'react-hot-toast';

// ─── Default Settings ──────────────────────────────────────────────────────
const DEFAULT_STAFF_SETTINGS = {
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

// ─── Allowed Values ────────────────────────────────────────────────────────
const ALLOWED_THEMES = ['light', 'dark', 'system'];
const ALLOWED_LANGUAGES = ['en', 'hi', 'ta', 'te', 'bn'];
const ALLOWED_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
];
const ALLOWED_DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', 'DD MMM YYYY'];
const ALLOWED_TIME_FORMATS = ['12h', '24h'];
const ALLOWED_REFRESH_INTERVALS = [5, 10, 15, 30, 60];

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Get staff settings
// @route   GET /api/staff-portal/settings
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

export const getStaffSettings = async (req, res) => {
  try {
    const staff = req.staff;
    
    if (!staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff authentication required',
      });
    }

    const staffId = staff._id.toString();

    // Find settings for this staff member
    let settings = await StaffSettings.findOne({ staffId });

    // If no settings exist, create default ones
    if (!settings) {
      settings = await StaffSettings.create({
        staffId,
        restaurantId: staff.restaurantId,
        branchId: staff.branchId,
        ...DEFAULT_STAFF_SETTINGS,
      });
      console.log(`✅ Created default settings for staff ${staff.name}`);
    }

    console.log(`📊 Retrieved settings for ${staff.name}`);

    res.status(200).json({
      success: true,
      data: {
        theme: settings.theme,
        notifications: settings.notifications,
        soundEnabled: settings.soundEnabled,
        language: settings.language,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        compactView: settings.compactView,
        autoRefresh: settings.autoRefresh,
        refreshInterval: settings.refreshInterval,
      },
      message: 'Settings retrieved successfully',
    });
  } catch (error) {
    console.error('❌ Error fetching staff settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings: ' + error.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Update staff settings
// @route   PUT /api/staff-portal/settings
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

export const updateStaffSettings = async (req, res) => {
  try {
    const staff = req.staff;
    
    if (!staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff authentication required',
      });
    }

    const staffId = staff._id.toString();
    const {
      theme,
      notifications,
      soundEnabled,
      language,
      timezone,
      dateFormat,
      timeFormat,
      compactView,
      autoRefresh,
      refreshInterval,
    } = req.body;

    // ─── Validate inputs ───────────────────────────────────────────────
    const updateData = {};

    if (theme !== undefined) {
      if (!ALLOWED_THEMES.includes(theme)) {
        return res.status(400).json({
          success: false,
          error: `Invalid theme. Allowed: ${ALLOWED_THEMES.join(', ')}`,
        });
      }
      updateData.theme = theme;
    }

    if (notifications !== undefined) {
      if (typeof notifications !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Notifications must be a boolean',
        });
      }
      updateData.notifications = notifications;
    }

    if (soundEnabled !== undefined) {
      if (typeof soundEnabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Sound enabled must be a boolean',
        });
      }
      updateData.soundEnabled = soundEnabled;
    }

    if (language !== undefined) {
      if (!ALLOWED_LANGUAGES.includes(language)) {
        return res.status(400).json({
          success: false,
          error: `Invalid language. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`,
        });
      }
      updateData.language = language;
    }

    if (timezone !== undefined) {
      if (!ALLOWED_TIMEZONES.includes(timezone)) {
        return res.status(400).json({
          success: false,
          error: `Invalid timezone. Allowed: ${ALLOWED_TIMEZONES.join(', ')}`,
        });
      }
      updateData.timezone = timezone;
    }

    if (dateFormat !== undefined) {
      if (!ALLOWED_DATE_FORMATS.includes(dateFormat)) {
        return res.status(400).json({
          success: false,
          error: `Invalid date format. Allowed: ${ALLOWED_DATE_FORMATS.join(', ')}`,
        });
      }
      updateData.dateFormat = dateFormat;
    }

    if (timeFormat !== undefined) {
      if (!ALLOWED_TIME_FORMATS.includes(timeFormat)) {
        return res.status(400).json({
          success: false,
          error: `Invalid time format. Allowed: ${ALLOWED_TIME_FORMATS.join(', ')}`,
        });
      }
      updateData.timeFormat = timeFormat;
    }

    if (compactView !== undefined) {
      if (typeof compactView !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Compact view must be a boolean',
        });
      }
      updateData.compactView = compactView;
    }

    if (autoRefresh !== undefined) {
      if (typeof autoRefresh !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Auto refresh must be a boolean',
        });
      }
      updateData.autoRefresh = autoRefresh;
    }

    if (refreshInterval !== undefined) {
      if (!ALLOWED_REFRESH_INTERVALS.includes(refreshInterval)) {
        return res.status(400).json({
          success: false,
          error: `Invalid refresh interval. Allowed: ${ALLOWED_REFRESH_INTERVALS.join(', ')}`,
        });
      }
      updateData.refreshInterval = refreshInterval;
    }

    updateData.updatedAt = new Date();

    // ─── Find or create settings ──────────────────────────────────────
    let settings = await StaffSettings.findOne({ staffId });

    if (!settings) {
      settings = await StaffSettings.create({
        staffId,
        restaurantId: staff.restaurantId,
        branchId: staff.branchId,
        ...DEFAULT_STAFF_SETTINGS,
        ...updateData,
      });
    } else {
      Object.assign(settings, updateData);
      await settings.save();
    }

    console.log(`✅ Settings updated for staff ${staff.name}`);

    res.status(200).json({
      success: true,
      data: {
        theme: settings.theme,
        notifications: settings.notifications,
        soundEnabled: settings.soundEnabled,
        language: settings.language,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        compactView: settings.compactView,
        autoRefresh: settings.autoRefresh,
        refreshInterval: settings.refreshInterval,
      },
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating staff settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings: ' + error.message,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// ✅ @desc    Reset staff settings to defaults
// @route   POST /api/staff-portal/settings/reset
// @access  Staff
// ──────────────────────────────────────────────────────────────────────────

export const resetStaffSettings = async (req, res) => {
  try {
    const staff = req.staff;
    
    if (!staff) {
      return res.status(401).json({
        success: false,
        error: 'Staff authentication required',
      });
    }

    const staffId = staff._id.toString();

    // ─── Find and reset settings ───────────────────────────────────────
    let settings = await StaffSettings.findOne({ staffId });

    if (!settings) {
      settings = await StaffSettings.create({
        staffId,
        restaurantId: staff.restaurantId,
        branchId: staff.branchId,
        ...DEFAULT_STAFF_SETTINGS,
      });
    } else {
      Object.assign(settings, DEFAULT_STAFF_SETTINGS, {
        updatedAt: new Date(),
      });
      await settings.save();
    }

    console.log(`♻️ Settings reset to defaults for staff ${staff.name}`);

    res.status(200).json({
      success: true,
      data: {
        theme: settings.theme,
        notifications: settings.notifications,
        soundEnabled: settings.soundEnabled,
        language: settings.language,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        compactView: settings.compactView,
        autoRefresh: settings.autoRefresh,
        refreshInterval: settings.refreshInterval,
      },
      message: 'Settings reset to defaults successfully',
    });
  } catch (error) {
    console.error('❌ Error resetting staff settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset settings: ' + error.message,
    });
  }
};