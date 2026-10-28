import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { syncClock } from '../lib/clock.js';
import { formatINR } from '../lib/format.js';
import Countdown from '../components/Countdown.jsx';

const STATUS = {
  LEADING: ['You are leading', 'bg-mint text-pine-deep'],
  OUTBID: ['Outbid', 'bg-amber-soft text-ink'],
  WON_PENDING: ['You won. Waiting for the seller', 'bg-amber-soft text-ink'],
  WON_RESERVED: ['Reserved for you', 'bg-pine text-white'],
  WON: ['Yours. Sale complete', 'bg-pine-deep text-white'],
  REJECTED: ['Seller rejected the price', 'bg-brick-soft text-brick'],
  PICKUP_FAILED: ['Pickup failed', 'bg-brick-soft text-brick'],
  CANCELLED: ['Listing cancelled', 'bg-ink/10 text-ink/70'],
  LOST: ['Not won', 'bg-ink/10 text-ink/70'],
};

// Things that need attention first.
const ORDER = ['OUTBID', 'WON_RESERVED', 'WON_PENDING', 'LEADING', 'REJECTED', 'PICKUP_FAILED', 'WON', 'CANCELLED', 'LOST'];

export default function MyBids() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    syncClock();
    const load = () => api('/me/bids').then((d) => setItems(d.auctions)).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const sorted = items && [...items].sort((a, b) => ORDER.indexOf(a.myStatus) - ORDER.indexOf(b.myStatus));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-extrabold md:text-4xl">My bids</h1>
      {error && <p role="alert" className="mt-4 rounded-md bg-brick-soft px-3 py-2 text-brick">{error}</p>}
      {!items && !error && <p className="mt-6 text-ink/60">Loading...</p>}
      {items && items.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-ink/25 p-10 text-center">
          <p className="text-xl font-bold">You have not bid on anything yet.</p>
          <Link to="/" className="mt-2 inline-block font-semibold text-pine underline">Browse live auctions</Link>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {sorted?.map((a) => {
          const [label, tone] = STATUS[a.myStatus] || STATUS.LOST;
          return (
            <li key={a.id}>
              <Link to={`/auctions/${a.id}`} className="flex gap-4 rounded-xl border border-ink/10 bg-white p-3 hover:border-pine/60">
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-md bg-mint/50">
                  {a.photos[0] && <img src={a.photos[0]} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{a.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${tone}`}>{label}</span>
                    {a.status === 'ACTIVE' && <Countdown closesAt={a.closesAt} />}
                  </div>
                  {a.myMax && <p className="mt-1 text-sm text-ink/60">Your maximum: {formatINR(a.myMax)}</p>}
                </div>
                <div className="text-right">
                  <p className="num font-display text-xl font-extrabold text-pine-deep">{formatINR(a.finalPrice ?? a.currentPrice)}</p>
                  <p className="text-sm text-ink/60">{a.status === 'ACTIVE' ? 'Current price' : 'Final price'}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
