import { HttpError } from '../utils/httpError.js';
import { resolveProxy } from './proxy.js';

export const EXTEND_WINDOW_MS = 30_000; // a valid bid inside the last 30 s ...
export const EXTEND_TO_MS = 60_000; //     ... moves closing to 60 s after that bid

const MAX_AMOUNT = 10_000_000;
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function assertAmount(n, label) {
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, `Enter ${label} in whole rupees.`);
  if (n > MAX_AMOUNT) throw new HttpError(400, `${label[0].toUpperCase()}${label.slice(1)} is too large.`);
}

/**
 * Pure bid logic. No database, no clock: everything comes in as arguments.
 *
 * auction: { seller, status, startPrice, minIncrement, currentPrice, leaderId, bidCount, closesAt(ms), extensionCount }
 * autos:   [{ bidder, maxAmount, setAt(ms) }]   active automatic bids
 * input:   { userId, kind: 'manual'|'auto', amount?, maxAmount? }
 * now:     ms
 *
 * Returns the new auction fields, the bid rows to write, and the automatic bid to upsert.
 * Throws HttpError for any invalid bid.
 */
export function applyBid(auction, autos, input, now) {
  const uid = String(input.userId);

  if (auction.status !== 'ACTIVE' || auction.closesAt <= now) {
    throw new HttpError(409, 'Bidding has closed for this auction.');
  }
  if (String(auction.seller) === uid) throw new HttpError(403, "You can't bid on your own item.");

  const inc = auction.minIncrement;
  const hasBids = auction.bidCount > 0;
  const minValid = hasBids ? auction.currentPrice + inc : auction.startPrice;
  const leader = auction.leaderId ? String(auction.leaderId) : null;

  let entries = autos.map((a) => ({ bidder: String(a.bidder), max: a.maxAmount, setAt: a.setAt }));
  const own = entries.find((e) => e.bidder === uid);

  const rows = [];
  let state = null;
  let autoUpsert = null;

  if (input.kind === 'manual') {
    const amount = input.amount;
    assertAmount(amount, 'your bid');
    if (leader === uid) {
      throw new HttpError(409, 'You are already the highest bidder. Set a maximum bid if you want to raise your limit.');
    }
    if (amount < minValid) throw new HttpError(400, `Your bid must be at least ${rupees(minValid)}.`);

    rows.push({ bidder: uid, amount, type: 'manual' });
    // A manual bid is an exact price. If the bidder also has a higher automatic max, that max still protects them.
    state =
      own && own.max >= amount
        ? { price: amount, leader: uid, cap: own.max, capTime: own.setAt }
        : { price: amount, leader: uid, cap: amount, capTime: now };
  } else if (input.kind === 'auto') {
    const max = input.maxAmount;
    assertAmount(max, 'your maximum');

    if (own && max <= own.max) {
      throw new HttpError(400, `You can only raise your maximum. It is currently ${rupees(own.max)}.`);
    }
    if (leader === uid) {
      const curCap = own ? Math.max(own.max, auction.currentPrice) : auction.currentPrice;
      if (max <= curCap) {
        throw new HttpError(400, `Your maximum must be higher than ${rupees(curCap)}.`);
      }
    } else if (max < minValid) {
      throw new HttpError(400, `Your maximum must be at least ${rupees(minValid)}.`);
    }

    autoUpsert = { bidder: uid, maxAmount: max, setAt: now };
    entries = entries.filter((e) => e.bidder !== uid).concat({ bidder: uid, max, setAt: now });

    if (!hasBids) {
      rows.push({ bidder: uid, amount: auction.startPrice, type: 'auto' });
      state = { price: auction.startPrice, leader: uid, cap: max, capTime: now };
    } else if (leader === uid) {
      state = null; // raising your own max while leading changes nothing visible
    } else {
      const lead = entries.find((e) => e.bidder === leader);
      state =
        lead && lead.max >= auction.currentPrice
          ? { price: auction.currentPrice, leader, cap: lead.max, capTime: lead.setAt }
          : { price: auction.currentPrice, leader, cap: auction.currentPrice, capTime: now };
    }
  } else {
    throw new HttpError(400, 'Unknown bid type.');
  }

  let price = auction.currentPrice;
  let newLeader = leader;

  if (state) {
    const res = resolveProxy(state, entries, inc);
    rows.push(...res.rows);
    price = res.price;
    newLeader = res.leader;
  }

  // Last-minute extension: once per call, only when the bid changed something.
  let closesAt = auction.closesAt;
  let extensionCount = auction.extensionCount;
  let extended = false;
  if (rows.length > 0 && closesAt - now <= EXTEND_WINDOW_MS) {
    closesAt = now + EXTEND_TO_MS;
    extensionCount += 1;
    extended = true;
  }

  // Everyone who held the lead at some point during this call but doesn't now has been outbid.
  const outbid = new Set([leader, ...rows.map((r) => r.bidder)].filter(Boolean));
  outbid.delete(newLeader);

  return {
    price,
    leaderId: newLeader,
    bidCount: auction.bidCount + rows.length,
    closesAt,
    extensionCount,
    extended,
    rows,
    autoUpsert,
    outbid: [...outbid],
  };
}
