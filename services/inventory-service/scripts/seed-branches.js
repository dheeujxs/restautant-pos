// scripts/fix-all-branch-names.js

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Bill from '../models/Bill.js';
import Staff from '../models/Staff.js';
import Table from '../models/Table.js';
import Branch from '../models/super-admin/Branch.js';
import Restaurant from '../models/super-admin/Restaurant.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixAllBranchNames() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ─── Get all branches ──────────────────────────────────────────────────
    const branches = await Branch.find().lean();
    console.log(`📍 Found ${branches.length} branches in database:\n`);
    
    // Create maps for quick lookup
    const branchIdMap = new Map();
    const branchNameMap = new Map();
    const branchNameLowerMap = new Map();
    
    branches.forEach(b => {
      branchIdMap.set(b._id.toString(), b);
      branchNameMap.set(b.name, b);
      branchNameLowerMap.set(b.name.toLowerCase(), b);
      console.log(`   - ${b.name} (${b._id}) ${b.isMainBranch ? '⭐ MAIN' : ''}`);
    });
    console.log('');

    // ─── Fix Orders ──────────────────────────────────────────────────────
    console.log('📦 Fixing orders...');
    const orders = await Order.find({}).lean();
    let ordersFixed = 0;
    let ordersSkipped = 0;

    for (const order of orders) {
      let needsUpdate = false;
      const updateData = {};
      
      // Fix root branch
      let correctBranch = null;
      
      // Check if root branch is wrong (lowercase 'vaishali' or wrong ID)
      if (order.branchName === 'vaishali' || order.branchId?.toString() === '6a4c870e5871e574d548941d') {
        // Try to get branch from items first
        if (order.items && order.items.length > 0) {
          const firstItem = order.items[0];
          if (firstItem.branchId) {
            correctBranch = branchIdMap.get(firstItem.branchId.toString());
          }
          if (!correctBranch && firstItem.branchName) {
            correctBranch = branchNameMap.get(firstItem.branchName) || branchNameLowerMap.get(firstItem.branchName.toLowerCase());
          }
        }
        
        // If still no branch, use the main branch
        if (!correctBranch) {
          correctBranch = branches.find(b => b.isMainBranch) || branches[0];
        }
        
        if (correctBranch) {
          updateData.branchId = correctBranch._id;
          updateData.branchName = correctBranch.name;
          updateData.restaurantId = correctBranch.restaurantId;
          needsUpdate = true;
        }
      }
      
      // Fix items
      if (order.items && order.items.length > 0) {
        const fixedItems = order.items.map(item => {
          let itemBranch = null;
          
          // Check if item has wrong branch
          if (item.branchName === 'vaishali' || item.branchId?.toString() === '6a4c870e5871e574d548941d') {
            // Try to find correct branch
            if (item.branchId) {
              itemBranch = branchIdMap.get(item.branchId.toString());
            }
            if (!itemBranch && item.branchName) {
              itemBranch = branchNameMap.get(item.branchName) || branchNameLowerMap.get(item.branchName.toLowerCase());
            }
            if (!itemBranch) {
              itemBranch = branches.find(b => b.isMainBranch) || branches[0];
            }
            
            return {
              ...item,
              branchId: itemBranch._id,
              branchName: itemBranch.name,
              restaurantId: itemBranch.restaurantId,
            };
          }
          return item;
        });
        
        updateData.items = fixedItems;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await Order.findByIdAndUpdate(order._id, { $set: updateData });
        ordersFixed++;
        console.log(`   ✅ Fixed order ${order.orderNumber}`);
      } else {
        ordersSkipped++;
      }
    }
    console.log(`   ✅ ${ordersFixed} orders fixed, ${ordersSkipped} skipped\n`);

    // ─── Fix Bills ──────────────────────────────────────────────────────
    console.log('💰 Fixing bills...');
    const bills = await Bill.find({}).lean();
    let billsFixed = 0;
    let billsSkipped = 0;

    for (const bill of bills) {
      let needsUpdate = false;
      const updateData = {};
      
      // Check if bill has wrong branch
      if (bill.branchName === 'vaishali' || bill.branchId?.toString() === '6a4c870e5871e574d548941d' || 
          bill.branchName === 'Main Branch' || bill.branchName === 'Unknown Branch') {
        
        let correctBranch = null;
        
        // Try to get branch from items
        if (bill.items && bill.items.length > 0) {
          const firstItem = bill.items[0];
          if (firstItem.branchId) {
            correctBranch = branchIdMap.get(firstItem.branchId.toString());
          }
          if (!correctBranch && firstItem.branchName) {
            correctBranch = branchNameMap.get(firstItem.branchName) || branchNameLowerMap.get(firstItem.branchName.toLowerCase());
          }
        }
        
        // If no branch from items, try to get from order
        if (!correctBranch && bill.orderId) {
          const order = await Order.findById(bill.orderId).lean();
          if (order && order.items && order.items.length > 0) {
            const firstItem = order.items[0];
            if (firstItem.branchId) {
              correctBranch = branchIdMap.get(firstItem.branchId.toString());
            }
            if (!correctBranch && firstItem.branchName) {
              correctBranch = branchNameMap.get(firstItem.branchName) || branchNameLowerMap.get(firstItem.branchName.toLowerCase());
            }
          }
        }
        
        // Use main branch as fallback
        if (!correctBranch) {
          correctBranch = branches.find(b => b.isMainBranch) || branches[0];
        }
        
        if (correctBranch) {
          updateData.branchId = correctBranch._id;
          updateData.branchName = correctBranch.name;
          updateData.restaurantId = correctBranch.restaurantId;
          needsUpdate = true;
        }
      }
      
      // Fix items in bill
      if (bill.items && bill.items.length > 0) {
        const fixedItems = bill.items.map(item => {
          let itemBranch = null;
          
          if (item.branchName === 'vaishali' || item.branchId?.toString() === '6a4c870e5871e574d548941d') {
            if (item.branchId) {
              itemBranch = branchIdMap.get(item.branchId.toString());
            }
            if (!itemBranch && item.branchName) {
              itemBranch = branchNameMap.get(item.branchName) || branchNameLowerMap.get(item.branchName.toLowerCase());
            }
            if (!itemBranch) {
              itemBranch = branches.find(b => b.isMainBranch) || branches[0];
            }
            
            return {
              ...item,
              branchId: itemBranch._id,
              branchName: itemBranch.name,
              restaurantId: itemBranch.restaurantId,
            };
          }
          return item;
        });
        
        updateData.items = fixedItems;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await Bill.findByIdAndUpdate(bill._id, { $set: updateData });
        billsFixed++;
        console.log(`   ✅ Fixed bill ${bill.billNumber}`);
      } else {
        billsSkipped++;
      }
    }
    console.log(`   ✅ ${billsFixed} bills fixed, ${billsSkipped} skipped\n`);

    // ─── Fix Staff ──────────────────────────────────────────────────────
    console.log('👤 Fixing staff...');
    const staff = await Staff.find({}).lean();
    let staffFixed = 0;
    let staffSkipped = 0;

    for (const s of staff) {
      if (s.branchName === 'vaishali' || s.branchId?.toString() === '6a4c870e5871e574d548941d' ||
          s.branchName === 'Main Branch' || s.branchName === 'Unknown Branch') {
        
        let correctBranch = branches.find(b => b.isMainBranch) || branches[0];
        
        await Staff.findByIdAndUpdate(s._id, {
          $set: {
            branchId: correctBranch._id,
            branchName: correctBranch.name,
            restaurantId: correctBranch.restaurantId,
          }
        });
        staffFixed++;
        console.log(`   ✅ Fixed staff ${s.name || s.email || s._id}`);
      } else {
        staffSkipped++;
      }
    }
    console.log(`   ✅ ${staffFixed} staff fixed, ${staffSkipped} skipped\n`);

    // ─── Fix Tables ──────────────────────────────────────────────────────
    console.log('🪑 Fixing tables...');
    const tables = await Table.find({}).lean();
    let tablesFixed = 0;
    let tablesSkipped = 0;

    for (const table of tables) {
      if (table.branchName === 'vaishali' || table.branchId?.toString() === '6a4c870e5871e574d548941d' ||
          table.branchName === 'Main Branch' || table.branchName === 'Unknown Branch') {
        
        let correctBranch = branches.find(b => b.isMainBranch) || branches[0];
        
        await Table.findByIdAndUpdate(table._id, {
          $set: {
            branchId: correctBranch._id,
            branchName: correctBranch.name,
            restaurantId: correctBranch.restaurantId,
          }
        });
        tablesFixed++;
        console.log(`   ✅ Fixed table ${table.number || table.name || table._id}`);
      } else {
        tablesSkipped++;
      }
    }
    console.log(`   ✅ ${tablesFixed} tables fixed, ${tablesSkipped} skipped\n`);

    // ─── Fix Restaurants (embedded branches) ──────────────────────────────
    console.log('🏪 Fixing restaurant embedded branches...');
    const restaurants = await Restaurant.find({}).lean();
    let restaurantsFixed = 0;

    for (const restaurant of restaurants) {
      if (restaurant.branches && restaurant.branches.length > 0) {
        let needsUpdate = false;
        const fixedBranches = restaurant.branches.map(b => {
          // Check if embedded branch has wrong name
          if (b.name === 'vaishali' || b.name === 'Main Branch' || b.name === 'Unknown Branch') {
            // Find the correct branch in Branch collection
            const correctBranch = branches.find(br => 
              br.restaurantId?.toString() === restaurant._id.toString() && 
              br.isMainBranch
            ) || branches.find(br => br.restaurantId?.toString() === restaurant._id.toString()) || branches[0];
            
            needsUpdate = true;
            return {
              ...b,
              name: correctBranch.name,
              phone: correctBranch.phone || b.phone,
              email: correctBranch.email || b.email,
              address: correctBranch.address || b.address,
            };
          }
          return b;
        });
        
        if (needsUpdate) {
          await Restaurant.findByIdAndUpdate(restaurant._id, {
            $set: { branches: fixedBranches }
          });
          restaurantsFixed++;
          console.log(`   ✅ Fixed restaurant ${restaurant.name}`);
        }
      }
    }
    console.log(`   ✅ ${restaurantsFixed} restaurants fixed\n`);

    // ─── Summary ──────────────────────────────────────────────────────────
    console.log('📊 FINAL SUMMARY:');
    console.log(`   ✅ Orders fixed: ${ordersFixed}`);
    console.log(`   ✅ Bills fixed: ${billsFixed}`);
    console.log(`   ✅ Staff fixed: ${staffFixed}`);
    console.log(`   ✅ Tables fixed: ${tablesFixed}`);
    console.log(`   ✅ Restaurants fixed: ${restaurantsFixed}`);
    console.log(`   📋 Total records fixed: ${ordersFixed + billsFixed + staffFixed + tablesFixed + restaurantsFixed}`);

    // ─── Verify the fix ──────────────────────────────────────────────────
    console.log('\n🔍 Verifying fix...');
    
    const wrongBranchId = '6a4c870e5871e574d548941d';
    
    const remainingOrders = await Order.countDocuments({
      $or: [
        { branchId: wrongBranchId },
        { branchName: 'vaishali' }
      ]
    });
    
    const remainingBills = await Bill.countDocuments({
      $or: [
        { branchId: wrongBranchId },
        { branchName: 'vaishali' }
      ]
    });
    
    const remainingStaff = await Staff.countDocuments({
      $or: [
        { branchId: wrongBranchId },
        { branchName: 'vaishali' }
      ]
    });
    
    const remainingTables = await Table.countDocuments({
      $or: [
        { branchId: wrongBranchId },
        { branchName: 'vaishali' }
      ]
    });
    
    console.log(`   Remaining orders with 'vaishali': ${remainingOrders}`);
    console.log(`   Remaining bills with 'vaishali': ${remainingBills}`);
    console.log(`   Remaining staff with 'vaishali': ${remainingStaff}`);
    console.log(`   Remaining tables with 'vaishali': ${remainingTables}`);
    
    if (remainingOrders + remainingBills + remainingStaff + remainingTables === 0) {
      console.log('✅ All data fixed successfully! All branches are now correct.');
    } else {
      console.log('⚠️ Some records still have wrong branch. Please run the script again.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

fixAllBranchNames();