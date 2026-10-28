import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from './config.js';
import { setIO } from './services/realtime.js';

/**
 * Rooms:
 *   auction:<id>  anyone viewing an auction page (public data only)
 *   browse        anyone on the browse page
 *   user:<id>     private alerts, joined automatically when the connection carries a valid login token
 */
export function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: config.clientOrigin } });
  setIO(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.data.userId = String(jwt.verify(token, config.jwtSecret).id);
      } catch {
        /* an invalid or expired token just means an anonymous viewer */
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.data.userId) socket.join(`user:${socket.data.userId}`);

    socket.on('auction:join', (id) => mongoose.isValidObjectId(id) && socket.join(`auction:${id}`));
    socket.on('auction:leave', (id) => mongoose.isValidObjectId(id) && socket.leave(`auction:${id}`));
    socket.on('browse:join', () => socket.join('browse'));
    socket.on('browse:leave', () => socket.leave('browse'));
  });

  return io;
}
