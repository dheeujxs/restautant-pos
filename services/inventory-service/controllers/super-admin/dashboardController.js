// controllers/super-admin/dashboardController.js - Complete with Branch Filter Support

import Restaurant from '../../models/super-admin/Restaurant.js';
import Branch from '../../models/super-admin/Branch.js';
import Order from '../../models/Order.js';
import Bill from '../../models/Bill.js';
import Staff from '../../models/Staff.js';
import User from '../../models/User.js';
import mongoose from 'mongoose';
import moment from 'moment';

// ============================================================
//  ─── GET DATE RANGE HELPER ─────────────────────────────────
// ============================================================

const getDateRange = (period, startDate, endDate) => {
  if (period === 'custom' && startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate)
    };
  }

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
    case 'year':
      start = now.clone().startOf('year');
      end = now.clone().endOf('year');
      break;
    default:
      start = now.clone().startOf('month');
      end = now.clone().endOf('month');
  }

  console.log(`📅 Date Range for ${period}:`, {
    start: start.format('YYYY-MM-DD HH:mm:ss'),
    end: end.format('YYYY-MM-DD HH:mm:ss')
  });

  return {
    start: start.toDate(),
    end: end.toDate()
  };
};

// ============================================================
//  ─── BUILD FILTERS HELPER ──────────────────────────────────
// ============================================================

const buildFilters = (restaurantId, branchId) => {
  let restaurantFilter = {};
  let billFilter = { paymentStatus: 'paid' };
  let orderFilter = {};
  let staffFilter = {};
  
  // ✅ Branch filter takes priority over restaurant filter
  if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
    billFilter.branchId = branchId;
    orderFilter.branchId = branchId;
    staffFilter.branchId = branchId;
    console.log(`📍 Filtering by branch: ${branchId}`);
    return { restaurantFilter, billFilter, orderFilter, staffFilter };
  }
  
  // ✅ Restaurant filter (only if no branch filter)
  if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
    restaurantFilter._id = restaurantId;
    billFilter.restaurantId = restaurantId;
    orderFilter.restaurantId = restaurantId;
    staffFilter.restaurantId = restaurantId;
    console.log(`🏢 Filtering by restaurant: ${restaurantId}`);
  }
  
  return { restaurantFilter, billFilter, orderFilter, staffFilter };
};

// ============================================================
//  ─── GET DASHBOARD STATS ────────────────────────────────────
// ============================================================

export const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...');
    
    const { period = 'month', restaurantId, branchId, startDate, endDate } = req.query;
    
    console.log('📊 Restaurant ID filter:', restaurantId);
    console.log('📊 Branch ID filter:', branchId);
    console.log('📊 Period:', period);

    let dateRange = getDateRange(period, startDate, endDate);
    console.log('📅 Date Range:', dateRange);

    // ✅ Build filters with branch support
    const { restaurantFilter, billFilter, orderFilter, staffFilter } = buildFilters(restaurantId, branchId);
    
    // Add date range to bill filter
    billFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };

    // ─── Parallel Queries ──────────────────────────────────────────────
    const [
      totalRestaurants,
      activeRestaurants,
      pendingRestaurants,
      suspendedRestaurants,
      totalBills,
      monthlyBills,
      todayBills,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalStaff,
      activeStaff,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      prevBills,
    ] = await Promise.all([
      // Restaurant stats
      Restaurant.countDocuments(restaurantFilter),
      Restaurant.countDocuments({ ...restaurantFilter, status: 'active' }),
      Restaurant.countDocuments({ ...restaurantFilter, status: 'pending' }),
      Restaurant.countDocuments({ ...restaurantFilter, status: 'suspended' }),
      
      // Bills
      Bill.find(billFilter).lean(),
      
      // Monthly bills
      Bill.find({
        ...billFilter,
        createdAt: { $gte: moment().startOf('month').toDate(), $lte: dateRange.end }
      }).lean(),
      
      // Today bills
      Bill.find({
        ...billFilter,
        createdAt: { $gte: moment().startOf('day').toDate(), $lte: dateRange.end }
      }).lean(),
      
      // Orders
      Order.countDocuments(orderFilter),
      Order.countDocuments({ ...orderFilter, orderStatus: { $in: ['pending', 'confirmed', 'preparing'] } }),
      Order.countDocuments({ ...orderFilter, orderStatus: 'completed' }),
      
      // Staff
      Staff.countDocuments(staffFilter),
      Staff.countDocuments({ ...staffFilter, status: 'active' }),
      
      // Subscriptions
      Restaurant.countDocuments({ ...restaurantFilter, 'subscription.plan': { $ne: 'trial' } }),
      Restaurant.countDocuments({ ...restaurantFilter, 'subscription.status': 'active' }),
      Restaurant.countDocuments({ ...restaurantFilter, 'subscription.status': 'expired' }),
      
      // Previous period for growth
      Bill.find({
        paymentStatus: 'paid',
        ...(branchId && branchId !== 'all' && branchId !== 'undefined' ? { branchId } : {}),
        ...(!branchId && restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined' ? { restaurantId } : {}),
        createdAt: { 
          $gte: moment(dateRange.start).subtract(1, 'month').toDate(), 
          $lte: moment(dateRange.start).subtract(1, 'day').toDate() 
        }
      }).lean(),
    ]);

    // ─── Calculate Revenue ──────────────────────────────────────────────
    const totalRevenue = totalBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const monthlyRevenue = monthlyBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const todayRevenue = todayBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const todayOrders = todayBills.length;
    const prevRevenue = prevBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    
    // ─── Calculate Growth ──────────────────────────────────────────────
    const growth = prevRevenue > 0 
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
      : totalRevenue > 0 ? 100 : 0;

    // ─── Calculate Daily Average ────────────────────────────────────────
    const days = moment(dateRange.end).diff(moment(dateRange.start), 'days') + 1;
    const dailyAverage = days > 0 ? totalRevenue / days : 0;

    // ─── Response ──────────────────────────────────────────────────────────
    const stats = {
      totalRestaurants,
      activeRestaurants,
      pendingRestaurants,
      suspendedRestaurants,
      totalRevenue,
      monthlyRevenue,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalStaff,
      activeStaff,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      growth,
      dailyAverage,
      todayRevenue,
      todayOrders,
    };

    console.log('✅ Dashboard stats fetched successfully');

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Get Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
};

// ============================================================
//  ─── GET RECENT ORDERS ──────────────────────────────────────
// ============================================================

export const getRecentOrders = async (req, res) => {
  try {
    console.log('📦 Fetching recent orders...');

    const { restaurantId, branchId, limit = 10 } = req.query;

    let filter = {};
    
    // ✅ Branch filter takes priority
    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      filter.branchId = branchId;
      console.log(`📍 Filtering recent orders by branch: ${branchId}`);
    } else if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      filter.restaurantId = restaurantId;
      console.log(`🏢 Filtering recent orders by restaurant: ${restaurantId}`);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 10)
      .lean();

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber || order._id.toString().slice(-6),
      customerName: order.customerName || 'Guest',
      total: order.total || 0,
      orderStatus: order.orderStatus || 'pending',
      orderType: order.orderType || 'dine-in',
      tableNumber: order.tableNumber || '',
      createdAt: order.createdAt,
      restaurantName: order.restaurantName || 'Unknown',
      branchName: order.branchName || 'Main',
    }));

    console.log(`✅ Found ${formattedOrders.length} recent orders`);

    res.status(200).json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('❌ Get Recent Orders Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent orders'
    });
  }
};

// ============================================================
//  ─── GET RECENT STAFF ───────────────────────────────────────
// ============================================================

export const getRecentStaff = async (req, res) => {
  try {
    console.log('👥 Fetching recent staff...');

    const { restaurantId, branchId, limit = 6 } = req.query;

    let filter = {};
    
    // ✅ Branch filter takes priority
    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      filter.branchId = branchId;
      console.log(`📍 Filtering recent staff by branch: ${branchId}`);
    } else if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      filter.restaurantId = restaurantId;
      console.log(`🏢 Filtering recent staff by restaurant: ${restaurantId}`);
    }

    const staff = await Staff.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 6)
      .lean();

    const formattedStaff = staff.map(member => ({
      _id: member._id,
      name: member.name || 'Unknown',
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || 'Staff',
      status: member.status || 'active',
      restaurantName: member.restaurantName || 'Unknown',
      branchName: member.branchName || 'Main',
      joinedAt: member.createdAt || member.joinedAt,
    }));

    console.log(`✅ Found ${formattedStaff.length} recent staff`);

    res.status(200).json({
      success: true,
      data: formattedStaff
    });
  } catch (error) {
    console.error('❌ Get Recent Staff Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent staff'
    });
  }
};

// ============================================================
//  ─── GET RECENT ACTIVITIES ──────────────────────────────────
// ============================================================

export const getRecentActivities = async (req, res) => {
  try {
    console.log('📊 Fetching recent activities...');

    const { restaurantId, branchId } = req.query;
    
    let restaurantFilter = {};
    let orderFilter = {};
    let staffFilter = {};
    let billFilter = { paymentStatus: 'paid' };
    
    // ✅ Branch filter takes priority
    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      orderFilter.branchId = branchId;
      staffFilter.branchId = branchId;
      billFilter.branchId = branchId;
      console.log(`📍 Filtering activities by branch: ${branchId}`);
    } else if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      restaurantFilter._id = restaurantId;
      orderFilter.restaurantId = restaurantId;
      staffFilter.restaurantId = restaurantId;
      billFilter.restaurantId = restaurantId;
      console.log(`🏢 Filtering activities by restaurant: ${restaurantId}`);
    }

    const activities = [];

    // ─── Recent Restaurants ──────────────────────────────────────────────
    const recentRestaurants = await Restaurant.find(restaurantFilter)
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    recentRestaurants.forEach(restaurant => {
      activities.push({
        _id: `restaurant_${restaurant._id}`,
        type: 'restaurant',
        message: `New restaurant "${restaurant.name}" registered`,
        restaurantName: restaurant.name,
        createdAt: restaurant.createdAt,
        status: restaurant.status,
      });
    });

    // ─── Recent Orders ──────────────────────────────────────────────────
    const recentOrders = await Order.find(orderFilter)
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    recentOrders.forEach(order => {
      activities.push({
        _id: `order_${order._id}`,
        type: 'order',
        message: `New order #${order.orderNumber || order._id.toString().slice(-6)} placed`,
        restaurantName: order.restaurantName || 'Unknown',
        branchName: order.branchName || 'Main',
        createdAt: order.createdAt,
        status: order.orderStatus,
      });
    });

    // ─── Recent Staff ────────────────────────────────────────────────────
    const recentStaff = await Staff.find(staffFilter)
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    recentStaff.forEach(staff => {
      activities.push({
        _id: `staff_${staff._id}`,
        type: 'staff',
        message: `New staff "${staff.name}" joined`,
        restaurantName: staff.restaurantName || 'Unknown',
        branchName: staff.branchName || 'Main',
        createdAt: staff.createdAt,
        status: staff.status,
      });
    });

    // ─── Recent Bills ────────────────────────────────────────────────────
    const recentBills = await Bill.find(billFilter)
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    recentBills.forEach(bill => {
      activities.push({
        _id: `payment_${bill._id}`,
        type: 'payment',
        message: `Payment of ₹${bill.total} received for bill ${bill.billNumber}`,
        restaurantName: bill.restaurantName || 'Unknown',
        branchName: bill.branchName || 'Main',
        createdAt: bill.createdAt,
        status: 'completed',
      });
    });

    // ─── Sort and Limit ──────────────────────────────────────────────────
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentActivities = activities.slice(0, 10);

    console.log(`✅ Found ${recentActivities.length} recent activities`);

    res.status(200).json({
      success: true,
      data: recentActivities
    });
  } catch (error) {
    console.error('❌ Get Recent Activities Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities'
    });
  }
};

// ============================================================
//  ─── GET REVENUE DATA ──────────────────────────────────────
// ============================================================

export const getRevenueData = async (req, res) => {
  try {
    console.log('📊 Fetching revenue data...');

    const { restaurantId, branchId } = req.query;
    
    let billFilter = { paymentStatus: 'paid' };
    
    // ✅ Branch filter takes priority
    if (branchId && branchId !== 'all' && branchId !== 'undefined' && branchId !== '') {
      billFilter.branchId = branchId;
      console.log(`📍 Filtering revenue data by branch: ${branchId}`);
    } else if (restaurantId && restaurantId !== 'all' && restaurantId !== 'undefined') {
      billFilter.restaurantId = restaurantId;
      console.log(`🏢 Filtering revenue data by restaurant: ${restaurantId}`);
    }

    const months = [];
    const revenueData = [];

    for (let i = 11; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthStart = month.clone().startOf('month').toDate();
      const monthEnd = month.clone().endOf('month').toDate();

      const monthBills = await Bill.find({
        ...billFilter,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }).lean();

      const total = monthBills.reduce((sum, bill) => sum + (bill.total || 0), 0);

      months.push(month.format('MMM'));
      revenueData.push({
        month: month.format('MMM'),
        amount: total,
      });
    }

    console.log(`✅ Revenue data for ${revenueData.length} months`);

    res.status(200).json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    console.error('❌ Get Revenue Data Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue data'
    });
  }
};