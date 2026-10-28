import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, myBidStatus } from './saleFlow.js';

const auction = (status, extra = {}) => ({ seller: 'S', status, ...extra });

test('happy path: pending to approved to sold', () => {
  assert.deepEqual(applyAction(auction('PENDING_APPROVAL'), 'approve', 'S'), { status: 'APPROVED', outcome: null, outcomeReason: null });
  const sold = applyAction(auction('APPROVED'), 'handover', 'S');
  assert.equal(sold.status, 'SOLD');
  assert.equal(sold.outcome, 'SOLD');
});

test('rejection, failed pickup and cancellation each record an outcome and a reason', () => {
  assert.deepEqual(applyAction(auction('PENDING_APPROVAL'), 'reject', 'S', 'too low'), { status: 'REJECTED', outcome: 'REJECTED', outcomeReason: 'too low' });
  assert.equal(applyAction(auction('APPROVED'), 'pickup_failed', 'S').outcomeReason, 'The pickup did not happen.');
  for (const s of ['ACTIVE', 'PENDING_APPROVAL', 'APPROVED']) {
    const r = applyAction(auction(s), 'cancel', 'S', '  changed my mind  ');
    assert.deepEqual(r, { status: 'CANCELLED', outcome: 'CANCELLED', outcomeReason: 'changed my mind' });
  }
});

test('only the seller can act', () => {
  assert.throws(() => applyAction(auction('PENDING_APPROVAL'), 'approve', 'W'), /Only the seller/);
});

test('actions are only allowed from the right state', () => {
  assert.throws(() => applyAction(auction('ACTIVE'), 'approve', 'S'), /can't be approved/);
  assert.throws(() => applyAction(auction('PENDING_APPROVAL'), 'handover', 'S'), /can't be marked as handed over/);
  assert.throws(() => applyAction(auction('SOLD'), 'cancel', 'S'), /already sold/);
  assert.throws(() => applyAction(auction('REJECTED'), 'approve', 'S'), /already rejected/);
  assert.throws(() => applyAction(auction('UNSOLD'), 'reject', 'S'), /can't be rejected/);
  assert.throws(() => applyAction(auction('CANCELLED'), 'cancel', 'S'), /already cancelled/);
  assert.throws(() => applyAction(auction('APPROVED'), 'approve', 'S'), /can't be approved/);
});

test('long reasons are trimmed to 200 characters', () => {
  assert.equal(applyAction(auction('APPROVED'), 'pickup_failed', 'S', 'x'.repeat(500)).outcomeReason.length, 200);
});

test('my bids status', () => {
  assert.equal(myBidStatus({ status: 'ACTIVE', leaderId: 'U' }, 'U'), 'LEADING');
  assert.equal(myBidStatus({ status: 'ACTIVE', leaderId: 'V' }, 'U'), 'OUTBID');
  assert.equal(myBidStatus({ status: 'PENDING_APPROVAL', winnerId: 'U' }, 'U'), 'WON_PENDING');
  assert.equal(myBidStatus({ status: 'APPROVED', winnerId: 'U' }, 'U'), 'WON_RESERVED');
  assert.equal(myBidStatus({ status: 'SOLD', winnerId: 'U' }, 'U'), 'WON');
  assert.equal(myBidStatus({ status: 'SOLD', winnerId: 'V' }, 'U'), 'LOST');
  assert.equal(myBidStatus({ status: 'REJECTED', winnerId: 'U' }, 'U'), 'REJECTED');
  assert.equal(myBidStatus({ status: 'CANCELLED', winnerId: null }, 'U'), 'CANCELLED');
  assert.equal(myBidStatus({ status: 'SOLD', winnerId: { _id: 'U' } }, 'U'), 'WON'); // populated documents work too
});
