import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatINR, nextMinBid } from '../lib/format.js';

export default function BidPanel({ auction: a, user, bids, maxes, onChange }) {
  const location = useLocation();
  const [bid, setBid] = useState('');
  const [max, setMax] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const minBid = nextMinBid(a);
  const isSeller = user && user.id === a.seller.id;
  const isLeader = user && a.leader?.id === user.id;
  const myMax = user && maxes.find((m) => m.bidder.id === user.id);
  const iHaveBid = user && bids.some((b) => b.bidder.id === user.id);
  const outbid = iHaveBid && !isLeader;

  if (!user) {
    return (
      <p className="rounded-md bg-ink/5 p-3 text-base">
        <Link to="/login" state={{ from: location.pathname }} className="font-semibold text-pine underline">
          Log in
        </Link>{' '}
        to place a bid.
      </p>
    );
  }
  if (isSeller) return <p className="rounded-md bg-ink/5 p-3 text-base text-ink/70">This is your item, so you can't bid on it.</p>;

  async function send(kind) {
    setError('');
    setNotice('');
    setBusy(kind);
    try {
      const d =
        kind === 'bid'
          ? await api(`/auctions/${a.id}/bids`, { method: 'POST', body: { amount: Number(bid === '' ? minBid : bid) } })
          : await api(`/auctions/${a.id}/auto-bid`, { method: 'PUT', body: { maxAmount: Number(max) } });
      onChange(d);
      const leading = d.auction.leader?.id === user.id;
      setNotice(
        leading
          ? `You're leading at ${formatINR(d.auction.currentPrice)}.`
          : `Another bidder's maximum is higher. The price is now ${formatINR(d.auction.currentPrice)}.`
      );
      if (d.extended) setNotice((n) => `${n} The closing time was extended.`);
      setBid('');
      if (kind === 'auto') setMax('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-5">
      {isLeader && (
        <p className="rounded-md bg-mint px-3 py-2 text-base font-semibold text-pine-deep">You're the highest bidder.</p>
      )}
      {outbid && (
        <p className="rounded-md bg-amber-soft px-3 py-2 text-base font-semibold">You've been outbid. Bid again to get back in the lead.</p>
      )}

      {!isLeader && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send('bid');
          }}
          className="space-y-2"
        >
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Your bid (₹)</span>
            <input
              className="field num"
              inputMode="numeric"
              value={bid}
              placeholder={String(minBid)}
              onChange={(e) => setBid(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <button className="btn-primary w-full" disabled={Boolean(busy)}>
            {busy === 'bid' ? 'Placing bid...' : `Place bid${bid === '' ? ` of ${formatINR(minBid)}` : ''}`}
          </button>
        </form>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send('auto');
        }}
        className="space-y-2 border-t border-ink/10 pt-4"
      >
        <label className="block">
          <span className="mb-1 block text-base font-semibold">Automatic bidding</span>
          <span className="mb-2 block text-sm text-ink/60">
            Set the most you'll pay. We bid for you only as much as needed to keep you in the lead. Your maximum is visible to everyone.
          </span>
          <input
            className="field num"
            inputMode="numeric"
            value={max}
            placeholder={myMax ? `Currently ${myMax.maxAmount}. Enter a higher amount` : `At least ${isLeader ? a.currentPrice + 1 : minBid}`}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
            aria-label="Maximum bid in rupees"
          />
        </label>
        {myMax && <p className="text-sm text-ink/70">Your current maximum: <strong className="num">{formatINR(myMax.maxAmount)}</strong>. You can only raise it.</p>}
        <button className="btn-quiet w-full" disabled={Boolean(busy) || max === ''}>
          {busy === 'auto' ? 'Saving...' : myMax ? 'Raise my maximum' : 'Set my maximum'}
        </button>
      </form>

      {notice && <p role="status" className="rounded-md bg-mint/60 px-3 py-2 text-base">{notice}</p>}
      {error && <p role="alert" className="rounded-md bg-brick-soft px-3 py-2 text-base text-brick">{error}</p>}
    </div>
  );
}
