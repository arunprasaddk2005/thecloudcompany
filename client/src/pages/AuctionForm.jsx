import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { CATEGORIES, CONDITIONS, toLocalInputValue } from '../lib/format.js';

const QUICK_CLOSE = [
  ['In 2 minutes', 2 * 60_000],
  ['In 1 hour', 60 * 60_000],
  ['Tomorrow', 24 * 60 * 60_000],
  ['In 3 days', 3 * 24 * 60 * 60_000],
];

const BLANK = { title: '', category: '', condition: '', description: '', startPrice: '', minIncrement: '', closesAt: '' };

export default function AuctionForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(BLANK);
  const [original, setOriginal] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    api(`/auctions/${id}`)
      .then(({ auction: a }) => {
        if (user && a.seller.id !== user.id) return setError('Only the seller can edit this listing.');
        const values = {
          title: a.title,
          category: a.category,
          condition: a.condition,
          description: a.description,
          startPrice: String(a.startPrice),
          minIncrement: String(a.minIncrement),
          closesAt: toLocalInputValue(a.closesAt),
        };
        setForm(values);
        setOriginal({ ...a, values });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, [editing, id, user]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const locked = editing && original?.bidCount > 0; // after the first bid only the description may change
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function addFiles(e) {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
    e.target.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let result;
      if (editing) {
        const body = locked ? { description: form.description } : { ...form };
        if (!locked) {
          if (form.closesAt === original.values.closesAt) delete body.closesAt;
          else body.closesAt = new Date(form.closesAt).toISOString();
        }
        result = await api(`/auctions/${id}`, { method: 'PUT', body });
      } else {
        if (!form.closesAt) throw new Error('Choose a closing date and time.');
        const fd = new FormData();
        Object.entries({ ...form, closesAt: new Date(form.closesAt).toISOString() }).forEach(([k, v]) => fd.append(k, v));
        files.forEach((f) => fd.append('photos', f));
        result = await api('/auctions', { method: 'POST', body: fd });
      }
      navigate(`/auctions/${result.auction.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <main className="mx-auto max-w-3xl px-4 py-12 text-ink/60">Loading...</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to={editing ? `/auctions/${id}` : '/'} className="text-base font-semibold text-pine underline">Back</Link>
      <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">{editing ? 'Edit your listing' : 'Sell an item'}</h1>
      {locked && (
        <p className="mt-3 rounded-md bg-amber-soft px-3 py-2 text-base">
          This auction already has bids. You can fix the description, but price, increment and closing time are locked.
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-ink/10 bg-white p-6">
        <label className="block">
          <span className="mb-1 block text-base font-semibold">Title</span>
          <input className="field" value={form.title} onChange={set('title')} disabled={locked} maxLength={100} required />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Category</span>
            <select className="field" value={form.category} onChange={set('category')} disabled={locked} required>
              <option value="">Choose one</option>
              {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Condition</span>
            <select className="field" value={form.condition} onChange={set('condition')} disabled={locked} required>
              <option value="">Choose one</option>
              {CONDITIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-base font-semibold">Description</span>
          <textarea
            className="field min-h-32"
            value={form.description}
            onChange={set('description')}
            maxLength={2000}
            placeholder="Does it work? Any marks, scratches or missing parts? Buyers read this before bidding."
            required
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Starting price (₹)</span>
            <input className="field num" inputMode="numeric" value={form.startPrice} onChange={set('startPrice')} disabled={locked} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Minimum bid increment (₹)</span>
            <input className="field num" inputMode="numeric" value={form.minIncrement} onChange={set('minIncrement')} disabled={locked} required />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Closes at</span>
            <input className="field" type="datetime-local" value={form.closesAt} onChange={set('closesAt')} disabled={locked} required />
          </label>
          {!locked && (
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_CLOSE.map(([label, ms]) => (
                <button
                  type="button"
                  key={label}
                  className="btn-quiet px-3 py-1 text-sm"
                  onClick={() => setForm((f) => ({ ...f, closesAt: toLocalInputValue(Date.now() + ms) }))}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {!editing && (
          <div>
            <span className="mb-1 block text-base font-semibold">Photos (1 to 5, up to 5 MB each)</span>
            <input type="file" accept="image/*" multiple onChange={addFiles} className="block text-base" disabled={files.length >= 5} />
            {previews.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <li key={src} className="relative">
                    <img src={src} alt={`Selected photo ${i + 1}`} className="h-20 w-24 rounded-md object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-sm text-white"
                      onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                    >
                      x
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <p role="alert" className="rounded-md bg-brick-soft px-3 py-2 text-base text-brick">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Saving...' : editing ? 'Save changes' : 'Publish listing'}
        </button>
      </form>
    </main>
  );
}
