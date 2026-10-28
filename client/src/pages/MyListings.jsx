import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { syncClock } from '../lib/clock.js';
import { useNotifications } from '../lib/Notifications.jsx';
import { formatINR } from '../lib/format.js';
import Countdown from '../components/Countdown.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MyListings() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const { version } = useNotifications(); // a new alert means something changed: refresh

  useEffect(() => {
    syncClock();
    const load = () => api('/me/listings').then((d) => setItems(d.auctions)).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 10000); // statuses change as auctions close
    return () => clearInterval(t);
  }, [version]);

  // Listings that need a decision come first.
  const rank = { PENDING_APPROVAL: 0, APPROVED: 1, ACTIVE: 2 };
  const sorted = items && [...items].sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold md:text-4xl">My listings</h1>
        <Link to="/sell" className="btn-primary">Sell an item</Link>
      </div>

      {error && <p role="alert" className="mt-4 rounded-md bg-brick-soft px-3 py-2 text-brick">{error}</p>}
      {!items && !error && <p className="mt-6 text-ink/60">Loading...</p>}
      {items && items.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-ink/25 p-10 text-center">
          <p className="text-xl font-bold">You have not listed anything yet.</p>
          <p className="mt-1 text-ink/70">Leaving campus? List your cycle, calculator or books for juniors to bid on.</p>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {sorted?.map((a) => (
          <li key={a.id}>
            <Link to={`/auctions/${a.id}`} className="flex gap-4 rounded-xl border border-ink/10 bg-white p-3 hover:border-pine/60">
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-md bg-mint/50">
                {a.photos[0] && <img src={a.photos[0]} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{a.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={a.status} />
                  {a.status === 'ACTIVE' && <Countdown closesAt={a.closesAt} />}
                </div>
                {a.status === 'PENDING_APPROVAL' && (
                  <p className="mt-1 text-sm font-semibold text-brick">Needs your decision: {a.winner?.name} won at {formatINR(a.finalPrice)}</p>
                )}
                {a.status === 'APPROVED' && <p className="mt-1 text-sm font-semibold text-pine">Reserved for {a.winner?.name}. Confirm the handover when done.</p>}
              </div>
              <div className="text-right">
                <p className="num font-display text-xl font-extrabold text-pine-deep">{formatINR(a.currentPrice)}</p>
                <p className="text-sm text-ink/60">{a.bidCount === 1 ? '1 bid' : `${a.bidCount} bids`}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
