import { STATUS_LABELS } from '../lib/format.js';

const TONES = {
  ACTIVE: 'bg-mint text-pine-deep',
  PENDING_APPROVAL: 'bg-amber-soft text-ink',
  APPROVED: 'bg-pine text-white',
  SOLD: 'bg-pine-deep text-white',
  UNSOLD: 'bg-ink/10 text-ink/70',
  REJECTED: 'bg-brick-soft text-brick',
  CANCELLED: 'bg-ink/10 text-ink/70',
  PICKUP_FAILED: 'bg-brick-soft text-brick',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${TONES[status] || 'bg-ink/10'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
