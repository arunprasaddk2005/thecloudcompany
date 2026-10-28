import { useSyncExternalStore } from 'react';
import { api } from './api.js';

// The server owns time. We measure the offset once and every countdown uses it.
let offset = 0;

export async function syncClock() {
  try {
    const t0 = Date.now();
    const { now } = await api('/time');
    const t1 = Date.now();
    offset = now - (t0 + t1) / 2;
  } catch {
    /* keep the previous offset */
  }
}

export const serverNow = () => Date.now() + offset;

// One shared 1-second ticker for every countdown on the page.
const listeners = new Set();
let tick = 0;
setInterval(() => {
  tick += 1;
  listeners.forEach((l) => l());
}, 1000);

export function useTick() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => tick
  );
}
