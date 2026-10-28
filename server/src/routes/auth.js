import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import { config } from '../config.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address.')
    .refine((e) => e.endsWith(`@${config.emailDomain}`), `Use your @${config.emailDomain} email address.`),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1),
});

// The user sees their own phone; it is never included in public auction responses.
const selfView = (u) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone });

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { name, email, password, phone } = parsed.data;

    if (await User.exists({ email })) {
      return res.status(409).json({ error: 'An account with this email already exists. Log in instead.' });
    }
    const user = await User.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: signToken(user._id), user: selfView(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Enter your email and password.' });
    const user = await User.findOne({ email: parsed.data.email });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    res.json({ token: signToken(user._id), user: selfView(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: selfView(req.user) }));

export default router;
