// controllers/super-admin/revenueController.js - Fixed with timezone handling

import Restaurant from '../../models/super-admin/Restaurant.js';
// Add this import at the top of revenueController.js
import Branch from '../../models/super-admin/Branch.js';
import Order from '../../models/Order.js';
import Bill from '../../models/Bill.js';
import moment from 'moment-timezone';

// ============================================================
//  ─── SUPER ADMIN REVENUE CONTROLLERS ────────────────────────
// ============================================================

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get platform-wide revenue overview
// @route   GET /api/super-admin/revenue/overview
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

// controllers/super-admin/revenueController.js - FIXED getRevenueOverview

export const getRevenueOverview = async (req, res) => {
  try {
    console.log('========================================');
    console.log('💰 REVENUE OVERVIEW REQUEST');
    console.log('========================================');
    
    const { period = 'month' } = req.query;
    console.log('📊 Period:', period);

    // ─── Date range based on period with timezone handling ──────────────
    const dateRange = getDateRange(period);
    const startOfDay = new Date(dateRange.start);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(dateRange.end);
    endOfDay.setHours(23, 59, 59, 999);
    
    // ─── Get all bills that are paid within the date range ──────────────
    const bills = await Bill.find({
      paymentStatus: 'paid',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    // ─── Also get completed orders that might not have bills ────────────
    const orders = await Order.find({
      orderStatus: 'completed',
      paymentStatus: 'paid',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    // ─── Combine bills and orders (deduplicate by orderId) ─────────────
    const orderIds = new Set();
    const allItems = [];

    bills.forEach(bill => {
      if (bill.orderId) {
        orderIds.add(bill.orderId.toString());
      }
      allItems.push({
        type: 'bill',
        data: bill,
        total: bill.total || 0,
        restaurantName: bill.restaurantName || '',
        orderType: bill.orderType || 'dine-in',
        createdAt: bill.createdAt,
        orderId: bill.orderId,
        restaurantId: bill.restaurantId,
        branchId: bill.branchId,        // ✅ ADD THIS
        branchName: bill.branchName,    // ✅ ADD THIS
      });
    });

    orders.forEach(order => {
      if (!orderIds.has(order._id.toString())) {
        allItems.push({
          type: 'order',
          data: order,
          total: order.total || 0,
          restaurantName: order.restaurantName || '',
          orderType: order.orderType || 'dine-in',
          createdAt: order.createdAt,
          orderId: order._id,
          restaurantId: order.restaurantId,
          branchId: order.branchId,        // ✅ ADD THIS
          branchName: order.branchName,    // ✅ ADD THIS
        });
      }
    });

    // ─── Get all restaurants ──────────────────────────────────────────────
    const restaurants = await Restaurant.find({ isActive: true }).lean();
    
    // ─── Get all branches ──────────────────────────────────────────────────
    const branches = await Branch.find({ isActive: true }).lean();

    // ─── Calculate restaurant revenue ────────────────────────────────────
    const restaurantRevenueMap = new Map();
    restaurants.forEach(r => {
      restaurantRevenueMap.set(r._id.toString(), {
        restaurantId: r._id,
        restaurantName: r.name,
        revenue: 0,
        orders: 0,
        commissionRate: r.commission?.rate || 10,
        commissionEarned: 0,
      });
    });

    // Process all items
    allItems.forEach(item => {
      let matchedRestaurant = null;
      let matchedKey = null;

      const itemRestaurantId = item.data?.restaurantId || item.restaurantId;
      if (itemRestaurantId) {
        const key = itemRestaurantId.toString();
        if (restaurantRevenueMap.has(key)) {
          matchedKey = key;
          matchedRestaurant = restaurantRevenueMap.get(key);
        }
      }

      if (!matchedRestaurant && item.restaurantName) {
        for (const [key, value] of restaurantRevenueMap) {
          const restaurantNameLower = value.restaurantName.toLowerCase();
          const itemRestaurantNameLower = item.restaurantName.toLowerCase();
          
          if (restaurantNameLower === itemRestaurantNameLower ||
              restaurantNameLower.includes(itemRestaurantNameLower) ||
              itemRestaurantNameLower.includes(restaurantNameLower)) {
            matchedKey = key;
            matchedRestaurant = value;
            break;
          }
        }
      }

      if (matchedRestaurant && matchedKey) {
        matchedRestaurant.revenue += (item.total || 0);
        matchedRestaurant.orders += 1;
      } else {
        const key = 'unassigned';
        if (!restaurantRevenueMap.has(key)) {
          restaurantRevenueMap.set(key, {
            restaurantId: 'unassigned',
            restaurantName: 'Unassigned Orders',
            revenue: 0,
            orders: 0,
            commissionRate: 10,
            commissionEarned: 0,
          });
        }
        const unassigned = restaurantRevenueMap.get(key);
        unassigned.revenue += (item.total || 0);
        unassigned.orders += 1;
      }
    });

    // Calculate commission for each restaurant
    const restaurantRevenue = Array.from(restaurantRevenueMap.values()).map(r => {
      r.commissionEarned = (r.revenue * r.commissionRate) / 100;
      return r;
    }).filter(r => r.revenue > 0 || r.orders > 0);

    // ─── ✅ NEW: Calculate branch breakdown ─────────────────────────────────
    const branchRevenueMap = new Map();
    
    // Initialize all branches with 0 revenue
    branches.forEach(b => {
      branchRevenueMap.set(b._id.toString(), {
        branchId: b._id,
        branchName: b.name,
        restaurantId: b.restaurantId?.toString() || 'unknown',
        restaurantName: '',
        revenue: 0,
        orders: 0,
        commissionEarned: 0,
      });
    });

    // Process items and add to branch revenue
    allItems.forEach(item => {
      const branchId = item.branchId?.toString() || null;
      let branchKey = null;
      
      if (branchId && branchRevenueMap.has(branchId)) {
        branchKey = branchId;
      } else {
        // Try to match by branchName if branchId doesn't match
        for (const [key, value] of branchRevenueMap) {
          if (value.branchName && item.branchName && 
              value.branchName.toLowerCase() === item.branchName.toLowerCase()) {
            branchKey = key;
            break;
          }
        }
      }
      
      if (branchKey) {
        const branch = branchRevenueMap.get(branchKey);
        branch.revenue += (item.total || 0);
        branch.orders += 1;
        // Find restaurant name for this branch
        const restaurant = restaurants.find(r => 
          r._id.toString() === branch.restaurantId
        );
        if (restaurant) {
          branch.restaurantName = restaurant.name;
        }
      } else if (item.branchName) {
        // If branch doesn't exist in our list, add it
        const newBranch = {
          branchId: 'unknown',
          branchName: item.branchName || 'Unknown Branch',
          restaurantId: item.restaurantId?.toString() || 'unknown',
          restaurantName: item.restaurantName || 'Unknown',
          revenue: item.total || 0,
          orders: 1,
          commissionEarned: (item.total || 0) * 0.1,
        };
        // Find restaurant name
        if (item.restaurantId) {
          const restaurant = restaurants.find(r => 
            r._id.toString() === item.restaurantId.toString()
          );
          if (restaurant) {
            newBranch.restaurantName = restaurant.name;
          }
        }
        branchRevenueMap.set('unknown_' + Date.now(), newBranch);
      }
    });

    // Convert to array and sort by revenue
    let branchBreakdown = Array.from(branchRevenueMap.values())
      .filter(b => b.revenue > 0 || b.orders > 0)
      .sort((a, b) => b.revenue - a.revenue);

    // If no branch data, at least show all branches with 0 revenue
    if (branchBreakdown.length === 0 && branches.length > 0) {
      branchBreakdown = branches.map(b => ({
        branchId: b._id.toString(),
        branchName: b.name,
        restaurantId: b.restaurantId?.toString() || 'unknown',
        restaurantName: '',
        revenue: 0,
        orders: 0,
        commissionEarned: 0,
      }));
    }

    // ─── Calculate totals ──────────────────────────────────────────────
    const totalRevenue = allItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalOrders = allItems.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // ─── Order type breakdown ──────────────────────────────────────────
    const dineIn = allItems.filter(item => item.orderType === 'dine-in');
    const takeaway = allItems.filter(item => item.orderType === 'takeaway');
    const delivery = allItems.filter(item => item.orderType === 'delivery');

    // ─── Platform commission ────────────────────────────────────────────
    const platformCommission = restaurantRevenue.reduce((sum, r) => sum + r.commissionEarned, 0);

    // ─── Daily breakdown ──────────────────────────────────────────────
    const dailyBreakdown = getDailyBreakdown(allItems, { start: startOfDay, end: endOfDay });

    // ─── Top performing restaurants ────────────────────────────────────
    const topRestaurants = [...restaurantRevenue]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ─── Top performing branches ──────────────────────────────────────
    const topBranches = [...branchBreakdown]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    console.log('💰 Final Revenue:', totalRevenue);
    console.log('📦 Total Orders:', totalOrders);
    console.log('📍 Branch Breakdown:', branchBreakdown.length);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          platformCommission,
          orderTypeBreakdown: {
            dineIn: {
              revenue: dineIn.reduce((sum, item) => sum + (item.total || 0), 0),
              orders: dineIn.length,
              percentage: totalOrders > 0 ? (dineIn.length / totalOrders) * 100 : 0,
            },
            takeaway: {
              revenue: takeaway.reduce((sum, item) => sum + (item.total || 0), 0),
              orders: takeaway.length,
              percentage: totalOrders > 0 ? (takeaway.length / totalOrders) * 100 : 0,
            },
            delivery: {
              revenue: delivery.reduce((sum, item) => sum + (item.total || 0), 0),
              orders: delivery.length,
              percentage: totalOrders > 0 ? (delivery.length / totalOrders) * 100 : 0,
            },
          },
        },
        restaurantBreakdown: restaurantRevenue,
        branchBreakdown: branchBreakdown,  // ✅ ADD THIS - CRITICAL!
        dailyBreakdown,
        topRestaurants,
        topBranches,  // ✅ ADD THIS
        period: {
          start: startOfDay,
          end: endOfDay,
          label: period,
        },
        filterInfo: {
          period: period,
          totalBillsInPeriod: bills.length,
          totalOrdersInPeriod: orders.length,
          itemsProcessed: allItems.length
        }
      },
    });
  } catch (error) {
    console.error('❌ Get Revenue Overview Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue overview',
    });
  }
};
// ──────────────────────────────────────────────────────────────────────────
// @desc    Get revenue analytics
// @route   GET /api/super-admin/revenue/analytics
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getRevenueAnalytics = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      restaurantId,
      groupBy = 'day'
    } = req.query;

    // FIX: Properly construct date filter with timezone handling
    let dateFilter = {};
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      dateFilter = {
        $gte: start,
        $lte: end
      };
    } else {
      const defaultStart = moment().subtract(30, 'days').startOf('day');
      dateFilter = {
        $gte: defaultStart.toDate(),
        $lte: new Date()
      };
    }

    console.log('📊 Analytics Date Filter:', dateFilter);

    const filter = {
      paymentStatus: 'paid',
      createdAt: dateFilter
    };

    // Get bills with filter
    let bills = await Bill.find(filter).lean();
    
    // Get completed orders without bills with filter
    const orderFilter = {
      orderStatus: 'completed',
      paymentStatus: 'paid',
      createdAt: dateFilter,
    };
    
    let orders = await Order.find(orderFilter).lean();
    
    // Combine and deduplicate
    const orderIds = new Set();
    let allItems = [];

    bills.forEach(bill => {
      if (bill.orderId) orderIds.add(bill.orderId.toString());
      allItems.push({
        total: bill.total || 0,
        restaurantName: bill.restaurantName || '',
        orderType: bill.orderType || 'dine-in',
        createdAt: bill.createdAt,
        orderId: bill.orderId,
        restaurantId: bill.restaurantId,
        data: bill
      });
    });

    orders.forEach(order => {
      if (!orderIds.has(order._id.toString())) {
        allItems.push({
          total: order.total || 0,
          restaurantName: order.restaurantName || '',
          orderType: order.orderType || 'dine-in',
          createdAt: order.createdAt,
          orderId: order._id,
          restaurantId: order.restaurantId,
          data: order
        });
      }
    });

    // Filter by restaurant properly
    if (restaurantId && restaurantId !== 'all') {
      const restaurant = await Restaurant.findById(restaurantId);
      if (restaurant) {
        allItems = allItems.filter(item => {
          // Try to match by restaurantId first
          if (item.restaurantId) {
            return item.restaurantId.toString() === restaurantId;
          }
          // Fallback to name matching
          return item.restaurantName && 
            item.restaurantName.toLowerCase().includes(restaurant.name.toLowerCase());
        });
      }
    }

    const groupedData = groupOrdersByPeriod(allItems, groupBy);
    const totalRevenue = allItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalOrders = allItems.length;

    // Previous period calculation
    const prevPeriodStart = moment(dateFilter.$gte).subtract(1, 'month');
    const prevPeriodEnd = dateFilter.$gte;
    
    const prevBills = await Bill.find({
      paymentStatus: 'paid',
      createdAt: { $gte: prevPeriodStart.toDate(), $lt: prevPeriodEnd }
    }).lean();
    
    const prevOrders = await Order.find({
      orderStatus: 'completed',
      paymentStatus: 'paid',
      createdAt: { $gte: prevPeriodStart.toDate(), $lt: prevPeriodEnd }
    }).lean();
    
    const prevOrderIds = new Set();
    const prevItems = [];

    prevBills.forEach(bill => {
      if (bill.orderId) prevOrderIds.add(bill.orderId.toString());
      prevItems.push({ total: bill.total || 0 });
    });

    prevOrders.forEach(order => {
      if (!prevOrderIds.has(order._id.toString())) {
        prevItems.push({ total: order.total || 0 });
      }
    });
    
    const prevRevenue = prevItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const revenueGrowth = prevRevenue > 0 
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
      : 0;

    const hourlyData = getHourlyData(allItems);
    const topItems = getTopItems(allItems);
    const customerSegments = getCustomerSegments(allItems);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        },
        timeline: groupedData,
        hourlyData,
        topItems,
        customerSegments,
        period: {
          start: dateFilter.$gte,
          end: dateFilter.$lte,
        },
        filterInfo: {
          startDate: dateFilter.$gte,
          endDate: dateFilter.$lte,
          restaurantId: restaurantId || 'all',
          groupBy: groupBy
        }
      },
    });
  } catch (error) {
    console.error('❌ Get Revenue Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics',
    });
  }
};

// ─── Helper: Get date range with timezone handling ──────────────────────
const getDateRange = (period) => {
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

  // Convert to Date objects
  const startDate = start.toDate();
  const endDate = end.toDate();
  
  // Adjust for local timezone
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  console.log('📍 Timezone offset:', moment().utcOffset());
  console.log('📍 Local time:', moment().format('YYYY-MM-DD HH:mm:ss'));
  console.log('📍 UTC time:', moment().utc().format('YYYY-MM-DD HH:mm:ss'));

  return { start: startDate, end: endDate };
};

// ... (rest of the helper functions remain the same)

// ─── Helper: Get daily breakdown for items ──────────────────────────────
const getDailyBreakdown = (items, dateRange) => {
  const days = moment(dateRange.end).diff(moment(dateRange.start), 'days');
  const breakdown = [];

  for (let i = 0; i <= days; i++) {
    const date = moment(dateRange.start).add(i, 'days');
    const dayItems = items.filter(item => 
      moment(item.createdAt || item.data?.createdAt).isSame(date, 'day')
    );
    breakdown.push({
      date: date.format('YYYY-MM-DD'),
      revenue: dayItems.reduce((sum, item) => sum + (item.total || 0), 0),
      orders: dayItems.length,
      averageOrderValue: dayItems.length > 0 
        ? dayItems.reduce((sum, item) => sum + (item.total || 0), 0) / dayItems.length 
        : 0,
    });
  }

  return breakdown;
};

// ─── Helper: Group orders by period ──────────────────────────────────────
const groupOrdersByPeriod = (items, groupBy) => {
  const grouped = {};

  items.forEach(item => {
    let key;
    const date = moment(item.createdAt || item.data?.createdAt);

    switch (groupBy) {
      case 'week':
        key = date.startOf('week').format('YYYY-MM-DD');
        break;
      case 'month':
        key = date.format('YYYY-MM');
        break;
      default:
        key = date.format('YYYY-MM-DD');
    }

    if (!grouped[key]) {
      grouped[key] = { revenue: 0, orders: 0, date: key };
    }
    grouped[key].revenue += item.total || 0;
    grouped[key].orders += 1;
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

// ─── Helper: Get hourly data ─────────────────────────────────────────────
const getHourlyData = (items) => {
  const hourly = {};
  
  for (let i = 0; i < 24; i++) {
    hourly[i] = { hour: i, orders: 0, revenue: 0 };
  }

  items.forEach(item => {
    const hour = moment(item.createdAt || item.data?.createdAt).hour();
    if (hourly[hour]) {
      hourly[hour].orders += 1;
      hourly[hour].revenue += item.total || 0;
    }
  });

  return Object.values(hourly);
};

// ─── Helper: Get top items ──────────────────────────────────────────────
const getTopItems = (items) => {
  const itemMap = {};

  items.forEach(item => {
    const orderItems = item.data?.items || [];
    orderItems.forEach(orderItem => {
      const key = orderItem.productId?.toString() || orderItem.productName;
      if (!itemMap[key]) {
        itemMap[key] = {
          name: orderItem.productName || 'Unknown',
          quantity: 0,
          revenue: 0,
          orders: 0,
        };
      }
      itemMap[key].quantity += orderItem.quantity || 1;
      itemMap[key].revenue += orderItem.totalPrice || 0;
      itemMap[key].orders += 1;
    });
  });

  return Object.values(itemMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
};

// ─── Helper: Get customer segments ──────────────────────────────────────
const getCustomerSegments = (items) => {
  const vipItems = items.filter(item => item.data?.isVip || false);
  const regularItems = items.filter(item => !item.data?.isVip);

  return {
    vip: {
      orders: vipItems.length,
      revenue: vipItems.reduce((sum, item) => sum + (item.total || 0), 0),
      averageOrderValue: vipItems.length > 0 
        ? vipItems.reduce((sum, item) => sum + (item.total || 0), 0) / vipItems.length 
        : 0,
    },
    regular: {
      orders: regularItems.length,
      revenue: regularItems.reduce((sum, item) => sum + (item.total || 0), 0),
      averageOrderValue: regularItems.length > 0 
        ? regularItems.reduce((sum, item) => sum + (item.total || 0), 0) / regularItems.length 
        : 0,
    },
  };
};

// ─── Helper: Generate report data ────────────────────────────────────────
const generateReportData = (items, restaurants, reportType) => {
  const totalRevenue = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalOrders = items.length;

  const restaurantPerformance = restaurants.map(r => {
    const restItems = items.filter(item => {
      if (item.restaurantId) {
        return item.restaurantId.toString() === r._id.toString();
      }
      return item.restaurantName && 
        item.restaurantName.toLowerCase().includes(r.name.toLowerCase());
    });
    const revenue = restItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const commissionRate = r.commission?.rate || 10;
    
    return {
      restaurantName: r.name,
      revenue,
      orders: restItems.length,
      commissionRate,
      commissionEarned: (revenue * commissionRate) / 100,
      averageOrderValue: restItems.length > 0 ? revenue / restItems.length : 0,
    };
  }).filter(r => r.revenue > 0);

  const dailyTrend = items.reduce((acc, item) => {
    const date = moment(item.createdAt || item.data?.createdAt).format('YYYY-MM-DD');
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, orders: 0 };
    }
    acc[date].revenue += item.total || 0;
    acc[date].orders += 1;
    return acc;
  }, {});

  return {
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      activeRestaurants: restaurantPerformance.length,
      reportType,
      generatedAt: new Date(),
    },
    restaurantPerformance,
    dailyTrend: Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date)),
  };
};

// ──────────────────────────────────────────────────────────────────────────
// @desc    Get revenue reports
// @route   GET /api/super-admin/revenue/reports
// @access  Private (Super Admin only)
// ──────────────────────────────────────────────────────────────────────────

export const getRevenueReports = async (req, res) => {
  try {
    const { 
      reportType = 'monthly',
      year,
      month,
      restaurantId 
    } = req.query;

    let dateFilter = {};
    const now = moment();

    switch (reportType) {
      case 'daily':
        if (year && month) {
          const day = moment(`${year}-${String(month).padStart(2, '0')}-01`, 'YYYY-MM-DD');
          const start = day.clone().startOf('month').toDate();
          const end = day.clone().endOf('month').toDate();
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          dateFilter = { $gte: start, $lte: end };
        } else {
          const start = now.clone().startOf('month').toDate();
          const end = now.clone().endOf('month').toDate();
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          dateFilter = { $gte: start, $lte: end };
        }
        break;
      case 'weekly':
        const weekStart = now.clone().startOf('week').toDate();
        const weekEnd = now.clone().toDate();
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);
        dateFilter = { $gte: weekStart, $lte: weekEnd };
        break;
      case 'monthly':
        if (year && month) {
          const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;
          const monthStart = moment(monthStr, 'YYYY-MM-DD');
          const start = monthStart.clone().startOf('month').toDate();
          const end = monthStart.clone().endOf('month').toDate();
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          dateFilter = { $gte: start, $lte: end };
        } else {
          const start = now.clone().startOf('month').toDate();
          const end = now.clone().endOf('month').toDate();
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          dateFilter = { $gte: start, $lte: end };
        }
        break;
      case 'yearly':
        const yearStart = moment(`${year || now.year()}-01-01`, 'YYYY-MM-DD');
        const start = yearStart.clone().startOf('year').toDate();
        const end = yearStart.clone().endOf('year').toDate();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        dateFilter = { $gte: start, $lte: end };
        break;
      default:
        const defaultStart = now.clone().startOf('month').toDate();
        const defaultEnd = now.clone().endOf('month').toDate();
        defaultStart.setHours(0, 0, 0, 0);
        defaultEnd.setHours(23, 59, 59, 999);
        dateFilter = { $gte: defaultStart, $lte: defaultEnd };
    }

    console.log('📊 Report Date Filter:', dateFilter);

    // Get bills with filter
    const bills = await Bill.find({
      paymentStatus: 'paid',
      createdAt: dateFilter,
    }).lean();

    // Get orders with filter
    const orders = await Order.find({
      orderStatus: 'completed',
      paymentStatus: 'paid',
      createdAt: dateFilter,
    }).lean();

    // Combine items
    const orderIds = new Set();
    let allItems = [];

    bills.forEach(bill => {
      if (bill.orderId) orderIds.add(bill.orderId.toString());
      allItems.push({
        total: bill.total || 0,
        restaurantName: bill.restaurantName || '',
        orderType: bill.orderType || 'dine-in',
        createdAt: bill.createdAt,
        data: bill,
        restaurantId: bill.restaurantId
      });
    });

    orders.forEach(order => {
      if (!orderIds.has(order._id.toString())) {
        allItems.push({
          total: order.total || 0,
          restaurantName: order.restaurantName || '',
          orderType: order.orderType || 'dine-in',
          createdAt: order.createdAt,
          data: order,
          restaurantId: order.restaurantId
        });
      }
    });

    const restaurants = await Restaurant.find({ isActive: true }).lean();

    // Apply restaurant filter properly
    if (restaurantId && restaurantId !== 'all') {
      const restaurant = restaurants.find(r => r._id.toString() === restaurantId);
      if (restaurant) {
        allItems = allItems.filter(item => {
          if (item.restaurantId) {
            return item.restaurantId.toString() === restaurantId;
          }
          return item.restaurantName && 
            item.restaurantName.toLowerCase().includes(restaurant.name.toLowerCase());
        });
      }
    }

    const reportData = generateReportData(allItems, restaurants, reportType);

    reportData.filterInfo = {
      reportType,
      year: year || now.year(),
      month: month || now.month() + 1,
      restaurantId: restaurantId || 'all',
      dateRange: dateFilter
    };

    res.status(200).json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error('❌ Get Revenue Reports Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate revenue reports',
    });
  }
};