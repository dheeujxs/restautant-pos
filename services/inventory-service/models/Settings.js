// models/Settings.js (unified)

import mongoose from 'mongoose';

// Check if model already exists
let Settings;

if (mongoose.models && mongoose.models.Settings) {
  Settings = mongoose.models.Settings;
  console.log('✅ Settings model already exists, reusing it');
} else {
  const settingsSchema = new mongoose.Schema({
    // ─── GENERAL SETTINGS ────────────────────────────────────────────
    general: {
      siteName: {
        type: String,
        default: 'Apos Restaurant Management',
        trim: true,
        maxlength: 100,
      },
      siteLogo: {
        type: String,
        default: '',
        trim: true,
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
        trim: true,
        maxlength: 50,
      },
      currency: {
        type: String,
        default: 'INR',
        trim: true,
        maxlength: 10,
        uppercase: true,
      },
      dateFormat: {
        type: String,
        default: 'DD/MM/YYYY',
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '12h',
      },
    },

    // ─── RESTAURANT INFO ─────────────────────────────────────────────
    restaurant: {
      name: {
        type: String,
        default: 'My Restaurant',
        trim: true,
        maxlength: 100,
      },
      email: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
        maxlength: 100,
      },
      phone: {
        type: String,
        default: '',
        trim: true,
        maxlength: 20,
      },
      address: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500,
      },
      gstNumber: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
      fssaiNumber: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
      panNumber: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
    },

    // ─── BILLING SETTINGS ────────────────────────────────────────────
    billing: {
      taxRate: {
        type: Number,
        default: 5,
        min: 0,
        max: 100,
      },
      defaultDiscount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      billFooterMessage: {
        type: String,
        default: 'Thank you for dining with us!',
        trim: true,
        maxlength: 500,
      },
      autoPrintBill: {
        type: Boolean,
        default: false,
      },
      enableEmailReceipts: {
        type: Boolean,
        default: true,
      },
      enableGST: {
        type: Boolean,
        default: false,
      },
      enableServiceCharge: {
        type: Boolean,
        default: false,
      },
      serviceChargeRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },

    // ─── KITCHEN SETTINGS ────────────────────────────────────────────
    kitchen: {
      autoKOT: {
        type: Boolean,
        default: true,
      },
      maxOrderPerTable: {
        type: Number,
        default: 5,
        min: 1,
        max: 20,
      },
      enablePreOrder: {
        type: Boolean,
        default: false,
      },
      prepTimeBuffer: {
        type: Number,
        default: 5,
        min: 0,
        max: 30,
      },
    },

    // ─── INVENTORY SETTINGS ──────────────────────────────────────────
    inventory: {
      lowStockAlert: {
        type: Number,
        default: 10,
        min: 0,
      },
      enableAutoReorder: {
        type: Boolean,
        default: false,
      },
      reorderThreshold: {
        type: Number,
        default: 20,
        min: 0,
      },
    },

    // ─── TABLE SETTINGS ──────────────────────────────────────────────
    tables: {
      defaultWaitTime: {
        type: Number,
        default: 15,
        min: 0,
      },
      maxReservationsPerDay: {
        type: Number,
        default: 50,
        min: 0,
      },
      enableTableRotation: {
        type: Boolean,
        default: false,
      },
    },

    // ─── LOYALTY SETTINGS ────────────────────────────────────────────
    loyalty: {
      enableLoyaltyPoints: {
        type: Boolean,
        default: false,
      },
      pointsPerRupee: {
        type: Number,
        default: 1,
        min: 0,
      },
      pointsExpiryDays: {
        type: Number,
        default: 365,
        min: 0,
      },
      minimumPointsForRedemption: {
        type: Number,
        default: 100,
        min: 0,
      },
    },

    // ─── NOTIFICATION SETTINGS ──────────────────────────────────────
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      smsAlerts: {
        type: Boolean,
        default: false,
      },
      orderUpdates: {
        type: Boolean,
        default: true,
      },
      paymentAlerts: {
        type: Boolean,
        default: true,
      },
      securityAlerts: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
      stockAlerts: {
        type: Boolean,
        default: true,
      },
      tableStatusAlerts: {
        type: Boolean,
        default: true,
      },
    },

    // ─── PRINTER SETTINGS ────────────────────────────────────────────
    printers: {
      billPrinterIP: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
      kitchenPrinterIP: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
      labelPrinterIP: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
      printerPort: {
        type: Number,
        default: 9100,
        min: 1,
        max: 65535,
      },
      printerType: {
        type: String,
        enum: ['thermal', 'dotmatrix', 'network'],
        default: 'thermal',
      },
    },

    // ─── SECURITY SETTINGS ──────────────────────────────────────────
    security: {
      twoFactorAuth: {
        type: Boolean,
        default: false,
      },
      sessionTimeout: {
        type: Number,
        default: 60,
        min: 5,
        max: 480,
      },
      maxLoginAttempts: {
        type: Number,
        default: 5,
        min: 3,
        max: 10,
      },
      passwordExpiry: {
        type: Number,
        default: 90,
        min: 30,
        max: 365,
      },
      requireStrongPassword: {
        type: Boolean,
        default: true,
      },
      enableAuditLog: {
        type: Boolean,
        default: true,
      },
    },

    // ─── APPEARANCE SETTINGS ────────────────────────────────────────
    appearance: {
      theme: {
        type: String,
        default: 'light',
        enum: ['light', 'dark', 'system'],
      },
      primaryColor: {
        type: String,
        default: '#8b5cf6',
        validate: {
          validator: function(v) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
          },
          message: 'Invalid hex color format',
        },
      },
      sidebarCollapsed: {
        type: Boolean,
        default: false,
      },
      compactView: {
        type: Boolean,
        default: false,
      },
      accentColor: {
        type: String,
        default: '#f97316',
        validate: {
          validator: function(v) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
          },
          message: 'Invalid hex color format',
        },
      },
    },

    // ─── INTEGRATION SETTINGS ──────────────────────────────────────
    integrations: {
      stripeEnabled: {
        type: Boolean,
        default: false,
      },
      razorpayEnabled: {
        type: Boolean,
        default: false,
      },
      googleAnalytics: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
      sentryEnabled: {
        type: Boolean,
        default: false,
      },
      facebookPixel: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
      zohoIntegration: {
        type: Boolean,
        default: false,
      },
    },

    // ─── SYSTEM SETTINGS ────────────────────────────────────────────
    system: {
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
      maintenanceMessage: {
        type: String,
        default: 'We are currently undergoing maintenance. Please check back later.',
        trim: true,
        maxlength: 500,
      },
      debugMode: {
        type: Boolean,
        default: false,
      },
      logLevel: {
        type: String,
        default: 'info',
        enum: ['error', 'warn', 'info', 'debug', 'trace'],
      },
      autoBackup: {
        type: Boolean,
        default: false,
      },
      backupFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily',
      },
    },

    // ─── ONLINE ORDER SETTINGS ──────────────────────────────────────
    onlineOrders: {
      enabled: {
        type: Boolean,
        default: false,
      },
      deliveryEnabled: {
        type: Boolean,
        default: false,
      },
      takeawayEnabled: {
        type: Boolean,
        default: true,
      },
      reservationsEnabled: {
        type: Boolean,
        default: false,
      },
      deliveryCharge: {
        type: Number,
        default: 0,
        min: 0,
      },
      minimumOrderAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // ─── META ────────────────────────────────────────────────────────
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }, {
    timestamps: true,
    collection: 'settings',
  });

  // ─── Static Methods ────────────────────────────────────────────
  settingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
      settings = await this.create({});
    }
    return settings;
  };

  // ─── Instance Methods ──────────────────────────────────────────
  settingsSchema.methods.getRestaurantInfo = function() {
    return {
      name: this.restaurant.name,
      email: this.restaurant.email,
      phone: this.restaurant.phone,
      address: this.restaurant.address,
      gstNumber: this.restaurant.gstNumber,
      fssaiNumber: this.restaurant.fssaiNumber,
    };
  };

  settingsSchema.methods.getBillingInfo = function() {
    return {
      taxRate: this.billing.taxRate,
      currency: this.general.currency,
      defaultDiscount: this.billing.defaultDiscount,
      footerMessage: this.billing.billFooterMessage,
    };
  };

  // ─── Create the model ──────────────────────────────────────────
  console.log('✅ Creating Settings model...');
  Settings = mongoose.model('Settings', settingsSchema);
  console.log('✅ Settings model created successfully');
}

export default Settings;