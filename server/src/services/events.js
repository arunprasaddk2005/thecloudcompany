import Bid from '../models/Bid.js';
import { notify } from './notify.js';
import { emitAuction, emitBrowse } from './realtime.js';

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const idOf = (x) => String(x?._id ?? x);
const quote = (title) => `“${title}”`;
const fire = (promise) => promise.catch((err) => console.error('Event job failed:', err.message));

async function bidderIds(auctionId) {
  return (await Bid.distinct('bidder', { auction: auctionId })).map(String);
}

/** After a bid is saved: update everyone watching, and alert whoever was outbid. */
export function publishBid(doc, out, autos, callerId) {
  const auctionId = String(doc._id);
  const closesAt = new Date(out.closesAt).toISOString();
  emitAuction(auctionId, 'bid:new', { auctionId, price: out.price, leaderId: out.leaderId, closesAt, extended: out.extended });
  if (out.extended) emitAuction(auctionId, 'auction:extended', { auctionId, closesAt, extensionCount: out.extensionCount });
  emitBrowse();

  const caller = String(callerId);
  const jobs = [];
  for (const uid of out.outbid) {
    if (uid === caller) continue; // the person who just bid already sees the result on screen
    const mine = autos.find((a) => a.bidder === uid);
    const message =
      mine && out.price >= mine.maxAmount
        ? `Your maximum of ${rupees(mine.maxAmount)} on ${quote(doc.title)} was passed. The price is now ${rupees(out.price)}.`
        : `You've been outbid on ${quote(doc.title)}. The price is now ${rupees(out.price)}.`;
    jobs.push(notify(uid, 'OUTBID', message, doc._id));
  }
  if (doc.bidCount === 0 && out.rows.length) {
    jobs.push(notify(doc.seller, 'NEW_BID', `First bid on ${quote(doc.title)}: ${rupees(out.price)}.`, doc._id));
  }
  fire(Promise.all(jobs));
}

/** After the sweeper closes an auction. `a` is the saved auction document. */
export function publishClosed(a) {
  const auctionId = String(a._id);
  emitAuction(auctionId, 'auction:closed', { auctionId, status: a.status });
  emitBrowse();

  fire(
    (async () => {
      const title = quote(a.title);
      if (a.status === 'UNSOLD') {
        await notify(a.seller, 'UNSOLD', `${title} closed with no bids. You can list it again.`, a._id);
        return;
      }
      const winner = idOf(a.winnerId);
      await notify(winner, 'WON', `You won ${title} at ${rupees(a.finalPrice)}. Waiting for the seller to approve the price.`, a._id);
      await notify(a.seller, 'NEEDS_DECISION', `${title} closed at ${rupees(a.finalPrice)}. Approve or reject the winning price.`, a._id);
      for (const uid of (await bidderIds(a._id)).filter((u) => u !== winner)) {
        await notify(uid, 'LOST', `${title} has ended and you did not win it.`, a._id);
      }
    })()
  );
}

/** After a seller action (approve, reject, handover, pickup failed, cancel). `a` is the populated auction. */
export function publishSaleChange(a, action) {
  const auctionId = String(a._id);
  emitAuction(auctionId, 'auction:updated', { auctionId, status: a.status });
  emitBrowse();

  fire(
    (async () => {
      const title = quote(a.title);
      const reason = a.outcomeReason ? ` Reason: ${a.outcomeReason}` : '';
      const winner = a.winnerId ? idOf(a.winnerId) : null;
      if (action === 'cancel') {
        const seller = idOf(a.seller);
        for (const uid of (await bidderIds(a._id)).filter((u) => u !== seller)) {
          await notify(uid, 'CANCELLED', `${title} was cancelled by the seller.${reason}`, a._id);
        }
        return;
      }
      if (!winner) return;
      const text = {
        approve: `The seller approved your price for ${title}. Contact them to arrange the campus pickup.`,
        reject: `The seller rejected the final price for ${title}.${reason}`,
        handover: `Handover confirmed. ${title} is yours.`,
        pickup_failed: `The pickup for ${title} was recorded as failed.${reason}`,
      }[action];
      if (text) await notify(winner, action.toUpperCase(), text, a._id);
    })()
  );
}
