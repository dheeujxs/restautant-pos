// scripts/fixStaffRoles.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/Role.js';
import Staff from '../models/Staff.js';

dotenv.config();

const CHEF_PERMISSIONS = [
  "view_dashboard",
  "view_live_orders",
  "view_order_details",
  "acknowledge_order",
  "start_cooking",
  "request_ready",
  "approve_ready",
  "reject_ready",
  "complete_order",
  "update_order_status",
  "view_kot",
  "update_kot",
  "print_kot",
  "view_inventory",
  "update_inventory"
];

async function fixStaffRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create or update Chef role
    let chefRole = await Role.findOne({ name: "Chef" });
    
    if (!chefRole) {
      chefRole = await Role.create({
        name: "Chef",
        description: "Head Chef - Full kitchen control",
        permissions: CHEF_PERMISSIONS,
        color: "#f97316",
        icon: "ChefHat",
        isActive: true
      });
      console.log('✅ Created Chef role');
    } else {
      chefRole.permissions = CHEF_PERMISSIONS;
      await chefRole.save();
      console.log('✅ Updated Chef role with permissions');
    }

    // 2. Find all staff with role name "Chef" (string) and update to ObjectId
    const staffToUpdate = await Staff.find({ role: { $type: "string" } });
    
    for (const staff of staffToUpdate) {
      // Update staff to use ObjectId reference
      staff.role = chefRole._id;
      await staff.save();
      console.log(`✅ Updated staff: ${staff.name} (${staff.employeeId})`);
    }

    // 3. Verify
    const updatedStaff = await Staff.find({ role: chefRole._id }).populate('role');
    console.log(`\n📋 ${updatedStaff.length} staff members updated:`);
    updatedStaff.forEach(s => {
      console.log(`   - ${s.name} (${s.employeeId}) → Role: ${s.role?.name}, Permissions: ${s.role?.permissions?.length || 0}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStaffRoles();