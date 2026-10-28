/**
 * Pure proxy-bidding resolution (no database, no clock).
 *
 * state:   { price, leader, cap, capTime }
 *            leader  = user id currently leading
 *            cap     = the most the leader is willing to pay (their max, or their manual price)
 *            capTime = when that cap was set (ms). Earlier wins ties.
 * entries: [{ bidder, max, setAt }]  every active automatic bid on the auction
 * increment: the auction's minimum increment
 *
 * Rules:
 *  - The highest max leads. Equal maxes: the one set earlier leads.
 *  - Price = min(winner's max, loser's max + increment).
 *  - Every price change is written as a row attributed to the user who holds the lead after it,
 *    so the bid history shows each automatic raise.
 */
export function resolveProxy(start, entries, increment) {
  let { price, leader, cap, capTime } = start;
  const rows = [];

  for (let guard = 0; guard < 100; guard++) {
    const o = entries
      .filter((e) => e.bidder !== leader)
      .sort((x, y) => y.max - x.max || x.setAt - y.setAt)[0];
    if (!o) break;

    const earlier = o.setAt < capTime;
    const tie = o.max === cap;
    const contests = o.max >= price + increment || (tie && earlier);
    if (!contests) break;

    if (o.max > cap) {
      // Challenger has the higher max and takes the lead.
      if (cap > price) rows.push({ bidder: leader, amount: cap, type: 'auto' }); // leader defended up to their max
      price = Math.min(o.max, cap + increment);
      rows.push({ bidder: o.bidder, amount: price, type: 'auto' });
      leader = o.bidder;
      cap = o.max;
      capTime = o.setAt;
    } else if (tie) {
      // Equal maxes: the earlier one leads, at that amount.
      if (earlier) {
        leader = o.bidder;
        capTime = o.setAt;
      }
      price = cap;
      rows.push({ bidder: leader, amount: price, type: 'auto' });
      break;
    } else {
      // Leader's max is higher and defends.
      rows.push({ bidder: o.bidder, amount: o.max, type: 'auto' }); // challenger reached their max
      price = Math.min(cap, o.max + increment);
      rows.push({ bidder: leader, amount: price, type: 'auto' });
    }
  }
  return { price, leader, cap, capTime, rows };
}
