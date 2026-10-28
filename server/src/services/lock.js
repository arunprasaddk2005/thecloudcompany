// Per-key mutex. Bids for one auction run strictly one at a time; different auctions run in parallel.
// This is only correct with ONE Node process (see decision D2 in PROJECT_PLAN.md).
const tails = new Map();

export function withLock(key, fn) {
  const prev = tails.get(key) || Promise.resolve();
  const run = prev.then(() => fn());
  const tail = run.catch(() => {}); // a failed job must not block the queue
  tails.set(key, tail);
  tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return run;
}
