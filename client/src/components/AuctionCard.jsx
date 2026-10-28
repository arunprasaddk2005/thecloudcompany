import { Link } from 'react-router-dom';
import Countdown from './Countdown.jsx';
import { categoryLabel, conditionLabel, formatINR } from '../lib/format.js';

export default function AuctionCard({ auction: a }) {
  const hasBids = a.bidCount > 0;
  return (
    <Link
      to={`/auctions/${a.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-white transition-colors hover:border-pine/60"
    >
      <div className="aspect-[4/3] overflow-hidden bg-mint/50">
        {a.photos[0] && (
          <img src={a.photos[0]} alt={a.title} loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-lg font-bold leading-snug">{a.title}</h3>
          <p className="mt-1 text-sm text-ink/60">
            {categoryLabel(a.category)}, {conditionLabel(a.condition).toLowerCase()}
          </p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink/60">{hasBids ? 'Leading bid' : 'Starts at'}</p>
            <p className="num font-display text-2xl font-extrabold text-pine-deep">{formatINR(a.currentPrice)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Countdown closesAt={a.closesAt} />
            <p className="text-sm text-ink/60">{a.bidCount === 1 ? '1 bid' : `${a.bidCount} bids`}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
