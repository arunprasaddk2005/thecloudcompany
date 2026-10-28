// Holds the Socket.io instance so any service can broadcast. Every call is a safe no-op when sockets
// are not running (for example in unit tests), so realtime can never break a bid.
let io = null;

export const setIO = (instance) => {
  io = instance;
};
export const emitAuction = (auctionId, event, payload) => io?.to(`auction:${auctionId}`).emit(event, payload);
export const emitUser = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);
export const emitBrowse = () => io?.to('browse').emit('browse:changed', {});
