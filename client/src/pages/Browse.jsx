import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { CATEGORIES, CONDITIONS } from '../lib/format.js';
import AuctionCard from '../components/AuctionCard.jsx';

const SORTS = [
  ['closing', 'Ending soonest'],
  ['newest', 'Newest'],
  ['priceAsc', 'Price: low to high'],
  ['priceDesc', 'Price: high to low'],
];

const EMPTY = { q: '', category: '', condition: '', minPrice: '', maxPrice: '', closingSoon: false, sort: 'closing' };

export default function Browse() {
  const [filters, setFilters] = useState(EMPTY);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => setPage(1), [debouncedQ, filters.category, filters.condition, filters.minPrice, filters.maxPrice, filters.closingSoon, filters.sort]);

  useEffect(() => {
    let cancelled = false;
    setError('');
    api('/auctions', { params: { ...filters, q: debouncedQ, page } })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filters.category, filters.condition, filters.minPrice, filters.maxPrice, filters.closingSoon, filters.sort, page]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-extrabold md:text-4xl">What seniors are letting go</h1>
      <p className="mt-2 text-lg text-ink/70">Every item is its own auction. Bid before the clock runs out.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-5 self-start rounded-xl border border-ink/10 bg-white p-4" aria-label="Filters">
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Search</span>
            <input className="field" type="search" placeholder="Cycle, calculator, notes" value={filters.q} onChange={set('q')} />
          </label>
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Category</span>
            <select className="field" value={filters.category} onChange={set('category')}>
              <option value="">All categories</option>
              {CATEGORIES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Condition</span>
            <select className="field" value={filters.condition} onChange={set('condition')}>
              <option value="">Any condition</option>
              {CONDITIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-1 text-base font-semibold">Price in rupees</legend>
            <div className="flex items-center gap-2">
              <input className="field" inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={filters.minPrice} onChange={set('minPrice')} />
              <span aria-hidden="true">to</span>
              <input className="field" inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={filters.maxPrice} onChange={set('maxPrice')} />
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-base font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-pine" checked={filters.closingSoon} onChange={set('closingSoon')} />
            Closing in 24 hours
          </label>
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Sort by</span>
            <select className="field" value={filters.sort} onChange={set('sort')}>
              {SORTS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {dirty && (
            <button className="btn-quiet w-full" onClick={() => setFilters(EMPTY)}>
              Clear filters
            </button>
          )}
        </aside>

        <section aria-live="polite">
          {error && <p role="alert" className="rounded-md bg-brick-soft px-3 py-2 text-brick">{error}</p>}
          {!data && !error && <p className="text-ink/60">Loading auctions...</p>}
          {data && data.auctions.length === 0 && (
            <div className="rounded-xl border border-dashed border-ink/25 p-10 text-center">
              <p className="text-xl font-bold">Nothing matches yet.</p>
              <p className="mt-1 text-ink/70">Clear a filter, or check back when more seniors list their things.</p>
            </div>
          )}
          {data && data.auctions.length > 0 && (
            <>
              <p className="mb-3 text-base text-ink/60">{data.total === 1 ? '1 live auction' : `${data.total} live auctions`}</p>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.auctions.map((a) => (
                  <AuctionCard key={a.id} auction={a} />
                ))}
              </div>
              {data.pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button className="btn-quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </button>
                  <span className="num text-base">
                    Page {data.page} of {data.pages}
                  </span>
                  <button className="btn-quiet" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
