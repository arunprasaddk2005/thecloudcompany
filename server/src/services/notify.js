import Notification from '../models/Notification.js';
import { emitUser } from './realtime.js';

export const serializeNotification = (n) => ({
  id: String(n._id),
  type: n.type,
  message: n.message,
  auction: n.auction ? String(n.auction) : null,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

/**
 * Stores a notification (so offline users see it on next login) and pushes it live to the user's open tabs.
 * Never throws: a failed notification must not break a bid or a sale.
 */
export async function notify(userId, type, message, auctionId = null) {
  try {
    const n = await Notification.create({ user: userId, type, message, auction: auctionId });
    emitUser(String(userId), 'notification:new', serializeNotification(n));
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
}
