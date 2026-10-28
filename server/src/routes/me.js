import { Router } from 'express';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import AutoBid from '../models/AutoBid.js';
import { requireAuth } from '../middleware/auth.js';
import { publicAuction, populateAuction } from './auctions.js';
import { myBidStatus } from '../services/saleFlow.js';

const router = Router();

router.get('/listings', requireAuth, async (req, res, next) => {
  try {
    const items = await populateAuction(Auction.find({ seller: req.user._id })).sort({ createdAt: -1 });
    res.json({ auctions: items.map(publicAuction) });
  } catch (err) {
    next(err);
  }
});

// Every auction the user has bid on or set a maximum for, with their position in it.
router.get('/bids', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user._id;
    const [bidIds, autoIds] = await Promise.all([
      Bid.distinct('auction', { bidder: uid }),
      AutoBid.distinct('auction', { bidder: uid, active: true }),
    ]);
    const ids = [...new Set([...bidIds, ...autoIds].map(String))];
    const [items, myMaxes] = await Promise.all([
      populateAuction(Auction.find({ _id: { $in: ids } })).sort({ closesAt: -1 }),
      AutoBid.find({ bidder: uid, auction: { $in: ids } }).lean(),
    ]);
    const maxByAuction = Object.fromEntries(myMaxes.map((m) => [String(m.auction), m.maxAmount]));
    res.json({
      auctions: items.map((a) => ({
        ...publicAuction(a),
        myStatus: myBidStatus(a, uid),
        myMax: maxByAuction[String(a._id)] ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
