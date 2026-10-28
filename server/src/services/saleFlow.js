import { HttpError } from '../utils/httpError.js';

/**
 * The sale state machine (pure, no database).
 *
 *   ACTIVE ──(sweeper)──► UNSOLD | PENDING_APPROVAL
 *   PENDING_APPROVAL ──approve──► APPROVED ──handover──► SOLD
 *                    └─reject───► REJECTED   └─pickup-failed─► PICKUP_FAILED
 *   ACTIVE | PENDING_APPROVAL | APPROVED ──cancel──► CANCELLED
 *
 * Every terminal state stores an outcome and a reason, shown on the auction page.
 */
const RULES = {
  approve: { from: ['PENDING_APPROVAL'], to: 'APPROVED', outcome: null, defaultReason: null, verb: 'approved' },
  reject: { from: ['PENDING_APPROVAL'], to: 'REJECTED', outcome: 'REJECTED', defaultReason: 'The seller rejected the winning price.', verb: 'rejected' },
  handover: { from: ['APPROVED'], to: 'SOLD', outcome: 'SOLD', defaultReason: 'Handover confirmed on campus.', verb: 'marked as handed over' },
  pickup_failed: { from: ['APPROVED'], to: 'PICKUP_FAILED', outcome: 'PICKUP_FAILED', defaultReason: 'The pickup did not happen.', verb: 'marked as a failed pickup' },
  cancel: { from: ['ACTIVE', 'PENDING_APPROVAL', 'APPROVED'], to: 'CANCELLED', outcome: 'CANCELLED', defaultReason: 'Cancelled by the seller.', verb: 'cancelled' },
};

export const ACTIONS = Object.keys(RULES);

const STATE_WORDS = {
  ACTIVE: 'still live',
  PENDING_APPROVAL: 'waiting for your approval',
  APPROVED: 'reserved for the winner',
  SOLD: 'already sold',
  UNSOLD: 'unsold',
  REJECTED: 'already rejected',
  CANCELLED: 'already cancelled',
  PICKUP_FAILED: 'already closed as a failed pickup',
};

/** Returns the fields to write, or throws an HttpError. Only the seller may act. */
export function applyAction(auction, action, userId, reason) {
  const rule = RULES[action];
  if (!rule) throw new HttpError(400, 'Unknown action.');
  if (String(auction.seller) !== String(userId)) throw new HttpError(403, 'Only the seller can do this.');
  if (!rule.from.includes(auction.status)) {
    throw new HttpError(409, `This auction is ${STATE_WORDS[auction.status] || auction.status.toLowerCase()}, so it can't be ${rule.verb}.`);
  }
  const clean = String(reason || '').trim().slice(0, 200);
  return {
    status: rule.to,
    outcome: rule.outcome,
    outcomeReason: rule.outcome ? clean || rule.defaultReason : null,
  };
}

/** What the logged-in user's relationship to an auction is, for the My Bids page. */
export function myBidStatus(auction, userId) {
  const me = String(userId);
  const leader = auction.leaderId ? String(auction.leaderId._id || auction.leaderId) : null;
  const winner = auction.winnerId ? String(auction.winnerId._id || auction.winnerId) : null;
  switch (auction.status) {
    case 'ACTIVE': return leader === me ? 'LEADING' : 'OUTBID';
    case 'PENDING_APPROVAL': return winner === me ? 'WON_PENDING' : 'LOST';
    case 'APPROVED': return winner === me ? 'WON_RESERVED' : 'LOST';
    case 'SOLD': return winner === me ? 'WON' : 'LOST';
    case 'REJECTED': return winner === me ? 'REJECTED' : 'LOST';
    case 'PICKUP_FAILED': return winner === me ? 'PICKUP_FAILED' : 'LOST';
    case 'CANCELLED': return 'CANCELLED';
    default: return 'LOST';
  }
}
