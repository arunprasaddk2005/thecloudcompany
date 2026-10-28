import { Router } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeNotification } from '../services/notify.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ _id: -1 }).limit(30),
      Notification.countDocuments({ user: req.user._id, readAt: null }),
    ]);
    res.json({ notifications: items.map(serializeNotification), unread });
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found.' });
    await Notification.updateOne({ _id: req.params.id, user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
