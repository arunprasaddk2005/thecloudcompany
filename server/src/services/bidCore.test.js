import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBid } from './bidCore.js';

// ---- tiny in-memory auction harness (no database) ----
function makeAuction(over = {}) {
  return {
    auction: {
      seller: 'S', status: 'ACTIVE', startPrice: 1000, minIncrement: 50,
      currentPrice: 1000, leaderId: null, bidCount: 0,
      closesAt: 10_000_000, extensionCount: 0, ...over,
    },
    autos: [],
    rows: [],
    now: 1_000_000,
  };
}

function bid(sim, userId, kind, value, dt = 1000) {
  sim.now += dt;
  const input = kind === 'manual' ? { userId, kind, amount: value } : { userId, kind, maxAmount: value };
  const out = applyBid(sim.auction, sim.autos, input, sim.now);
  Object.assign(sim.auction, {
    currentPrice: out.price, leaderId: out.leaderId, bidCount: out.bidCount,
    closesAt: out.closesAt, extensionCount: out.extensionCount,
  });
  if (out.autoUpsert) {
    sim.autos = sim.autos.filter((a) => a.bidder !== userId).concat({ bidder: userId, maxAmount: out.autoUpsert.maxAmount, setAt: out.autoUpsert.setAt });
  }
  sim.rows.push(...out.rows);
  return out;
}

const summary = (sim) => ({ price: sim.auction.currentPrice, leader: sim.auction.leaderId });
const rowsOf = (out) => out.rows.map((r) => `${r.bidder} ${r.amount} ${r.type}`);

// ---- the worked example from PROJECT_PLAN.md section 7.3 ----
test('worked example (start 1000, increment 50)', () => {
  const sim = makeAuction();

  let out = bid(sim, 'A', 'auto', 1800);
  assert.deepEqual(summary(sim), { price: 1000, leader: 'A' });
  assert.deepEqual(rowsOf(out), ['A 1000 auto']);

  out = bid(sim, 'B', 'manual', 1200);
  assert.deepEqual(summary(sim), { price: 1250, leader: 'A' });
  assert.deepEqual(rowsOf(out), ['B 1200 manual', 'A 1250 auto']);

  out = bid(sim, 'C', 'auto', 2000);
  assert.deepEqual(summary(sim), { price: 1850, leader: 'C' });
  assert.deepEqual(rowsOf(out), ['A 1800 auto', 'C 1850 auto']);

  out = bid(sim, 'D', 'manual', 1900);
  assert.deepEqual(summary(sim), { price: 1950, leader: 'C' });
  assert.deepEqual(rowsOf(out), ['D 1900 manual', 'C 1950 auto']);

  // A raises their max to 2000: ties with C's 2000, C set it earlier so C keeps the lead at 2000
  out = bid(sim, 'A', 'auto', 2000);
  assert.deepEqual(summary(sim), { price: 2000, leader: 'C' });
  assert.deepEqual(rowsOf(out), ['C 2000 auto']);
});

test('first manual bid sets an exact price; first automatic bid starts at the start price', () => {
  const m = makeAuction();
  bid(m, 'A', 'manual', 1500);
  assert.deepEqual(summary(m), { price: 1500, leader: 'A' });

  const a = makeAuction();
  bid(a, 'A', 'auto', 1500);
  assert.deepEqual(summary(a), { price: 1000, leader: 'A' });
});

test('validation: minimums, own item, own max, closed auction', () => {
  const sim = makeAuction();
  assert.throws(() => bid(sim, 'A', 'manual', 999), /at least ₹1,000/);
  assert.throws(() => bid(sim, 'S', 'manual', 1000), /own item/);
  assert.throws(() => bid(sim, 'A', 'manual', 1000.5), /whole rupees/);
  bid(sim, 'A', 'manual', 1000);
  assert.throws(() => bid(sim, 'B', 'manual', 1049), /at least ₹1,050/);
  assert.throws(() => bid(sim, 'A', 'manual', 2000), /already the highest/);

  bid(sim, 'B', 'auto', 1500);
  assert.throws(() => bid(sim, 'B', 'auto', 1400), /only raise/);
  assert.throws(() => bid(sim, 'B', 'auto', 1500), /only raise/);

  sim.now = sim.auction.closesAt; // exactly at closing time
  assert.throws(() => applyBid(sim.auction, sim.autos, { userId: 'C', kind: 'manual', amount: 5000 }, sim.now), /closed/);
  assert.throws(() => applyBid({ ...sim.auction, status: 'PENDING_APPROVAL' }, sim.autos, { userId: 'C', kind: 'manual', amount: 5000 }, 5), /closed/);
});

test('manual bid equal to an earlier maximum: the earlier maximum keeps the lead', () => {
  const sim = makeAuction();
  bid(sim, 'A', 'auto', 2000);
  bid(sim, 'B', 'manual', 2000);
  assert.deepEqual(summary(sim), { price: 2000, leader: 'A' });
});

test('extension: bid in the last 30 s moves closing to 60 s after the bid', () => {
  const sim = makeAuction({ closesAt: 1_020_000 }); // 20 s from now=1_000_000 after first dt below
  sim.now = 1_000_000 - 1000; // bid() adds 1000
  const out = bid(sim, 'A', 'manual', 1000);
  assert.equal(out.extended, true);
  assert.equal(sim.auction.closesAt, sim.now + 60_000);
  assert.equal(sim.auction.extensionCount, 1);
});

test('extension: not triggered outside the window, at 31 s, or by a change-free max raise', () => {
  const far = makeAuction({ closesAt: 1_031_000 });
  far.now = 1_000_000 - 1000;
  assert.equal(bid(far, 'A', 'manual', 1000).extended, false); // 31 s left

  const edge = makeAuction({ closesAt: 1_030_000 });
  edge.now = 1_000_000 - 1000;
  assert.equal(bid(edge, 'A', 'manual', 1000).extended, true); // exactly 30 s left counts

  const raise = makeAuction({ closesAt: 1_500_000 });
  bid(raise, 'A', 'auto', 1500);
  raise.auction.closesAt = raise.now + 10_000; // now inside the last 30 s
  const out = bid(raise, 'A', 'auto', 1800, 0); // leader raises own max: nothing visible changes
  assert.equal(out.extended, false);
  assert.equal(out.rows.length, 0);
});

test('extension happens once per call even when several automatic raises happen', () => {
  const sim = makeAuction({ closesAt: 1_000_000 + 5000 });
  sim.now = 1_000_000 - 1000;
  bid(sim, 'A', 'auto', 1800);
  assert.equal(sim.auction.extensionCount, 1);
  sim.auction.closesAt = sim.now + 10_000;
  const out = bid(sim, 'B', 'auto', 1900); // triggers A-defend / B-take-over chain
  assert.ok(out.rows.length >= 2);
  assert.equal(sim.auction.extensionCount, 2); // one more, not one per row
});

test('outbid list contains everyone who lost the lead during the call', () => {
  const sim = makeAuction();
  bid(sim, 'A', 'auto', 1800);
  const out = bid(sim, 'B', 'manual', 1200); // B leads for a moment, A's auto takes it back
  assert.deepEqual(out.outbid, ['B']);
  const out2 = bid(sim, 'C', 'auto', 2000);
  assert.deepEqual(out2.outbid, ['A']);
});

// ---- randomized property test: the invariants must hold for ANY sequence of bids ----
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

test('invariants hold across 3000 random auctions', () => {
  const users = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let seed = 1; seed <= 3000; seed++) {
    const rand = rng(seed);
    const inc = [10, 25, 50][Math.floor(rand() * 3)];
    const sim = makeAuction({ startPrice: 100, currentPrice: 100, minIncrement: inc });
    const manualPrice = {};
    let accepted = 0;

    for (let step = 0; step < 25; step++) {
      const u = users[Math.floor(rand() * users.length)];
      const kind = rand() < 0.5 ? 'manual' : 'auto';
      const a = sim.auction;
      const minValid = a.bidCount === 0 ? a.startPrice : a.currentPrice + inc;
      const value = Math.max(1, minValid + Math.floor(rand() * 20 - 3) * Math.max(1, Math.floor(inc / 2)) + Math.floor(rand() * 5));

      try {
        const out = bid(sim, u, kind, value);
        accepted++;
        if (kind === 'manual') manualPrice[u] = value;
        assert.ok(out.rows.length > 0 || kind === 'auto');
      } catch (e) {
        if (e.status === undefined) throw e; // only HttpError rejections are acceptable
        continue;
      }

      const { currentPrice, leaderId, bidCount } = sim.auction;
      const last = sim.rows[sim.rows.length - 1];

      // 1. history and auction agree
      assert.equal(bidCount, sim.rows.length, `seed ${seed}: bidCount`);
      if (last) {
        assert.equal(currentPrice, last.amount, `seed ${seed}: price == last row`);
        assert.equal(leaderId, last.bidder, `seed ${seed}: leader == last row bidder`);
      }
      // 2. prices never go down
      for (let i = 1; i < sim.rows.length; i++) {
        assert.ok(sim.rows[i].amount >= sim.rows[i - 1].amount, `seed ${seed}: non-decreasing`);
      }
      // 3. nobody pays more than the leader agreed to
      const leaderAuto = sim.autos.find((x) => x.bidder === leaderId);
      const leaderCap = Math.max(leaderAuto?.maxAmount ?? 0, manualPrice[leaderId] ?? 0, 0);
      assert.ok(currentPrice <= leaderCap, `seed ${seed}: price ${currentPrice} within leader cap ${leaderCap}`);
      assert.ok(currentPrice >= sim.auction.startPrice, `seed ${seed}: price >= start`);
      // 4. nobody who could still win has been left behind
      for (const other of sim.autos) {
        if (other.bidder === leaderId) continue;
        assert.ok(
          other.maxAmount <= leaderCap || other.maxAmount < currentPrice + inc,
          `seed ${seed}: ${other.bidder} max ${other.maxAmount} should not beat leader cap ${leaderCap} at price ${currentPrice}`
        );
        assert.ok(other.maxAmount < currentPrice + inc || other.maxAmount <= leaderCap, `seed ${seed}: unresolved challenger`);
      }
    }
  }
});
