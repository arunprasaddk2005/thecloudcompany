export const CATEGORIES = [
  ['cycle', 'Cycles'],
  ['calculator', 'Calculators'],
  ['books', 'Books'],
  ['electronics', 'Electronics'],
  ['furniture', 'Furniture'],
  ['appliances', 'Appliances'],
  ['clothing', 'Clothing'],
  ['other', 'Other'],
];

export const CONDITIONS = [
  ['new', 'New'],
  ['like_new', 'Like new'],
  ['good', 'Good'],
  ['fair', 'Fair'],
  ['poor', 'Poor'],
];

export const categoryLabel = (v) => CATEGORIES.find(([k]) => k === v)?.[1] ?? v;
export const conditionLabel = (v) => CONDITIONS.find(([k]) => k === v)?.[1] ?? v;

export const STATUS_LABELS = {
  ACTIVE: 'Live',
  PENDING_APPROVAL: 'Waiting for seller approval',
  APPROVED: 'Reserved for winner',
  SOLD: 'Sold',
  UNSOLD: 'Unsold',
  REJECTED: 'Price rejected',
  CANCELLED: 'Cancelled',
  PICKUP_FAILED: 'Pickup failed',
};

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatINR = (n) => inr.format(n);

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Next valid bid: the start price for the first bid, otherwise current price plus the increment. */
export const nextMinBid = (a) => (a.bidCount === 0 ? a.startPrice : a.currentPrice + a.minIncrement);

/** Value for a datetime-local input, in the browser's local time. */
export function toLocalInputValue(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export const formatTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit' });
