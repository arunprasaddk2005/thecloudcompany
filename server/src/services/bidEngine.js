import Auction from '../models/Auction.js';
import AutoBid from '../models/AutoBid.js';
import Bid from '../models/Bid.js';
import { HttpError } from '../utils/httpError.js';
import { withLock } from './lock.js';
import { applyBid } from './bidCore.js';
import { publishBid } from './events.js';

/**
 * The single entry point for every bid (manual bid, set/raise maximum, assistant-confirmed maximum).
 * Runs inside the per-auction lock, so bids on one auction are processed strictly one at a time.
 */
export function placeBid({ auctionId, userId, kind, amount, maxAmount }) {
  return withLock(String(auctionId), async () => {
    const now = Date.now(); // taken AFTER the lock is acquired, so waiting never lets a late bid through

    const doc = await Auction.findById(auctionId).lean();
    if (!doc) throw new HttpError(404, 'Auction not found.');
    const autoDocs = await AutoBid.find({ auction: doc._id, active: true }).lean();

    const auction = { ...doc, seller: String(doc.seller), closesAt: doc.closesAt.getTime() };
    const autos = autoDocs.map((a) => ({ bidder: String(a.bidder), maxAmount: a.maxAmount, setAt: a.setAt.getTime() }));

    const out = applyBid(auction, autos, { userId, kind, amount, maxAmount }, now);

    // Update the auction first, guarded by the bid count we read. If anything slipped in, this fails safely.
    const updated = await Auction.findOneAndUpdate(
      { _id: doc._id, status: 'ACTIVE', bidCount: doc.bidCount },
      {
        $set: {
          currentPrice: out.price,
          leaderId: out.leaderId,
          bidCount: out.bidCount,
          closesAt: new Date(out.closesAt),
          extensionCount: out.extensionCount,
        },
      }
    );
    if (!updated) throw new HttpError(409, 'The auction changed while your bid was processing. Please try again.');

    if (out.autoUpsert) {
      await AutoBid.findOneAndUpdate(
        { auction: doc._id, bidder: out.autoUpsert.bidder },
        { $set: { maxAmount: out.autoUpsert.maxAmount, setAt: new Date(out.autoUpsert.setAt), active: true } },
        { upsert: true }
      );
    }
    if (out.rows.length) {
      await Bid.insertMany(
        out.rows.map((r, i) => ({
          auction: doc._id,
          bidder: r.bidder,
          amount: r.amount,
          type: r.type,
          createdAt: new Date(now + i), // keeps rows from one call in order
        })),
        { ordered: true }
      );
    }

    // Live updates and alerts must never make a saved bid fail.
    try {
      publishBid(doc, out, autos, userId);
    } catch (err) {
      console.error('publishBid failed:', err.message);
    }
    return out;
  });
}
