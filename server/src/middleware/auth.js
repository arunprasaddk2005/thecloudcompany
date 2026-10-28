import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config.js';

export function signToken(userId) {
  return jwt.sign({ id: String(userId) }, config.jwtSecret, { expiresIn: '7d' });
}

async function userFromHeader(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, config.jwtSecret);
    return await User.findById(id);
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  try {
    const user = await userFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Please log in to continue.' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    req.user = await userFromHeader(req);
    next();
  } catch (err) {
    next(err);
  }
}
