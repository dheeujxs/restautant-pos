// controllers/settingsController.js
import Settings from '../models/Settings.js';
import { 
  isValidObjectId, 
  isValidEmail, 
  isValidPhone, 
  isValidName,
  isValidText,
  isValidPrice,
  isValidPercentage,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH
} from '../utils/validators.js';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js';

// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const MAX_RESTAURANT_NAME_LENGTH = 100;
const MAX_RESTAURANT_ADDRESS_LENGTH = 500;
const MAX_BILL_FOOTER_LENGTH = 200;
const MAX_PRINTER_IP_LENGTH = 50;
const MAX_TIMEZONE_LENGTH = 50;
const MAX_DATE_FORMAT_LENGTH = 20;
const MAX_TIME_FORMAT_LENGTH = 10;
const MAX_CURRENCY_LENGTH = 10;
const MAX_DEFAULT_DISCOUNT = 100;
const MAX_POINTS_PER_RUPEE = 100;
const MAX_DEFAULT_TABLE_WAIT_TIME = 999;
const MAX_LOW_STOCK_ALERT = 99999;
const MAX_MAX_ORDER_PER_TABLE = 999;
const ALLOWED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
const ALLOWED_DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY'];
const ALLOWED_TIME_FORMATS = ['12h', '24h'];
const ALLOWED_TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Australia/Sydney', 'Australia/Melbourne',
  'Pacific/Auckland', 'Pacific/Fiji'
];

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

// Default settings
const DEFAULT_SETTINGS = {
  restaurantName: 'My Restaurant',
  restaurantEmail: '',
  restaurantPhone: '',
  restaurantAddress: '',
  taxRate: 5,
  currency: 'INR',
  defaultDiscount: 0,
  billFooterMessage: 'Thank you for dining with us!',
  autoPrintBill: false,
  enableEmailReceipts: true,
  autoKOT: true,
  maxOrderPerTable: 5,
  enablePreOrder: false,
  lowStockAlert: 10,
  enableNotifications: true,
  enableSMSAlerts: false,
  printerIP: '',
  kitchenPrinterIP: '',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  enableLoyaltyPoints: false,
  pointsPerRupee: 1,
  defaultTableWaitTime: 15,
  enableOnlineOrders: false,
  enableReservations: false,
  enableTakeaway: true,
  enableDelivery: false,
  gstNumber: '',
  fssaiNumber: '',
  panNumber: '',
  logo: '',
};

// Validate restaurant name
const isValidRestaurantName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 1) return false;
  if (trimmed.length > MAX_RESTAURANT_NAME_LENGTH) return false;
  // XSS protection - remove HTML tags
  const sanitized = trimmed.replace(/<[^>]*>/g, '');
  return sanitized === trimmed;
};

// Validate restaurant address
const isValidRestaurantAddress = (address) => {
  if (!address) return true;
  const trimmed = address.trim();
  if (trimmed.length > MAX_RESTAURANT_ADDRESS_LENGTH) return false;
  return true;
};

// Validate bill footer message
const isValidBillFooter = (message) => {
  if (!message) return true;
  const trimmed = message.trim();
  if (trimmed.length > MAX_BILL_FOOTER_LENGTH) return false;
  // XSS protection
  const sanitized = trimmed.replace(/<[^>]*>/g, '');
  return sanitized === trimmed;
};

// Validate currency
const isValidCurrency = (currency) => {
  if (!currency) return false;
  return ALLOWED_CURRENCIES.includes(currency.toUpperCase());
};

// Validate date format
const isValidDateFormat = (format) => {
  if (!format) return false;
  return ALLOWED_DATE_FORMATS.includes(format);
};

// Validate time format
const isValidTimeFormat = (format) => {
  if (!format) return false;
  return ALLOWED_TIME_FORMATS.includes(format);
};

// Validate timezone
const isValidTimezone = (timezone) => {
  if (!timezone) return false;
  return ALLOWED_TIMEZONES.includes(timezone);
};

// Validate printer IP
const isValidPrinterIP = (ip) => {
  if (!ip) return true;
  const trimmed = ip.trim();
  if (trimmed.length > MAX_PRINTER_IP_LENGTH) return false;
  // Simple IP validation (IPv4 or hostname)
  const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-.]{1,61}[a-zA-Z0-9]$/;
  return ipRegex.test(trimmed) || hostnameRegex.test(trimmed) || trimmed === '';
};

// Validate GST number
const isValidGSTNumber = (gst) => {
  if (!gst) return true;
  const trimmed = gst.trim();
  // GST format: 22AAAAA0000A1Z5
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z{1}[0-9A-Z]{1}$/;
  return gstRegex.test(trimmed.toUpperCase());
};

// Validate FSSAI number
const isValidFSSAINumber = (fssai) => {
  if (!fssai) return true;
  const trimmed = fssai.trim();
  // FSSAI format: 12345678901234 (14 digits)
  const fssaiRegex = /^[0-9]{14}$/;
  return fssaiRegex.test(trimmed);
};

// Validate PAN number
const isValidPANNumber = (pan) => {
  if (!pan) return true;
  const trimmed = pan.trim();
  // PAN format: ABCDE1234F
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(trimmed.toUpperCase());
};

// Validate logo URL
const isValidLogo = (logo) => {
  if (!logo) return true;
  if (logo.startsWith('data:image')) {
    const base64Data = logo.split(',')[1];
    if (!base64Data) return false;
    const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
    if (sizeInBytes > 2 * 1024 * 1024) return false; // 2MB limit
    return true;
  }
  if (logo.startsWith('http')) {
    const maliciousPatterns = [/<script/i, /javascript:/i, /data:/i, /vbscript:/i];
    for (const pattern of maliciousPatterns) {
      if (pattern.test(logo)) return false;
    }
    return true;
  }
  const logoRegex = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
  return logoRegex.test(logo);
};

// Sanitize settings for response
const sanitizeSettings = (settings) => {
  if (!settings) return null;
  return {
    _id: settings._id,
    id: settings._id,
    restaurantName: sanitizeInput(settings.restaurantName || ''),
    restaurantEmail: settings.restaurantEmail || '',
    restaurantPhone: settings.restaurantPhone || '',
    restaurantAddress: sanitizeInput(settings.restaurantAddress || ''),
    taxRate: settings.taxRate || 0,
    currency: settings.currency || 'INR',
    defaultDiscount: settings.defaultDiscount || 0,
    billFooterMessage: sanitizeInput(settings.billFooterMessage || ''),
    autoPrintBill: settings.autoPrintBill || false,
    enableEmailReceipts: settings.enableEmailReceipts !== false,
    autoKOT: settings.autoKOT !== false,
    maxOrderPerTable: settings.maxOrderPerTable || 5,
    enablePreOrder: settings.enablePreOrder || false,
    lowStockAlert: settings.lowStockAlert || 10,
    enableNotifications: settings.enableNotifications !== false,
    enableSMSAlerts: settings.enableSMSAlerts || false,
    printerIP: settings.printerIP || '',
    kitchenPrinterIP: settings.kitchenPrinterIP || '',
    timezone: settings.timezone || 'Asia/Kolkata',
    dateFormat: settings.dateFormat || 'DD/MM/YYYY',
    timeFormat: settings.timeFormat || '12h',
    enableLoyaltyPoints: settings.enableLoyaltyPoints || false,
    pointsPerRupee: settings.pointsPerRupee || 1,
    defaultTableWaitTime: settings.defaultTableWaitTime || 15,
    enableOnlineOrders: settings.enableOnlineOrders || false,
    enableReservations: settings.enableReservations || false,
    enableTakeaway: settings.enableTakeaway !== false,
    enableDelivery: settings.enableDelivery || false,
    gstNumber: settings.gstNumber || '',
    fssaiNumber: settings.fssaiNumber || '',
    panNumber: settings.panNumber || '',
    logo: settings.logo || '',
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
};

// ============================================================
//  SETTINGS CONTROLLERS
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get settings
// @route   GET /api/settings
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const getSettings = async (req, res) => {
  try {
    console.log('📤 Fetching settings...');
    let settings = await Settings.findOne();
    
    if (!settings) {
      console.log('📝 No settings found, creating default...');
      settings = await Settings.create(DEFAULT_SETTINGS);
    }
    
    console.log('✅ Settings fetched:', settings._id);
    return res.json({
      success: true,
      data: sanitizeSettings(settings),
    });
  } catch (err) {
    console.error('[GET /api/settings] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update settings
// @route   PUT /api/settings
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const updateSettings = async (req, res) => {
  try {
    // ─── SANITIZE INPUT ──────────────────────────────────────────────────
    const body = sanitizeObject(req.body);
    console.log('📝 Updating settings:', body);

    // ─── VALIDATE SETTINGS ────────────────────────────────────────────────
    const errors = [];

    // Validate restaurant name
    if (body.restaurantName !== undefined) {
      if (!isValidRestaurantName(body.restaurantName)) {
        errors.push(`Restaurant name must be between 1 and ${MAX_RESTAURANT_NAME_LENGTH} characters`);
      }
    }

    // Validate email
    if (body.restaurantEmail !== undefined && body.restaurantEmail) {
      if (!isValidEmail(body.restaurantEmail)) {
        errors.push('Invalid restaurant email format');
      }
    }

    // Validate phone
    if (body.restaurantPhone !== undefined && body.restaurantPhone) {
      if (!isValidPhone(body.restaurantPhone)) {
        errors.push('Invalid restaurant phone number. Must be 10 digits');
      }
    }

    // Validate address
    if (body.restaurantAddress !== undefined) {
      if (!isValidRestaurantAddress(body.restaurantAddress)) {
        errors.push(`Restaurant address cannot exceed ${MAX_RESTAURANT_ADDRESS_LENGTH} characters`);
      }
    }

    // Validate tax rate
    if (body.taxRate !== undefined) {
      if (!isValidPercentage(body.taxRate)) {
        errors.push('Tax rate must be between 0 and 100');
      }
    }

    // Validate currency
    if (body.currency !== undefined) {
      if (!isValidCurrency(body.currency)) {
        errors.push(`Invalid currency. Allowed: ${ALLOWED_CURRENCIES.join(', ')}`);
      }
    }

    // Validate default discount
    if (body.defaultDiscount !== undefined) {
      if (!isValidPercentage(body.defaultDiscount) || body.defaultDiscount > MAX_DEFAULT_DISCOUNT) {
        errors.push(`Default discount must be between 0 and ${MAX_DEFAULT_DISCOUNT}`);
      }
    }

    // Validate bill footer
    if (body.billFooterMessage !== undefined) {
      if (!isValidBillFooter(body.billFooterMessage)) {
        errors.push(`Bill footer message cannot exceed ${MAX_BILL_FOOTER_LENGTH} characters and must not contain HTML`);
      }
    }

    // Validate date format
    if (body.dateFormat !== undefined) {
      if (!isValidDateFormat(body.dateFormat)) {
        errors.push(`Invalid date format. Allowed: ${ALLOWED_DATE_FORMATS.join(', ')}`);
      }
    }

    // Validate time format
    if (body.timeFormat !== undefined) {
      if (!isValidTimeFormat(body.timeFormat)) {
        errors.push(`Invalid time format. Allowed: ${ALLOWED_TIME_FORMATS.join(', ')}`);
      }
    }

    // Validate timezone
    if (body.timezone !== undefined) {
      if (!isValidTimezone(body.timezone)) {
        errors.push(`Invalid timezone. Allowed: ${ALLOWED_TIMEZONES.join(', ')}`);
      }
    }

    // Validate printer IP
    if (body.printerIP !== undefined) {
      if (!isValidPrinterIP(body.printerIP)) {
        errors.push('Invalid printer IP address or hostname');
      }
    }

    // Validate kitchen printer IP
    if (body.kitchenPrinterIP !== undefined) {
      if (!isValidPrinterIP(body.kitchenPrinterIP)) {
        errors.push('Invalid kitchen printer IP address or hostname');
      }
    }

    // Validate max order per table
    if (body.maxOrderPerTable !== undefined) {
      if (!Number.isInteger(body.maxOrderPerTable) || body.maxOrderPerTable < 1 || body.maxOrderPerTable > MAX_MAX_ORDER_PER_TABLE) {
        errors.push(`Max order per table must be between 1 and ${MAX_MAX_ORDER_PER_TABLE}`);
      }
    }

    // Validate low stock alert
    if (body.lowStockAlert !== undefined) {
      if (!Number.isInteger(body.lowStockAlert) || body.lowStockAlert < 0 || body.lowStockAlert > MAX_LOW_STOCK_ALERT) {
        errors.push(`Low stock alert must be between 0 and ${MAX_LOW_STOCK_ALERT}`);
      }
    }

    // Validate points per rupee
    if (body.pointsPerRupee !== undefined) {
      if (!Number.isInteger(body.pointsPerRupee) || body.pointsPerRupee < 0 || body.pointsPerRupee > MAX_POINTS_PER_RUPEE) {
        errors.push(`Points per rupee must be between 0 and ${MAX_POINTS_PER_RUPEE}`);
      }
    }

    // Validate default table wait time
    if (body.defaultTableWaitTime !== undefined) {
      if (!Number.isInteger(body.defaultTableWaitTime) || body.defaultTableWaitTime < 0 || body.defaultTableWaitTime > MAX_DEFAULT_TABLE_WAIT_TIME) {
        errors.push(`Default table wait time must be between 0 and ${MAX_DEFAULT_TABLE_WAIT_TIME}`);
      }
    }

    // Validate GST number
    if (body.gstNumber !== undefined && body.gstNumber) {
      if (!isValidGSTNumber(body.gstNumber)) {
        errors.push('Invalid GST number format. Format: 22AAAAA0000A1Z5');
      }
    }

    // Validate FSSAI number
    if (body.fssaiNumber !== undefined && body.fssaiNumber) {
      if (!isValidFSSAINumber(body.fssaiNumber)) {
        errors.push('Invalid FSSAI number. Must be 14 digits');
      }
    }

    // Validate PAN number
    if (body.panNumber !== undefined && body.panNumber) {
      if (!isValidPANNumber(body.panNumber)) {
        errors.push('Invalid PAN number format. Format: ABCDE1234F');
      }
    }

    // Validate logo
    if (body.logo !== undefined && body.logo) {
      if (!isValidLogo(body.logo)) {
        errors.push('Invalid logo format. Use URL or base64 image (max 2MB)');
      }
    }

    // Validate boolean fields
    const booleanFields = [
      'autoPrintBill', 'enableEmailReceipts', 'autoKOT', 'enablePreOrder',
      'enableNotifications', 'enableSMSAlerts', 'enableLoyaltyPoints',
      'enableOnlineOrders', 'enableReservations', 'enableTakeaway', 'enableDelivery'
    ];
    
    for (const field of booleanFields) {
      if (body[field] !== undefined && typeof body[field] !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    }

    // ─── IF ERRORS EXIST ──────────────────────────────────────────────────
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    // ─── FIND OR CREATE SETTINGS ─────────────────────────────────────────
    let settings = await Settings.findOne();
    
    if (!settings) {
      console.log('📝 No settings found, creating new...');
      settings = new Settings(DEFAULT_SETTINGS);
    }

    // ─── UPDATE SETTINGS ──────────────────────────────────────────────────
    const updateData = {};
    const allowedFields = [
      'restaurantName', 'restaurantEmail', 'restaurantPhone', 'restaurantAddress',
      'taxRate', 'currency', 'defaultDiscount', 'billFooterMessage',
      'autoPrintBill', 'enableEmailReceipts', 'autoKOT', 'maxOrderPerTable',
      'enablePreOrder', 'lowStockAlert', 'enableNotifications', 'enableSMSAlerts',
      'printerIP', 'kitchenPrinterIP', 'timezone', 'dateFormat', 'timeFormat',
      'enableLoyaltyPoints', 'pointsPerRupee', 'defaultTableWaitTime',
      'enableOnlineOrders', 'enableReservations', 'enableTakeaway', 'enableDelivery',
      'gstNumber', 'fssaiNumber', 'panNumber', 'logo'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] === 'string') {
          updateData[field] = sanitizeInput(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Update settings
    Object.assign(settings, updateData);
    await settings.save();
    
    console.log('✅ Settings updated successfully');
    return res.json({
      success: true,
      data: sanitizeSettings(settings),
      message: 'Settings updated successfully',
    });
  } catch (err) {
    console.error('[PUT /api/settings] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Reset settings to default
// @route   POST /api/settings/reset
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const resetSettings = async (req, res) => {
  try {
    console.log('🔄 Resetting settings to default...');
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings(DEFAULT_SETTINGS);
    } else {
      Object.assign(settings, DEFAULT_SETTINGS);
    }
    
    await settings.save();
    
    console.log('✅ Settings reset successfully');
    return res.json({
      success: true,
      data: sanitizeSettings(settings),
      message: 'Settings reset to default successfully',
    });
  } catch (err) {
    console.error('[POST /api/settings/reset] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset settings',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Update specific setting
// @route   PATCH /api/settings/:key
// @access  Private
// ──────────────────────────────────────────────────────────────────────────

export const updateSetting = async (req, res) => {
  try {
    // ─── VALIDATE KEY ────────────────────────────────────────────────────
    const { key } = req.params;
    const { value } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
    }

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Setting value is required',
      });
    }

    // ─── ALLOWED KEYS ──────────────────────────────────────────────────────
    const allowedKeys = [
      'restaurantName', 'restaurantEmail', 'restaurantPhone', 'restaurantAddress',
      'taxRate', 'currency', 'defaultDiscount', 'billFooterMessage',
      'autoPrintBill', 'enableEmailReceipts', 'autoKOT', 'maxOrderPerTable',
      'enablePreOrder', 'lowStockAlert', 'enableNotifications', 'enableSMSAlerts',
      'printerIP', 'kitchenPrinterIP', 'timezone', 'dateFormat', 'timeFormat',
      'enableLoyaltyPoints', 'pointsPerRupee', 'defaultTableWaitTime',
      'enableOnlineOrders', 'enableReservations', 'enableTakeaway', 'enableDelivery',
      'gstNumber', 'fssaiNumber', 'panNumber', 'logo'
    ];

    if (!allowedKeys.includes(key)) {
      return res.status(400).json({
        success: false,
        error: `Invalid setting key: ${key}`,
      });
    }

    // ─── FIND OR CREATE SETTINGS ─────────────────────────────────────────
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(DEFAULT_SETTINGS);
    }

    // ─── UPDATE SETTING ──────────────────────────────────────────────────
    const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
    settings[key] = sanitizedValue;
    await settings.save();

    return res.json({
      success: true,
      data: {
        key,
        value: sanitizedValue,
        settings: sanitizeSettings(settings),
      },
      message: `Setting '${key}' updated successfully`,
    });
  } catch (err) {
    console.error('[PATCH /api/settings/:key] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update setting',
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get public settings (limited fields)
// @route   GET /api/settings/public
// @access  Public
// ──────────────────────────────────────────────────────────────────────────

export const getPublicSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(DEFAULT_SETTINGS);
    }

    // ─── RETURN ONLY PUBLIC FIELDS ──────────────────────────────────────
    const publicData = {
      restaurantName: sanitizeInput(settings.restaurantName || ''),
      restaurantAddress: sanitizeInput(settings.restaurantAddress || ''),
      restaurantPhone: settings.restaurantPhone || '',
      restaurantEmail: settings.restaurantEmail || '',
      taxRate: settings.taxRate || 0,
      currency: settings.currency || 'INR',
      enableOnlineOrders: settings.enableOnlineOrders || false,
      enableReservations: settings.enableReservations || false,
      enableTakeaway: settings.enableTakeaway !== false,
      enableDelivery: settings.enableDelivery || false,
      gstNumber: settings.gstNumber || '',
      fssaiNumber: settings.fssaiNumber || '',
      logo: settings.logo || '',
      timezone: settings.timezone || 'Asia/Kolkata',
      dateFormat: settings.dateFormat || 'DD/MM/YYYY',
      timeFormat: settings.timeFormat || '12h',
      enableLoyaltyPoints: settings.enableLoyaltyPoints || false,
      pointsPerRupee: settings.pointsPerRupee || 1,
    };

    return res.json({
      success: true,
      data: publicData,
    });
  } catch (err) {
    console.error('[GET /api/settings/public] ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch public settings',
    });
  }
};