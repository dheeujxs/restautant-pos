// server.js - COMPLETE FIXED VERSION WITH SUPER ADMIN ORDER ROUTES

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import superAdminsettingsRoutes from './routes/super-admin/superAdminsettingsRoutes.js'; 
import superAdminCategoryRoutes from './routes/super-admin/categoryRoutes.js';
import masterAdminRoutes from './routes/master-admin/masterAdminRoutes.js';
import superAdminDishRoutes from './routes/super-admin/dishRoutes.js';
import superAdminStaffRoutes from './routes/super-admin/staffRoutes.js';
// Import Routes
import dishRoutes from './routes/dishRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import billRoutes from './routes/billRoutes.js';
import unitRoutes from './routes/unitRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import branchRoutes from './routes/super-admin/branchRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import ingredientCategoryRoutes from './routes/ingredientCategoryRoutes.js';
import ingredientRoutes from './routes/ingredientRoutes.js';
import floorRoutes from './routes/floorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import recipeRoutes from './routes/recipeRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import kotRoutes from './routes/kotRoutes.js';
import staffPortalRoutes from './routes/staff-portal/staffPortalRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import staffOrderRoutes from './routes/staffOrderRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';

// ✅ Import Super Admin Payment Routes
import paymentRoutes from './routes/super-admin/paymentRoutes.js';

// Super Admin Routes
import superAdminRoutes from './routes/superAdminRoutes.js';
import superAdminRestaurantRoutes from './routes/super-admin/superAdminRestaurantRoutes.js';
import superAdminRevenueRoutes from './routes/superAdminRevenueRoutes.js';
import superAdminAdminRoutes from './routes/adminRoutes1.js';

// ✅ IMPORT SUPER ADMIN ORDER ROUTES
import superAdminOrderRoutes from './routes/super-admin/orderRoutes.js';

// ✅ IMPORT TEMPLATE ROUTES
import templateRoutes from './routes/templateRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// ✅ Connect to database
connectDB();

// ============================================
// ✅ CORS CONFIGURATION
// ============================================

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods'
  ],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// ✅ ROUTES - CLEAN SEPARATION
// ============================================

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── SUPER ADMIN ROUTES ──────────────────────────────────────────────────
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/super-admin/restaurants', superAdminRestaurantRoutes);
app.use('/api/super-admin/revenue', superAdminRevenueRoutes);
app.use('/api/super-admin/admins', superAdminAdminRoutes);
app.use('/api/super-admin/staff', superAdminStaffRoutes);
app.use('/api/super-admin/settings', superAdminsettingsRoutes);
app.use('/api/super-admin/payments', paymentRoutes);
app.use('/api/super-admin/categories', superAdminCategoryRoutes);
app.use('/api/super-admin/dishes', superAdminDishRoutes);
app.use('/api/super-admin/branches', branchRoutes);
app.use('/api/master-admin', masterAdminRoutes);

// ✅ SUPER ADMIN ORDER ROUTES - ADDED
app.use('/api/super-admin/orders', superAdminOrderRoutes);

// ─── ADMIN STAFF MANAGEMENT ──────────────────────────────────────────────
// Admin staff management at /api/staff
app.use('/api/staff', staffRoutes);

// ─── STAFF PORTAL ROUTES ──────────────────────────────────────────────────
app.use('/api/staff-portal', staffPortalRoutes);
app.use('/api/staff-orders', staffPortalRoutes);
app.use('/api/staff-kots', staffPortalRoutes);

// ─── STAFF ORDER ROUTES ──────────────────────────────────────────────────
app.use('/api/staff', staffOrderRoutes);

// ─── ORDER & KOT ROUTES ──────────────────────────────────────────────────
app.use('/api/orders', orderRoutes);
app.use('/api/kots', kotRoutes);
app.use('/api/bills', billRoutes);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────
app.use('/api/admin', adminRoutes);

// ─── MASTER DATA ROUTES ──────────────────────────────────────────────────
app.use('/api/dishes', dishRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ingredient-categories', ingredientCategoryRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dish-categories', categoryRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/attendance', attendanceRoutes);

// ─── TEMPLATE ROUTES ─────────────────────────────────────────────────────
app.use('/api/templates', templateRoutes);

// ============================================
// ✅ DEBUG ENDPOINTS
// ============================================

// Debug: List all registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  
  function extractRoutes(stack, basePath = '') {
    if (!stack) return;
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push({
          path: basePath + layer.route.path,
          methods: methods,
        });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        let routerBase = '';
        if (layer.regexp) {
          routerBase = layer.regexp.source
            .replace(/\\\//g, '/')
            .replace(/\^/g, '')
            .replace(/\?/g, '')
            .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param')
            .replace(/\/i$/, '')
            .replace(/\/$/, '');
        }
        extractRoutes(layer.handle.stack, routerBase);
      }
    });
  }
  
  extractRoutes(app._router.stack);
  
  const filteredRoutes = routes
    .filter(r => r.path && r.path.length > 0)
    .sort((a, b) => a.path.localeCompare(b.path));
  
  res.json({
    totalRoutes: filteredRoutes.length,
    routes: filteredRoutes,
  });
});

// Debug: Orders
app.get('/api/debug/orders', async (req, res) => {
  try {
    const Order = await import('./models/Order.js').then(m => m.default);
    const allOrders = await Order.find({}).lean();
    const completedPaid = await Order.find({ 
      orderStatus: 'completed', 
      paymentStatus: 'paid' 
    }).lean();
    
    res.json({
      totalOrders: allOrders.length,
      completedPaidOrders: completedPaid.length,
      orderStatuses: allOrders.reduce((acc, o) => {
        acc[o.orderStatus] = (acc[o.orderStatus] || 0) + 1;
        return acc;
      }, {}),
      paymentStatuses: allOrders.reduce((acc, o) => {
        acc[o.paymentStatus] = (acc[o.paymentStatus] || 0) + 1;
        return acc;
      }, {}),
      sampleOrders: allOrders.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ HEALTH CHECK
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'Restaurant POS API running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      'admin-staff': '/api/staff',
      'staff-portal': '/api/staff-portal',
      'staff-orders': '/api/staff-orders',
      'staff-kots': '/api/staff-kots',
      'staff-order-api': '/api/staff/orders',
      'staff-order-ready': '/api/staff/orders/ready',
      'staff-settings': '/api/staff-portal/settings',
      'kot-management': '/api/kots',
      'super-admin': '/api/super-admin',
      'super-admin-restaurants': '/api/super-admin/restaurants',
      'super-admin-revenue': '/api/super-admin/revenue',
      'super-admin-admins': '/api/super-admin/admins',
      'super-admin-settings': '/api/super-admin/settings',
      'super-admin-payments': '/api/super-admin/payments',
      'super-admin-orders': '/api/super-admin/orders', // ✅ ADDED
      dishes: '/api/dishes',
      categories: '/api/categories',
      tables: '/api/tables',
      bills: '/api/bills',
      settings: '/api/settings',
      templates: '/api/templates',
    },
  });
});

// ============================================
// ✅ ERROR HANDLERS
// ============================================

// 404 Handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false,
    error: `Route not found: ${req.method} ${req.url}` 
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  console.error('Stack:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy blocked this request'
    });
  }
  
  res.status(err.status || 500).json({ 
    success: false,
    error: err.message || 'Internal Server Error' 
  });
});

// ============================================
// ✅ START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
  console.log(`📋 Auth Routes: http://127.0.0.1:${PORT}/api/auth`);
  console.log(`📋 Orders: http://127.0.0.1:${PORT}/api/orders`);
  console.log(`📋 Admin Staff: http://127.0.0.1:${PORT}/api/staff`);
  console.log(`📋 Staff Portal: http://127.0.0.1:${PORT}/api/staff-portal`);
  console.log(`📋 Staff Settings: http://127.0.0.1:${PORT}/api/staff-portal/settings`);
  console.log(`📋 Staff Orders: http://127.0.0.1:${PORT}/api/staff-orders`);
  console.log(`📋 Staff KOT: http://127.0.0.1:${PORT}/api/staff-kots`);
  console.log(`📋 STAFF ORDER API: http://127.0.0.1:${PORT}/api/staff/orders`);
  console.log(`📋 STAFF READY ORDERS: http://127.0.0.1:${PORT}/api/staff/orders/ready`);
  console.log(`📋 KOT Management: http://127.0.0.1:${PORT}/api/kots`);
  console.log(`📋 Super Admin: http://127.0.0.1:${PORT}/api/super-admin`);
  console.log(`📋 Super Admin Orders: http://127.0.0.1:${PORT}/api/super-admin/orders`); // ✅ ADDED
  console.log(`📋 Super Admin Restaurants: http://127.0.0.1:${PORT}/api/super-admin/restaurants`);
  console.log(`📋 Super Admin Branches: http://127.0.0.1:${PORT}/api/super-admin/branches`);
  console.log(`📋 Settings: http://127.0.0.1:${PORT}/api/settings`);
  console.log(`📋 Templates: http://127.0.0.1:${PORT}/api/templates`);
  console.log(`📋 Debug Routes: http://127.0.0.1:${PORT}/api/debug/routes`);
  console.log(`🌐 CORS enabled for all origins (development)`);
});

// console.log = () => {};
// console.info = () => {};
// console.warn = () => {};
// console.debug = () => {};
// console.error = () => {};
// console.trace = () => {};
// console.dir = () => {};
// console.table = () => {};
// console.group = () => {};
// console.groupEnd = () => {};
// console.groupCollapsed = () => {};
// console.time = () => {};
// console.timeEnd = () => {};
// console.timeLog = () => {};
// console.assert = () => {};
// console.count = () => {};
// console.countReset = () => {};