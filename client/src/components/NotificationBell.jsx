import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../lib/Notifications.jsx';
import { formatDateTime } from '../lib/format.js';

export default function NotificationBell() {
  const { items, unread, permission, markRead, markAllRead, enableBrowserAlerts } = useNotifications();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => (e.type === 'keydown' ? e.key === 'Escape' && setOpen(false) : !box.current?.contains(e.target) && setOpen(false));
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-md p-2 text-white/90 hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7Z" strokeLinejoin="round" />
          <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1 text-xs font-bold text-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[min(22rem,90vw)] rounded-xl border border-ink/10 bg-white text-ink shadow-lg">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <p className="font-bold">Notifications</p>
            {unread > 0 && (
              <button className="text-sm font-semibold text-pine underline" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {permission === 'default' && (
            <div className="border-b border-ink/10 bg-mint/40 px-4 py-3 text-sm">
              <p>Get a pop-up when something happens while this tab is in the background.</p>
              <button className="btn-primary mt-2 px-3 py-1 text-sm" onClick={enableBrowserAlerts}>
                Turn on browser notifications
              </button>
            </div>
          )}
          {permission === 'denied' && (
            <p className="border-b border-ink/10 px-4 py-2 text-sm text-ink/70">
              Browser pop-ups are blocked. Allow notifications for this site in your browser settings to get them.
            </p>
          )}

          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-ink/60">Nothing yet. Bid updates will appear here.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  className={`block w-full border-b border-ink/5 px-4 py-3 text-left hover:bg-ink/5 ${n.readAt ? '' : 'bg-amber-soft/50'}`}
                  onClick={() => {
                    markRead(n);
                    setOpen(false);
                    if (n.auction) navigate(`/auctions/${n.auction}`);
                  }}
                >
                  <p className={`text-base ${n.readAt ? '' : 'font-semibold'}`}>{n.message}</p>
                  <p className="mt-0.5 text-sm text-ink/60">{formatDateTime(n.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
