// Fires many bids at the SAME auction at the same moment and checks that nothing goes inconsistent.
// Usage: start the server (npm run dev), then in another terminal: npm --prefix server run stress
import mongoose from 'mongoose';
import { config } from '../config.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import AutoBid from '../models/AutoBid.js';
import { signToken } from '../middleware/auth.js';

const API = process.env.API_URL || `http://localhost:${config.port}`;
const N = Number(process.env.BIDDERS) || 20;
let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${msg}`);
  if (!ok) failures++;
};

async function setup() {
  const stamp = Date.now();
  const mk = (name, i) => User.create({ name, email: `stress${stamp}.${i}@${config.emailDomain}`, passwordHash: 'x', phone: '9000000000' });
  const seller = await mk('Stress Seller', 0);
  const bidders = [];
  for (let i = 1; i <= N; i++) bidders.push(await mk(`Bidder ${i}`, i));
  return { seller, bidders };
}

const newAuction = (seller, title) =>
  Auction.create({
    seller: seller._id, title, category: 'other', description: 'Concurrency test item', condition: 'good',
    photos: [], startPrice: 100, minIncrement: 10, currentPrice: 100,
    closesAt: new Date(Date.now() + 10 * 60_000), originalClosesAt: new Date(Date.now() + 10 * 60_000),
  });

const call = (auction, user, method, path, body) =>
  fetch(`${API}/api/auctions/${auction._id}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signToken(user._id)}` },
    body: JSON.stringify(body),
  }).then((r) => r.status);

async function main() {
  await mongoose.connect(config.mongoUri);
  const { seller, bidders } = await setup();
  const auctions = [];

  try {
    // ---- Test 1: N manual bids at once, each a different amount ----
    console.log(`\nTest 1: ${N} simultaneous manual bids (100 + 10 x i)`);
    const a1 = await newAuction(seller, 'Stress: manual bids');
    auctions.push(a1);
    const statuses = await Promise.all(bidders.map((u, i) => call(a1, u, 'POST', '/bids', { amount: 100 + (i + 1) * 10 })));
    const ok = statuses.filter((s) => s === 200).length;
    const rejected = statuses.filter((s) => s === 400).length;
    const other = statuses.length - ok - rejected;

    const bids = await Bid.find({ auction: a1._id }).sort({ _id: 1 });
    const fresh = await Auction.findById(a1._id);
    let strictly = true;
    for (let i = 0; i < bids.length; i++) {
      const min = i === 0 ? 100 : bids[i - 1].amount + 10;
      if (bids[i].amount < min) strictly = false;
    }
    const top = 100 + N * 10;
    console.log(`  ${ok} accepted, ${rejected} rejected (too low by the time they ran), ${other} other`);
    check(other === 0, 'every request got a clean 200 or 400 (no 500s, no conflicts)');
    check(bids.length === ok, 'one history row per accepted bid');
    check(strictly, 'every bid is at least previous + increment (history is consistent)');
    check(fresh.bidCount === bids.length, 'bidCount matches history');
    check(fresh.currentPrice === top, `final price is the highest bid (${top})`);
    check(String(fresh.leaderId) === String(bidders[N - 1]._id), 'leader is the highest bidder');
    check(bids[bids.length - 1].amount === fresh.currentPrice, 'last history row equals current price');

    // ---- Test 2: N automatic bids at once ----
    console.log(`\nTest 2: ${N} simultaneous maximums (200 + 50 x i)`);
    const a2 = await newAuction(seller, 'Stress: automatic bids');
    auctions.push(a2);
    const s2 = await Promise.all(bidders.map((u, i) => call(a2, u, 'PUT', '/auto-bid', { maxAmount: 200 + (i + 1) * 50 })));
    const bad = s2.filter((s) => s !== 200).length;
    const b2 = await Bid.find({ auction: a2._id }).sort({ _id: 1 });
    const f2 = await Auction.findById(a2._id);
    const expected = 200 + (N - 1) * 50 + 10; // second-highest max + increment
    let nondecreasing = true;
    for (let i = 1; i < b2.length; i++) if (b2[i].amount < b2[i - 1].amount) nondecreasing = false;
    check(bad === 0, 'all maximums accepted');
    check(String(f2.leaderId) === String(bidders[N - 1]._id), 'highest maximum leads');
    check(f2.currentPrice === expected, `price is second-highest max + increment (${expected}), got ${f2.currentPrice}`);
    check(nondecreasing, 'history never goes down');
    check(f2.bidCount === b2.length, 'bidCount matches history');
    check(f2.currentPrice <= 200 + N * 50, "price never exceeds the winner's maximum");
  } finally {
    if (!process.env.KEEP) {
      const ids = auctions.map((a) => a._id);
      await Bid.deleteMany({ auction: { $in: ids } });
      await AutoBid.deleteMany({ auction: { $in: ids } });
      await Auction.deleteMany({ _id: { $in: ids } });
      await User.deleteMany({ _id: { $in: [seller._id, ...bidders.map((b) => b._id)] } });
    }
    await mongoose.disconnect();
  }
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed.');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message.includes('fetch failed') ? 'Could not reach the API. Is the server running?' : e);
  process.exit(1);
});
