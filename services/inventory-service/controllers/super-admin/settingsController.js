// controllers/super-admin/settingsController.js - FIXED

import Settings from '../../models/super-admin/superAdminSettings.js';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize.js';
import {
  isValidObjectId,
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidText,
} from '../../utils/validators.js';
import rateLimit from 'express-rate-limit';
import { check, validationResult } from 'express-validator';

// ============================================================
//  ─── CONSTANTS & CONFIGURATION ──────────────────────────────
// ============================================================

const MAX_SITE_NAME_LENGTH = 100;
const MAX_MAINTENANCE_MESSAGE_LENGTH = 500;
const MAX_GA_TRACKING_ID_LENGTH = 50;
const MAX_LOG_LEVEL_LENGTH = 10;
const MAX_CURRENCY_LENGTH = 10;
const MAX_TIMEZONE_LENGTH = 50;

const VALID_THEMES = ['light', 'dark', 'system'];
const VALID_DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const VALID_LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'trace'];
const VALID_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'SGD', 'MYR'];

const SESSION_TIMEOUT_MIN = 5;
const SESSION_TIMEOUT_MAX = 480;
const MAX_LOGIN_ATTEMPTS_MIN = 3;
const MAX_LOGIN_ATTEMPTS_MAX = 10;
const PASSWORD_EXPIRY_MIN = 30;
const PASSWORD_EXPIRY_MAX = 365;

// ─── Audit Log Helper ──────────────────────────────────────────

const logAudit = async (adminId, action, details) => {
  try {
    let AuditLog;
    try {
      AuditLog = (await import('../../models/AuditLog.js')).default;
    } catch (importError) {
      console.log('⚠️ AuditLog model not found, skipping audit log');
      return;
    }
    
    await AuditLog.create({
      adminId,
      action,
      details,
      ipAddress: details?.ipAddress || 'unknown',
      userAgent: details?.userAgent || 'unknown',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('❌ Audit Log Error:', error);
  }
};

// ─── Validation Functions ─────────────────────────────────────

const isValidTheme = (theme) => VALID_THEMES.includes(theme);
const isValidDateFormat = (format) => VALID_DATE_FORMATS.includes(format);
const isValidLogLevel = (level) => VALID_LOG_LEVELS.includes(level);
const isValidCurrency = (currency) => VALID_CURRENCIES.includes(currency);

const isValidHexColor = (color) => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const isValidSessionTimeout = (timeout) => {
  if (!timeout) return false;
  const num = parseInt(timeout);
  return !isNaN(num) && num >= SESSION_TIMEOUT_MIN && num <= SESSION_TIMEOUT_MAX;
};

const isValidMaxLoginAttempts = (attempts) => {
  if (!attempts) return false;
  const num = parseInt(attempts);
  return !isNaN(num) && num >= MAX_LOGIN_ATTEMPTS_MIN && num <= MAX_LOGIN_ATTEMPTS_MAX;
};

const isValidPasswordExpiry = (expiry) => {
  if (!expiry) return false;
  const num = parseInt(expiry);
  return !isNaN(num) && num >= PASSWORD_EXPIRY_MIN && num <= PASSWORD_EXPIRY_MAX;
};

const isValidGoogleAnalyticsId = (id) => {
  if (!id) return true;
  return /^(UA-\d{4,}-\d{1,2}|G-[A-Z0-9]+)$/.test(id);
};

// ─── Rate Limiting ─────────────────────────────────────────────

export const settingsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Too many settings requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Input Sanitization Middleware ────────────────────────────

export const sanitizeSettingsInput = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
      
      const escapeHtml = (str) => {
        if (!str || typeof str !== 'string') return str;
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      };

      if (req.body.general?.siteName) {
        req.body.general.siteName = escapeHtml(req.body.general.siteName);
      }
      if (req.body.system?.maintenanceMessage) {
        req.body.system.maintenanceMessage = escapeHtml(req.body.system.maintenanceMessage);
      }
    }
    next();
  } catch (error) {
    console.error('❌ Sanitization Error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected',
    });
  }
};

// ─── Validation Rules ──────────────────────────────────────────

export const validateSettingsUpdate = [
  check('general.siteName')
    .optional()
    .isLength({ max: MAX_SITE_NAME_LENGTH })
    .withMessage(`Site name must be less than ${MAX_SITE_NAME_LENGTH} characters`)
    .trim()
    .escape(),
  
  check('general.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string')
    .trim(),
  
  check('general.currency')
    .optional()
    .isIn(VALID_CURRENCIES)
    .withMessage(`Currency must be one of: ${VALID_CURRENCIES.join(', ')}`),
  
  check('general.dateFormat')
    .optional()
    .isIn(VALID_DATE_FORMATS)
    .withMessage(`Date format must be one of: ${VALID_DATE_FORMATS.join(', ')}`),

  check('appearance.theme')
    .optional()
    .isIn(VALID_THEMES)
    .withMessage(`Theme must be one of: ${VALID_THEMES.join(', ')}`),
  
  check('appearance.primaryColor')
    .optional()
    .custom(isValidHexColor)
    .withMessage('Primary color must be a valid hex color code'),

  check('security.sessionTimeout')
    .optional()
    .custom(isValidSessionTimeout)
    .withMessage(`Session timeout must be between ${SESSION_TIMEOUT_MIN} and ${SESSION_TIMEOUT_MAX} minutes`),
  
  check('security.maxLoginAttempts')
    .optional()
    .custom(isValidMaxLoginAttempts)
    .withMessage(`Max login attempts must be between ${MAX_LOGIN_ATTEMPTS_MIN} and ${MAX_LOGIN_ATTEMPTS_MAX}`),
  
  check('security.passwordExpiry')
    .optional()
    .custom(isValidPasswordExpiry)
    .withMessage(`Password expiry must be between ${PASSWORD_EXPIRY_MIN} and ${PASSWORD_EXPIRY_MAX} days`),

  check('integrations.googleAnalytics')
    .optional()
    .custom(isValidGoogleAnalyticsId)
    .withMessage('Invalid Google Analytics tracking ID format'),

  check('system.logLevel')
    .optional()
    .isIn(VALID_LOG_LEVELS)
    .withMessage(`Log level must be one of: ${VALID_LOG_LEVELS.join(', ')}`),

  check('system.maintenanceMessage')
    .optional()
    .isLength({ max: MAX_MAINTENANCE_MESSAGE_LENGTH })
    .withMessage(`Maintenance message must be less than ${MAX_MAINTENANCE_MESSAGE_LENGTH} characters`)
    .trim()
    .escape(),
];

// ============================================================
//  ─── GET SETTINGS ────────────────────────────────────────────
// ============================================================

export const getSettings = async (req, res) => {
  try {
    // ✅ FIXED: Check for both admin and super_admin roles
    const userId = req.admin?._id || req.user?._id;
    const userRole = req.admin?.role || req.user?.role;
    const isSuperAdmin = userRole === 'super_admin' || userRole === 'superadmin' || req.admin?.isSuperAdmin === true;
    const isAdmin = userRole === 'admin' || userRole === 'Admin';

    if (!userId) {
      console.log('❌ No user ID found in request');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized access',
      });
    }

    // ✅ Allow both Super Admin and Admin to view settings
    if (!isSuperAdmin && !isAdmin) {
      console.log(`❌ User ${userId} with role ${userRole} attempted to view settings`);
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions to view settings',
      });
    }

    console.log(`✅ User ${userId} (${userRole}) viewing settings`);

    const settings = await Settings.getSettings();
    
    // Sanitize response
    const sanitizedSettings = {
      ...settings.toObject(),
      __v: undefined,
      system: {
        maintenanceMode: settings.system.maintenanceMode,
        maintenanceMessage: settings.system.maintenanceMessage,
        ...(isSuperAdmin && {
          debugMode: settings.system.debugMode,
          logLevel: settings.system.logLevel,
        }),
      },
    };

    // Log access
    try {
      await logAudit(
        userId,
        'VIEW_SETTINGS',
        { 
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date(),
        }
      );
    } catch (logError) {
      console.warn('⚠️ Audit log failed (non-critical):', logError.message);
    }

    res.status(200).json({
      success: true,
      data: sanitizedSettings,
    });
  } catch (error) {
    console.error('❌ Get Settings Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
    });
  }
};

// ============================================================
//  ─── UPDATE SETTINGS ─────────────────────────────────────────
// ============================================================

export const updateSettings = async (req, res) => {
  try {
    // ─── SECURITY CHECKS ──────────────────────────────────────────────
    
    const adminId = req.admin?._id || req.user?._id;
    const userRole = req.admin?.role || req.user?.role;
    const isSuperAdmin = userRole === 'super_admin' || userRole === 'superadmin' || req.admin?.isSuperAdmin === true;
    const isAdmin = userRole === 'admin' || userRole === 'Admin';

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required',
      });
    }

    // ✅ Allow both Super Admin and Admin to update settings
    if (!isSuperAdmin && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions to update settings',
      });
    }

    console.log(`✅ User ${adminId} (${userRole}) updating settings`);

    // Input validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => err.msg),
      });
    }

    // ─── GET OR CREATE SETTINGS ──────────────────────────────────────
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        updatedBy: adminId,
        updatedAt: new Date(),
      });
    }

    const body = sanitizeObject(req.body);
    const changes = [];
    const oldValues = {};

    // ─── UPDATE GENERAL SETTINGS ──────────────────────────────────────
    if (body.general) {
      const { siteName, siteLogo, timezone, currency, dateFormat } = body.general;
      
      if (siteName !== undefined) {
        const sanitized = sanitizeInput(siteName.trim());
        if (sanitized && sanitized.length > 0 && sanitized.length <= MAX_SITE_NAME_LENGTH) {
          const escaped = sanitized.replace(/[<>]/g, '');
          if (escaped !== settings.general.siteName) {
            oldValues['general.siteName'] = settings.general.siteName;
            settings.general.siteName = escaped;
            changes.push(`Site name changed from "${oldValues['general.siteName']}" to "${escaped}"`);
          }
        }
      }
      
      if (siteLogo !== undefined) {
        const logoUrl = siteLogo?.trim() || '';
        if (logoUrl && !isValidUrl(logoUrl)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid logo URL format',
          });
        }
        if (settings.general.siteLogo !== logoUrl) {
          oldValues['general.siteLogo'] = settings.general.siteLogo;
          settings.general.siteLogo = logoUrl;
          changes.push(`Site logo updated`);
        }
      }
      
      if (timezone !== undefined) {
        const sanitized = sanitizeInput(timezone.trim());
        if (sanitized && sanitized.length <= MAX_TIMEZONE_LENGTH) {
          if (settings.general.timezone !== sanitized) {
            oldValues['general.timezone'] = settings.general.timezone;
            settings.general.timezone = sanitized;
            changes.push(`Timezone changed from "${oldValues['general.timezone']}" to "${sanitized}"`);
          }
        }
      }
      
      if (currency !== undefined) {
        const sanitized = sanitizeInput(currency.trim()).toUpperCase();
        if (isValidCurrency(sanitized)) {
          if (settings.general.currency !== sanitized) {
            oldValues['general.currency'] = settings.general.currency;
            settings.general.currency = sanitized;
            changes.push(`Currency changed from "${oldValues['general.currency']}" to "${sanitized}"`);
          }
        }
      }
      
      if (dateFormat !== undefined) {
        if (isValidDateFormat(dateFormat)) {
          if (settings.general.dateFormat !== dateFormat) {
            oldValues['general.dateFormat'] = settings.general.dateFormat;
            settings.general.dateFormat = dateFormat;
            changes.push(`Date format changed from "${oldValues['general.dateFormat']}" to "${dateFormat}"`);
          }
        }
      }
    }

    // ─── UPDATE SECURITY SETTINGS ──────────────────────────────────────
    if (body.security) {
      const { twoFactorAuth, sessionTimeout, maxLoginAttempts, passwordExpiry } = body.security;
      
      if (twoFactorAuth !== undefined) {
        const boolVal = Boolean(twoFactorAuth);
        if (settings.security.twoFactorAuth !== boolVal) {
          oldValues['security.twoFactorAuth'] = settings.security.twoFactorAuth;
          settings.security.twoFactorAuth = boolVal;
          changes.push(`2FA ${boolVal ? 'enabled' : 'disabled'}`);
        }
      }
      
      if (sessionTimeout !== undefined) {
        const timeout = parseInt(sessionTimeout);
        if (!isNaN(timeout) && timeout >= SESSION_TIMEOUT_MIN && timeout <= SESSION_TIMEOUT_MAX) {
          if (settings.security.sessionTimeout !== timeout) {
            oldValues['security.sessionTimeout'] = settings.security.sessionTimeout;
            settings.security.sessionTimeout = timeout;
            changes.push(`Session timeout changed from ${oldValues['security.sessionTimeout']} to ${timeout} minutes`);
          }
        }
      }
      
      if (maxLoginAttempts !== undefined) {
        const attempts = parseInt(maxLoginAttempts);
        if (!isNaN(attempts) && attempts >= MAX_LOGIN_ATTEMPTS_MIN && attempts <= MAX_LOGIN_ATTEMPTS_MAX) {
          if (settings.security.maxLoginAttempts !== attempts) {
            oldValues['security.maxLoginAttempts'] = settings.security.maxLoginAttempts;
            settings.security.maxLoginAttempts = attempts;
            changes.push(`Max login attempts changed from ${oldValues['security.maxLoginAttempts']} to ${attempts}`);
          }
        }
      }
      
      if (passwordExpiry !== undefined) {
        const expiry = parseInt(passwordExpiry);
        if (!isNaN(expiry) && expiry >= PASSWORD_EXPIRY_MIN && expiry <= PASSWORD_EXPIRY_MAX) {
          if (settings.security.passwordExpiry !== expiry) {
            oldValues['security.passwordExpiry'] = settings.security.passwordExpiry;
            settings.security.passwordExpiry = expiry;
            changes.push(`Password expiry changed from ${oldValues['security.passwordExpiry']} to ${expiry} days`);
          }
        }
      }
    }

    // ─── UPDATE NOTIFICATION SETTINGS ──────────────────────────────────
    if (body.notifications) {
      const notificationFields = [
        'emailNotifications',
        'pushNotifications', 
        'orderUpdates',
        'paymentAlerts',
        'securityAlerts',
        'marketingEmails'
      ];
      
      for (const field of notificationFields) {
        if (body.notifications[field] !== undefined) {
          const boolVal = Boolean(body.notifications[field]);
          const oldVal = settings.notifications[field];
          if (oldVal !== boolVal) {
            oldValues[`notifications.${field}`] = oldVal;
            settings.notifications[field] = boolVal;
            changes.push(`Notification ${field} changed from ${oldVal} to ${boolVal}`);
          }
        }
      }
    }

    // ─── UPDATE APPEARANCE SETTINGS ────────────────────────────────────
    if (body.appearance) {
      const { theme, primaryColor, sidebarCollapsed, compactView } = body.appearance;
      
      if (theme !== undefined && isValidTheme(theme)) {
        if (settings.appearance.theme !== theme) {
          oldValues['appearance.theme'] = settings.appearance.theme;
          settings.appearance.theme = theme;
          changes.push(`Theme changed from "${oldValues['appearance.theme']}" to "${theme}"`);
        }
      }
      
      if (primaryColor !== undefined) {
        const sanitized = sanitizeInput(primaryColor.trim());
        if (isValidHexColor(sanitized)) {
          if (settings.appearance.primaryColor !== sanitized) {
            oldValues['appearance.primaryColor'] = settings.appearance.primaryColor;
            settings.appearance.primaryColor = sanitized;
            changes.push(`Primary color changed from "${oldValues['appearance.primaryColor']}" to "${sanitized}"`);
          }
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid primary color format. Use hex color code (e.g., #8b5cf6)',
          });
        }
      }
      
      if (sidebarCollapsed !== undefined) {
        const boolVal = Boolean(sidebarCollapsed);
        if (settings.appearance.sidebarCollapsed !== boolVal) {
          oldValues['appearance.sidebarCollapsed'] = settings.appearance.sidebarCollapsed;
          settings.appearance.sidebarCollapsed = boolVal;
          changes.push(`Sidebar ${boolVal ? 'collapsed' : 'expanded'}`);
        }
      }
      
      if (compactView !== undefined) {
        const boolVal = Boolean(compactView);
        if (settings.appearance.compactView !== boolVal) {
          oldValues['appearance.compactView'] = settings.appearance.compactView;
          settings.appearance.compactView = boolVal;
          changes.push(`Compact view ${boolVal ? 'enabled' : 'disabled'}`);
        }
      }
    }

    // ─── UPDATE INTEGRATION SETTINGS ────────────────────────────────────
    if (body.integrations) {
      const { stripeEnabled, razorpayEnabled, googleAnalytics, sentryEnabled } = body.integrations;
      
      if (stripeEnabled !== undefined) {
        const boolVal = Boolean(stripeEnabled);
        if (settings.integrations.stripeEnabled !== boolVal) {
          oldValues['integrations.stripeEnabled'] = settings.integrations.stripeEnabled;
          settings.integrations.stripeEnabled = boolVal;
          changes.push(`Stripe ${boolVal ? 'enabled' : 'disabled'}`);
        }
      }
      
      if (razorpayEnabled !== undefined) {
        const boolVal = Boolean(razorpayEnabled);
        if (settings.integrations.razorpayEnabled !== boolVal) {
          oldValues['integrations.razorpayEnabled'] = settings.integrations.razorpayEnabled;
          settings.integrations.razorpayEnabled = boolVal;
          changes.push(`Razorpay ${boolVal ? 'enabled' : 'disabled'}`);
        }
      }
      
      if (googleAnalytics !== undefined) {
        const sanitized = sanitizeInput(googleAnalytics.trim());
        if (!sanitized || isValidGoogleAnalyticsId(sanitized)) {
          if (settings.integrations.googleAnalytics !== sanitized) {
            oldValues['integrations.googleAnalytics'] = settings.integrations.googleAnalytics;
            settings.integrations.googleAnalytics = sanitized || '';
            if (sanitized) {
              changes.push(`Google Analytics ID updated`);
            } else {
              changes.push(`Google Analytics tracking disabled`);
            }
          }
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid Google Analytics tracking ID format. Use UA-XXXXX-X or G-XXXXXXX',
          });
        }
      }
      
      if (sentryEnabled !== undefined) {
        const boolVal = Boolean(sentryEnabled);
        if (settings.integrations.sentryEnabled !== boolVal) {
          oldValues['integrations.sentryEnabled'] = settings.integrations.sentryEnabled;
          settings.integrations.sentryEnabled = boolVal;
          changes.push(`Sentry ${boolVal ? 'enabled' : 'disabled'}`);
        }
      }
    }

    // ─── UPDATE SYSTEM SETTINGS ─────────────────────────────────────────
    // ✅ Only Super Admin can update system settings
    if (body.system && isSuperAdmin) {
      const { maintenanceMode, maintenanceMessage, debugMode, logLevel } = body.system;
      
      if (maintenanceMode !== undefined) {
        const boolVal = Boolean(maintenanceMode);
        if (settings.system.maintenanceMode !== boolVal) {
          oldValues['system.maintenanceMode'] = settings.system.maintenanceMode;
          settings.system.maintenanceMode = boolVal;
          changes.push(`Maintenance mode ${boolVal ? 'enabled' : 'disabled'}`);
          
          try {
            await logAudit(adminId, 'MAINTENANCE_MODE_CHANGE', {
              action: boolVal ? 'enabled' : 'disabled',
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            });
          } catch (logError) {
            console.warn('⚠️ Audit log failed:', logError.message);
          }
        }
      }
      
      if (maintenanceMessage !== undefined) {
        const sanitized = sanitizeInput(maintenanceMessage);
        if (sanitized.length <= MAX_MAINTENANCE_MESSAGE_LENGTH) {
          const escaped = sanitized.replace(/[<>]/g, '');
          if (settings.system.maintenanceMessage !== escaped) {
            oldValues['system.maintenanceMessage'] = settings.system.maintenanceMessage;
            settings.system.maintenanceMessage = escaped;
            changes.push(`Maintenance message updated`);
          }
        }
      }
      
      if (debugMode !== undefined) {
        const boolVal = Boolean(debugMode);
        if (settings.system.debugMode !== boolVal) {
          oldValues['system.debugMode'] = settings.system.debugMode;
          settings.system.debugMode = boolVal;
          changes.push(`Debug mode ${boolVal ? 'enabled' : 'disabled'}`);
        }
      }
      
      if (logLevel !== undefined && isValidLogLevel(logLevel)) {
        if (settings.system.logLevel !== logLevel) {
          oldValues['system.logLevel'] = settings.system.logLevel;
          settings.system.logLevel = logLevel;
          changes.push(`Log level changed from "${oldValues['system.logLevel']}" to "${logLevel}"`);
        }
      }
    }

    // ─── UPDATE META ──────────────────────────────────────────────────
    if (changes.length === 0) {
      return res.status(200).json({
        success: true,
        data: settings,
        message: 'No changes were made',
        changes: [],
      });
    }

    settings.updatedBy = adminId;
    settings.updatedAt = new Date();

    await settings.save();

    // ─── LOG AUDIT ──────────────────────────────────────────────────
    try {
      await logAudit(adminId, 'SETTINGS_UPDATE', {
        changes,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        oldValues: Object.keys(oldValues).length > 0 ? oldValues : undefined,
      });
    } catch (logError) {
      console.warn('⚠️ Audit log failed:', logError.message);
    }

    res.status(200).json({
      success: true,
      data: settings,
      message: `Settings updated successfully (${changes.length} change${changes.length > 1 ? 's' : ''})`,
      changes,
    });
  } catch (error) {
    console.error('❌ Update Settings Error:', error);
    
    try {
      await logAudit(
        req.admin?._id || req.user?._id || 'system',
        'SETTINGS_UPDATE_FAILED',
        {
          error: error.message,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
    } catch (logError) {
      console.warn('⚠️ Audit log failed:', logError.message);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    });
  }
};

// ============================================================
//  ─── RESET SETTINGS TO DEFAULT ──────────────────────────────
// ============================================================

export const resetSettings = async (req, res) => {
  try {
    const adminId = req.admin?._id || req.user?._id;
    const userRole = req.admin?.role || req.user?.role;
    const isSuperAdmin = userRole === 'super_admin' || userRole === 'superadmin' || req.admin?.isSuperAdmin === true;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required',
      });
    }

    // ✅ Only Super Admin can reset settings
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only super admin can reset settings',
      });
    }

    const { confirm } = req.body;
    if (confirm !== true && confirm !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Please confirm reset by setting confirm: true in the request body',
      });
    }

    const oldSettings = await Settings.findOne();
    const oldValues = oldSettings ? oldSettings.toObject() : null;
    
    await Settings.deleteMany({});
    
    const settings = await Settings.create({
      updatedBy: adminId,
      updatedAt: new Date(),
    });

    try {
      await logAudit(adminId, 'SETTINGS_RESET', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        previousSettings: oldValues ? {
          general: oldValues.general,
          security: oldValues.security,
          notifications: oldValues.notifications,
          appearance: oldValues.appearance,
        } : null,
      });
    } catch (logError) {
      console.warn('⚠️ Audit log failed:', logError.message);
    }

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Settings reset to default successfully. All custom configurations have been removed.',
    });
  } catch (error) {
    console.error('❌ Reset Settings Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset settings',
    });
  }
};

// ─── HELPER: URL Validation ────────────────────────────────────

const isValidUrl = (url) => {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ─── EXPORT ROUTE VALIDATION MIDDLEWARE ──────────────────────

export default {
  getSettings,
  updateSettings,
  resetSettings,
  settingsRateLimiter,
  sanitizeSettingsInput,
  validateSettingsUpdate,
};