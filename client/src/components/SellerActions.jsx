import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/format.js';

// Each action goes through one confirm step so nothing irreversible happens on a single click.
const ACTIONS = {
  approve: { label: 'Approve this price', confirm: 'Approve and reserve for the winner', reason: false, tone: 'btn-primary' },
  reject: { label: 'Reject price', confirm: 'Reject the winning price', reason: true, tone: 'btn-danger' },
  handover: { label: 'Confirm handover', confirm: 'Yes, the item was handed over', reason: false, tone: 'btn-primary' },
  'pickup-failed': { label: 'Pickup failed', confirm: 'Record a failed pickup', reason: true, tone: 'btn-danger' },
  cancel: { label: 'Cancel listing', confirm: 'Cancel this listing', reason: true, tone: 'btn-danger' },
};

const BY_STATUS = {
  ACTIVE: ['cancel'],
  PENDING_APPROVAL: ['approve', 'reject', 'cancel'],
  APPROVED: ['handover', 'pickup-failed', 'cancel'],
};

export default function SellerActions({ auction: a, onChange }) {
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const available = BY_STATUS[a.status];
  if (!available) return null;

  async function run() {
    setBusy(true);
    setError('');
    try {
      const d = await api(`/auctions/${a.id}/${pending}`, { method: 'POST', body: { reason } });
      onChange(d.auction);
      setPending(null);
      setReason('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const cfg = pending && ACTIONS[pending];

  return (
    <div className="space-y-3 border-t border-ink/10 pt-4">
      <p className="text-base font-semibold">Manage your listing</p>

      {a.status === 'PENDING_APPROVAL' && (
        <p className="rounded-md bg-amber-soft px-3 py-2 text-base">
          <strong>{a.winner?.name}</strong> won with <strong className="num">{formatINR(a.finalPrice)}</strong>. Approve to reserve the item
          for them, or reject the price.
        </p>
      )}
      {a.status === 'APPROVED' && (
        <p className="rounded-md bg-mint px-3 py-2 text-base">
          Reserved for <strong>{a.winner?.name}</strong>. After you meet on campus, confirm the handover.
        </p>
      )}

      {!pending && (
        <div className="flex flex-wrap gap-2">
          {a.status === 'ACTIVE' && (
            <Link to={`/sell/${a.id}/edit`} className="btn-quiet flex-1">
              Edit
            </Link>
          )}
          {available.map((k) => (
            <button key={k} className={`${ACTIONS[k].tone} flex-1`} onClick={() => setPending(k)}>
              {ACTIONS[k].label}
            </button>
          ))}
        </div>
      )}
      {a.status === 'ACTIVE' && a.bidCount > 0 && !pending && (
        <p className="text-sm text-ink/60">After the first bid, only the description can be edited.</p>
      )}

      {pending && (
        <div className="space-y-2 rounded-md border border-ink/15 p-3">
          <p className="font-semibold">{cfg.label}?</p>
          {pending === 'cancel' && a.bidCount > 0 && (
            <p className="text-sm text-ink/70">This auction has bids. Cancelling is recorded and cannot be undone.</p>
          )}
          {cfg.reason && (
            <label className="block">
              <span className="mb-1 block text-base">Reason (optional, visible on the auction page)</span>
              <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
            </label>
          )}
          <div className="flex gap-2">
            <button className={`${cfg.tone} flex-1`} disabled={busy} onClick={run}>
              {busy ? 'Saving...' : cfg.confirm}
            </button>
            <button className="btn-quiet" disabled={busy} onClick={() => { setPending(null); setError(''); }}>
              Back
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="rounded-md bg-brick-soft px-3 py-2 text-base text-brick">{error}</p>}
    </div>
  );
}
