import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User.js';

const promote = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const user = await User.findOneAndUpdate(
      { email: 'dheeraj@gmail.com' },
      { $set: { role: 'admin', isAdmin: true } },
      { new: true }
    );
    
    if (user) {
      console.log('✅ Promoted successfully:');
      console.log('📧 Email:', user.email);
      console.log('🎭 Role:', user.role);
      console.log('👑 isAdmin:', user.isAdmin);
    } else {
      console.log('❌ User not found with email: dheeraj@gmail.com');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

promote();