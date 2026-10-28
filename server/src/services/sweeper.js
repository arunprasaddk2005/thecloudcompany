import Auction from '../models/Auction.js';
import { withLock } from './lock.js';

/** Closes one auction whose time has passed. Runs inside the auction's lock. */
async function closeAuction(id) {
  const a = await Auction.findById(id);
  // Re-check inside the lock: a last-second bid may have extended the closing time.
  if (!a || a.status !== 'ACTIVE' || a.closesAt.getTime() > Date.now()) return null;

  if (a.bidCount === 0) {
    a.status = 'UNSOLD';
    a.outcome = 'UNSOLD';
    a.outcomeReason = 'Nobody placed a bid.';
  } else {
    a.status = 'PENDING_APPROVAL'; // highest valid bid is the provisional winner; the seller decides next
    a.winnerId = a.leaderId;
    a.finalPrice = a.currentPrice;
  }
  await a.save();
  return a;
}

export async function sweepOnce() {
  const due = await Auction.find({ status: 'ACTIVE', closesAt: { $lte: new Date() } }, '_id').lean();
  const closed = [];
  for (const { _id } of due) {
    const a = await withLock(String(_id), () => closeAuction(_id));
    if (a) closed.push(a);
  }
  return closed;
}

/** Checks for expired auctions every second. The bid path also checks time, so a late bid is rejected even before this runs. */
export function startSweeper(intervalMs = 1000, onClosed = () => {}) {
  let running = false;
  return setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const closed = await sweepOnce();
      closed.forEach(onClosed);
    } catch (err) {
      console.error('Sweeper error:', err.message);
    } finally {
      running = false;
    }
  }, intervalMs);
}
