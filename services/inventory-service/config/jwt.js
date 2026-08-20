// config/jwt.js - COMPLETE FIXED VERSION

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

// ─── JWT Configuration ──────────────────────────────────────────────────
export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
export const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || '30d';

// ─── Token generation ──────────────────────────────────────────────────
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// ─── Token verification ──────────────────────────────────────────────────
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const decoded = jwt.decode(token);
      return { expired: true, decoded };
    }
    throw error;
  }
};

// ─── Decode token without verification ──────────────────────────────────
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};