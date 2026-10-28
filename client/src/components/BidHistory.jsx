import { formatINR, formatTime } from '../lib/format.js';

export default function BidHistory({ bids, maxes, user }) {
  const you = (p) => (user && p.id === user.id ? ' (you)' : '');
  return (
    <div className="mt-10 grid gap-8 md:grid-cols-[1fr_16rem]">
      <section>
        <h2 className="text-2xl font-bold">Bid history</h2>
        {bids.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-ink/25 p-4 text-ink/70">
            No bids yet. The first bid must be at least the starting price.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-ink/10 bg-white">
            <table className="w-full text-left text-base">
              <thead className="border-b border-ink/10 text-sm text-ink/60">
                <tr>
                  <th className="px-4 py-2 font-semibold">Bidder</th>
                  <th className="px-4 py-2 font-semibold">Amount</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b, i) => (
                  <tr key={b.id} className={`border-b border-ink/5 last:border-0 ${i === 0 ? 'bg-mint/40' : ''}`}>
                    <td className="px-4 py-2">
                      {b.bidder.name}
                      {you(b.bidder)}
                    </td>
                    <td className="num px-4 py-2 font-semibold">{formatINR(b.amount)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-sm ${b.type === 'auto' ? 'bg-ink/10' : 'bg-pine/10 text-pine-deep'}`}>
                        {b.type === 'auto' ? 'Automatic' : 'Manual'}
                      </span>
                    </td>
                    <td className="num px-4 py-2 text-ink/70">{formatTime(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold">Maximums</h2>
        <p className="mt-1 text-sm text-ink/60">Automatic bidding limits are public.</p>
        {maxes.length === 0 ? (
          <p className="mt-2 text-ink/70">None set.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {maxes.map((m) => (
              <li key={m.bidder.id} className="flex items-center justify-between rounded-md border border-ink/10 bg-white px-3 py-2">
                <span>
                  {m.bidder.name}
                  {you(m.bidder)}
                </span>
                <span className="num font-semibold">{formatINR(m.maxAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
