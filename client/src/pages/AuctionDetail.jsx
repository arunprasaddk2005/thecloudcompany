import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { syncClock, serverNow } from '../lib/clock.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { categoryLabel, conditionLabel, formatDateTime, formatINR, nextMinBid } from '../lib/format.js';
import Countdown from '../components/Countdown.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import BidPanel from '../components/BidPanel.jsx';
import BidHistory from '../components/BidHistory.jsx';
import SellerActions from '../components/SellerActions.jsx';
import SaleStatus from '../components/SaleStatus.jsx';

export default function AuctionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(0);
  const [extendedFlash, setExtendedFlash] = useState(false);
  const prevClose = useRef(null);

  const load = useCallback(
    async (initial) => {
      try {
        setBundle(await api(`/auctions/${id}/bids`));
      } catch (e) {
        if (initial) setError(e.message); // later poll failures are ignored; the next poll retries
      }
    },
    [id]
  );

  // Live updates by polling every 2 s (Phase 4 replaces this with sockets).
  useEffect(() => {
    syncClock();
    load(true);
    const t = setInterval(() => load(false), 2000);
    return () => clearInterval(t);
  }, [load]);

  const auction = bundle?.auction;
  useEffect(() => {
    if (!auction) return;
    const closes = new Date(auction.closesAt).getTime();
    if (prevClose.current && closes > prevClose.current && auction.status === 'ACTIVE') {
      setExtendedFlash(true);
      setTimeout(() => setExtendedFlash(false), 8000);
    }
    prevClose.current = closes;
  }, [auction]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p role="alert" className="rounded-md bg-brick-soft px-3 py-2 text-brick">{error}</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-pine underline">Back to browse</Link>
      </main>
    );
  }
  if (!bundle) return <main className="mx-auto max-w-6xl px-4 py-12 text-ink/60">Loading...</main>;

  const a = auction;
  const isSeller = user && user.id === a.seller.id;
  const live = a.status === 'ACTIVE' && new Date(a.closesAt).getTime() > serverNow();
  const closing = a.status === 'ACTIVE' && !live;
  const hasBids = a.bidCount > 0;
  const showPrice = a.finalPrice ?? a.currentPrice;
  const setAuction = (next) => setBundle((b) => ({ ...b, auction: next }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" className="text-base font-semibold text-pine underline">Back to browse</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <section>
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-ink/10 bg-mint/50">
            {a.photos[photo] && <img src={a.photos[photo]} alt={a.title} className="h-full w-full object-contain" />}
          </div>
          {a.photos.length > 1 && (
            <div className="mt-3 flex gap-2">
              {a.photos.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPhoto(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={i === photo}
                  className={`h-16 w-20 overflow-hidden rounded-md border-2 ${i === photo ? 'border-pine' : 'border-transparent'}`}
                >
                  <img src={p} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <h1 className="mt-6 text-3xl font-extrabold md:text-4xl">{a.title}</h1>
          <p className="mt-2 text-lg text-ink/70">
            {categoryLabel(a.category)}, {conditionLabel(a.condition).toLowerCase()}. Listed by {a.seller.name}.
          </p>
          <p className="mt-5 max-w-prose whitespace-pre-line text-lg leading-relaxed">{a.description}</p>

          <BidHistory bids={bundle.bids} maxes={bundle.maxes} user={user} />
        </section>

        <aside className="space-y-4 self-start rounded-xl border border-ink/10 bg-white p-5 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={a.status} />
            <p className="text-sm text-ink/60">Closes {formatDateTime(a.closesAt)}</p>
          </div>

          <div>
            <p className="text-base text-ink/60">
              {a.status === 'ACTIVE' ? (hasBids ? 'Leading bid' : 'Starting price') : hasBids ? 'Final bid' : 'Starting price'}
            </p>
            <p className="num font-display text-5xl font-extrabold text-pine-deep">{formatINR(showPrice)}</p>
            {a.status === 'ACTIVE' && hasBids && a.leader && <p className="mt-1 text-base text-ink/70">Leading: {a.leader.name}</p>}
          </div>

          {live ? (
            <>
              <div>
                <p className="mb-1 text-base text-ink/60">Time left</p>
                <Countdown closesAt={a.closesAt} large />
              </div>
              <p className="text-base text-ink/70">
                Next bid must be at least <strong className="num">{formatINR(nextMinBid(a))}</strong>. Minimum increment is{' '}
                {formatINR(a.minIncrement)}.
              </p>
              {extendedFlash && (
                <p role="status" className="rounded-md bg-amber-soft px-3 py-2 text-base font-semibold">
                  A late bid came in. The closing time was extended.
                </p>
              )}
              <BidPanel auction={a} user={user} bids={bundle.bids} maxes={bundle.maxes} onChange={setBundle} />
            </>
          ) : closing ? (
            <p className="rounded-md bg-ink/5 p-3 text-base">Time is up. Finalising the result...</p>
          ) : (
            <SaleStatus auction={a} user={user} />
          )}

          {isSeller && <SellerActions auction={a} onChange={setAuction} />}
        </aside>
      </div>
    </main>
  );
}
