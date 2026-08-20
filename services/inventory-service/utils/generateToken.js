// utils/generateToken.js
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';

const generateToken = (id, role = 'user') => {
  console.log('🔑 Generating token for ID:', id, 'Role:', role);
  console.log('🔑 Using JWT_SECRET:', JWT_SECRET ? '✅ Present' : '❌ Missing');
  
  return jwt.sign(
    { 
      id: id.toString(), 
      role: role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export default generateToken;