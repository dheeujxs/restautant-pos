// scripts/debug-branches.js
// Run this to see what's actually in your database

import mongoose from 'mongoose';
import Branch from '../models/super-admin/Branch.js';
import Restaurant from '../models/super-admin/Restaurant.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';

async function debugBranches() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Check all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections in database:');
    collections.forEach(c => console.log(`   - ${c.name}`));
    console.log('');

    // 2. Check Branch collection
    const branchCount = await Branch.countDocuments();
    console.log(`📊 Branch collection: ${branchCount} documents`);
    
    if (branchCount > 0) {
      const sampleBranches = await Branch.find().limit(5).lean();
      console.log('📋 Sample branches:', JSON.stringify(sampleBranches, null, 2));
    } else {
      console.log('⚠️ No branches found in Branch collection');
      
      // Check if there's a different branch collection
      const allCollections = await mongoose.connection.db.listCollections().toArray();
      const branchCollections = allCollections.filter(c => 
        c.name.toLowerCase().includes('branch')
      );
      
      if (branchCollections.length > 0) {
        console.log('📋 Found branch-related collections:');
        branchCollections.forEach(c => console.log(`   - ${c.name}`));
      }
    }
    console.log('');

    // 3. Check Restaurant collection - branches field
    const restaurants = await Restaurant.find().lean();
    console.log(`📊 Restaurant collection: ${restaurants.length} restaurants`);
    
    restaurants.forEach((r, i) => {
      console.log(`\n🏪 Restaurant ${i + 1}: ${r.name}`);
      console.log(`   - ID: ${r._id}`);
      console.log(`   - Branches count in stats: ${r.stats?.totalBranches || 0}`);
      console.log(`   - Branches array length: ${r.branches?.length || 0}`);
      
      if (r.branches && r.branches.length > 0) {
        console.log(`   - Branches: ${r.branches.map(b => b.name).join(', ')}`);
      } else {
        console.log(`   - No branches in restaurant document`);
      }
    });

    // 4. Check if there are any documents with branch data in other collections
    console.log('\n🔍 Checking for branch data in other collections...');
    const allCollections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of allCollections) {
      if (collection.name === 'branches' || collection.name === 'branch') continue;
      
      const count = await mongoose.connection.db.collection(collection.name).countDocuments({
        $or: [
          { branch: { $exists: true } },
          { branches: { $exists: true } },
          { branchId: { $exists: true } },
          { branchName: { $exists: true } }
        ]
      });
      
      if (count > 0) {
        console.log(`   - ${collection.name}: found ${count} documents with branch data`);
        const sample = await mongoose.connection.db.collection(collection.name)
          .find({ $or: [{ branch: { $exists: true } }, { branches: { $exists: true } }] })
          .limit(1)
          .toArray();
        console.log(`     Sample: ${JSON.stringify(sample[0], null, 2)}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

debugBranches();