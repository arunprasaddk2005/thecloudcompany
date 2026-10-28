import { Router } from 'express';
import mongoose from 'mongoose';
import Auction from '../models/Auction.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { withLock } from '../services/lock.js';
import { applyAction } from '../services/saleFlow.js';
import { HttpError } from '../utils/httpError.js';
import { publishSaleChange } from '../services/events.js';
import { publicAuction, populateAuction } from './auctions.js';

const router = Router();

const PATHS = {
  approve: 'approve',
  reject: 'reject',
  handover: 'handover',
  'pickup-failed': 'pickup_failed',
  cancel: 'cancel',
};

function checkId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Auction not found.' });
  next();
}

// Seller actions. They share the per-auction lock with bidding and the sweeper, so they can never interleave.
for (const [path, action] of Object.entries(PATHS)) {
  router.post(`/:id/${path}`, requireAuth, checkId, async (req, res, next) => {
    try {
      await withLock(req.params.id, async () => {
        const a = await Auction.findById(req.params.id).lean();
        if (!a) throw new HttpError(404, 'Auction not found.');
        const fields = applyAction(a, action, req.user._id, req.body?.reason);
        const updated = await Auction.findOneAndUpdate({ _id: a._id, status: a.status }, { $set: fields });
        if (!updated) throw new HttpError(409, 'The auction changed. Refresh and try again.');
      });
      const fresh = await populateAuction(Auction.findById(req.params.id));
      try {
        publishSaleChange(fresh, action);
      } catch (err) {
        console.error('publishSaleChange failed:', err.message);
      }
      res.json({ auction: publicAuction(fresh) });
    } catch (err) {
      next(err);
    }
  });
}

/**
 * Contact details are private. They are shared ONLY between the seller and the winner,
 * and only after the seller has approved the price.
 */
router.get('/:id/contact', requireAuth, checkId, async (req, res, next) => {
  try {
    const a = await Auction.findById(req.params.id).lean();
    if (!a) return res.status(404).json({ error: 'Auction not found.' });
    if (!['APPROVED', 'SOLD'].includes(a.status)) {
      return res.status(403).json({ error: 'Contact details are shared after the seller approves the price.' });
    }
    const me = String(req.user._id);
    const isSeller = String(a.seller) === me;
    const isWinner = a.winnerId && String(a.winnerId) === me;
    if (!isSeller && !isWinner) return res.status(403).json({ error: 'Only the seller and the winner can see this.' });

    const other = await User.findById(isSeller ? a.winnerId : a.seller, 'name phone').lean();
    res.json({ role: isSeller ? 'winner' : 'seller', name: other.name, phone: other.phone });
  } catch (err) {
    next(err);
  }
});

export default router;
