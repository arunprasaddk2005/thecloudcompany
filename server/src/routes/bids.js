import { Router } from 'express';
import mongoose from 'mongoose';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import AutoBid from '../models/AutoBid.js';
import { requireAuth } from '../middleware/auth.js';
import { placeBid } from '../services/bidEngine.js';
import { publicAuction, populateAuction } from './auctions.js';

const router = Router();

const person = (p) => (p && p.name ? { id: String(p._id), name: p.name } : { id: String(p) });

/** Everything the auction page needs in one call. All bids and all maximums are public by design. */
async function bundle(id) {
  const auction = await populateAuction(Auction.findById(id));
  if (!auction) return null;
  const [bids, maxes] = await Promise.all([
    Bid.find({ auction: id }).populate('bidder', 'name').sort({ _id: -1 }).limit(200),
    AutoBid.find({ auction: id, active: true }).populate('bidder', 'name').sort({ maxAmount: -1, setAt: 1 }),
  ]);
  return {
    auction: publicAuction(auction),
    bids: bids.map((b) => ({ id: String(b._id), bidder: person(b.bidder), amount: b.amount, type: b.type, createdAt: b.createdAt })),
    maxes: maxes.map((m) => ({ bidder: person(m.bidder), maxAmount: m.maxAmount, setAt: m.setAt })),
    serverTime: Date.now(),
  };
}

function checkId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Auction not found.' });
  next();
}

router.get('/:id/bids', checkId, async (req, res, next) => {
  try {
    const data = await bundle(req.params.id);
    if (!data) return res.status(404).json({ error: 'Auction not found.' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/bids', requireAuth, checkId, async (req, res, next) => {
  try {
    const out = await placeBid({ auctionId: req.params.id, userId: req.user._id, kind: 'manual', amount: Number(req.body?.amount) });
    res.json({ ...(await bundle(req.params.id)), extended: out.extended });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/auto-bid', requireAuth, checkId, async (req, res, next) => {
  try {
    const out = await placeBid({ auctionId: req.params.id, userId: req.user._id, kind: 'auto', maxAmount: Number(req.body?.maxAmount) });
    res.json({ ...(await bundle(req.params.id)), extended: out.extended });
  } catch (err) {
    next(err);
  }
});

export default router;
