import { useTick, serverNow } from '../lib/clock.js';

function describe(ms) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${pad(m)}:${pad(s)}`;
}

/** Live countdown driven by the server clock. Turns amber in the last hour and red in the last 30 seconds. */
export default function Countdown({ closesAt, large = false }) {
  useTick();
  const ms = new Date(closesAt).getTime() - serverNow();

  const size = large ? 'px-4 py-2 text-2xl' : 'px-2.5 py-1 text-sm';
  if (ms <= 0) {
    return <span className={`num inline-flex rounded-full bg-ink/10 font-semibold text-ink/70 ${size}`}>Closed</span>;
  }
  const tone =
    ms <= 30_000 ? 'bg-brick-soft text-brick' : ms <= 3_600_000 ? 'bg-amber-soft text-ink' : 'bg-mint text-pine-deep';

  return (
    <span className={`num inline-flex items-center gap-1.5 rounded-full font-semibold ${tone} ${size}`}>
      <svg viewBox="0 0 20 20" className={large ? 'h-5 w-5' : 'h-3.5 w-3.5'} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 5.5V10l3 2" strokeLinecap="round" />
      </svg>
      <span aria-live="off">{describe(ms)}</span>
    </span>
  );
}
