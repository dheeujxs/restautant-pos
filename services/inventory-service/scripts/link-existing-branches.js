// scripts/update-branch-stats.js
// Run this script to update branch stats with actual data

import mongoose from 'mongoose';
import Branch from '../models/super-admin/Branch.js';
import Restaurant from '../models/super-admin/Restaurant.js';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import Staff from '../models/Staff.js';

// Use your MongoDB Atlas connection string
const MONGODB_URI = "mongodb://goswamidheeraj760_db_user:XLQOnD28O1QRl2Tu@ac-5zarptw-shard-00-00.aegtvfg.mongodb.net:27017,ac-5zarptw-shard-00-01.aegtvfg.mongodb.net:27017,ac-5zarptw-shard-00-02.aegtvfg.mongodb.net:27017/?ssl=true&replicaSet=atlas-111bd0-shard-0&authSource=admin&appName=Cluster0";

async function updateBranchStats() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB Atlas\n');

    // Get all branches
    const branches = await Branch.find({}).lean();
    console.log(`📋 Found ${branches.length} branches\n`);

    let updatedCount = 0;

    for (const branch of branches) {
      console.log(`🏪 Processing branch: ${branch.name} (${branch._id})`);

      // ─── Count Orders for this branch ──────────────────────────────────
      let totalOrders = 0;
      try {
        // If orders have branchId field
        totalOrders = await Order.countDocuments({ branchId: branch._id });
      } catch (err) {
        // Try alternative: check if orders have branch field
        try {
          totalOrders = await Order.countDocuments({ branch: branch._id });
        } catch (err2) {
          console.log(`   ⚠️ Could not count orders for branch`);
        }
      }

      // ─── Count Tables for this branch ──────────────────────────────────
      let totalTables = 0;
      try {
        totalTables = await Table.countDocuments({ branchId: branch._id });
      } catch (err) {
        try {
          totalTables = await Table.countDocuments({ branch: branch._id });
        } catch (err2) {
          console.log(`   ⚠️ Could not count tables for branch`);
        }
      }

      // ─── Count Staff for this branch ──────────────────────────────────
      let totalStaff = 0;
      try {
        totalStaff = await Staff.countDocuments({ branchId: branch._id });
      } catch (err) {
        try {
          totalStaff = await Staff.countDocuments({ branch: branch._id });
        } catch (err2) {
          console.log(`   ⚠️ Could not count staff for branch`);
        }
      }

      console.log(`   📊 Orders: ${totalOrders}, Tables: ${totalTables}, Staff: ${totalStaff}`);

      // ─── Update branch stats ──────────────────────────────────────────
      await Branch.findByIdAndUpdate(branch._id, {
        $set: {
          'stats.totalOrders': totalOrders,
          'stats.totalTables': totalTables,
          'stats.totalEmployees': totalStaff,
        }
      });

      updatedCount++;
      console.log(`   ✅ Updated stats for ${branch.name}\n`);
    }

    console.log(`✅ Updated stats for ${updatedCount} branches`);

    // ─── Verify updates ──────────────────────────────────────────────────
    console.log('\n📊 Verification:');
    const updatedBranches = await Branch.find({}).lean();
    for (const b of updatedBranches) {
      console.log(`   ${b.name}: Orders=${b.stats?.totalOrders || 0}, Tables=${b.stats?.totalTables || 0}, Staff=${b.stats?.totalEmployees || 0}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateBranchStats();