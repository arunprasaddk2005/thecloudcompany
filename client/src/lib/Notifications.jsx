import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './AuthContext.jsx';
import { socket, reconnect } from './socket.js';

const Ctx = createContext(null);
export const useNotifications = () => useContext(Ctx);

const BASE_TITLE = document.title;
const supported = typeof Notification !== 'undefined';

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [version, setVersion] = useState(0); // bumps on every new alert so pages can refresh themselves
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');

  // Log in or out: reconnect the socket under the new identity and load stored alerts.
  useEffect(() => {
    reconnect();
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    api('/notifications')
      .then((d) => {
        setItems(d.notifications);
        setUnread(d.unread);
      })
      .catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live alerts. In a background tab they also appear as a browser pop-up.
  useEffect(() => {
    if (!user) return undefined;
    const onNew = (n) => {
      setItems((prev) => [n, ...prev].slice(0, 30));
      setUnread((u) => u + 1);
      setVersion((v) => v + 1);
      if (supported && Notification.permission === 'granted' && document.hidden) {
        try {
          const popup = new Notification('Handover', { body: n.message, tag: n.id });
          popup.onclick = () => {
            window.focus();
            popup.close();
          };
        } catch {
          /* some browsers refuse; the in-app bell still shows it */
        }
      }
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) ${BASE_TITLE}` : BASE_TITLE;
  }, [unread]);

  // Takes the notification itself so the unread counter changes exactly once.
  const markRead = useCallback((n) => {
    if (n.readAt) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnread(0);
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }, []);

  const enableBrowserAlerts = useCallback(async () => {
    if (supported) setPermission(await Notification.requestPermission());
  }, []);

  return (
    <Ctx.Provider value={{ items, unread, version, permission, markRead, markAllRead, enableBrowserAlerts }}>{children}</Ctx.Provider>
  );
}
