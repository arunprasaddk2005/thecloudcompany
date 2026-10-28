import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getToken } from './api.js';

// One shared connection. It carries the login token so the server can put us in our private alert room.
export const socket = io({ autoConnect: false, auth: (cb) => cb({ token: getToken() }) });

/** Reconnect after login or logout so the connection picks up the right identity. */
export function reconnect() {
  socket.disconnect();
  socket.connect();
}

const AUCTION_EVENTS = ['bid:new', 'auction:extended', 'auction:closed', 'auction:updated'];

/** Calls onEvent whenever something changes on this auction, and again after any reconnect. */
export function useAuctionSocket(id, onEvent) {
  useEffect(() => {
    const join = () => socket.emit('auction:join', id);
    join();
    socket.on('connect', join);
    socket.on('connect', onEvent);
    AUCTION_EVENTS.forEach((e) => socket.on(e, onEvent));
    return () => {
      socket.emit('auction:leave', id);
      socket.off('connect', join);
      socket.off('connect', onEvent);
      AUCTION_EVENTS.forEach((e) => socket.off(e, onEvent));
    };
  }, [id, onEvent]);
}

/** Calls onEvent when any listing's price or status changes (for the browse page). */
export function useBrowseSocket(onEvent) {
  useEffect(() => {
    const join = () => socket.emit('browse:join');
    join();
    socket.on('connect', join);
    socket.on('browse:changed', onEvent);
    return () => {
      socket.emit('browse:leave');
      socket.off('connect', join);
      socket.off('browse:changed', onEvent);
    };
  }, [onEvent]);
}
