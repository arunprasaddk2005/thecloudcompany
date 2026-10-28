import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Auction from '../models/Auction.js';
import { requireAuth } from '../middleware/auth.js';
import { upload, storePhotos } from '../services/upload.js';
import { CATEGORIES, CONDITIONS, STATUSES } from '../constants.js';

const router = Router();

const MIN_LEAD_MS = 30 * 1000; // closing time must be at least 30 s away
const MAX_LEAD_MS = 60 * 24 * 60 * 60 * 1000; // and at most 60 days

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Public shape of an auction. Seller and leader expose display name only. */
export function publicAuction(doc) {
  const a = doc.toObject ? doc.toObject() : doc;
  const person = (p) => (p && p.name ? { id: String(p._id), name: p.name } : p ? { id: String(p) } : null);
  return {
    id: String(a._id),
    seller: person(a.seller),
    title: a.title,
    category: a.category,
    description: a.description,
    condition: a.condition,
    photos: a.photos,
    startPrice: a.startPrice,
    minIncrement: a.minIncrement,
    closesAt: a.closesAt,
    originalClosesAt: a.originalClosesAt,
    status: a.status,
    currentPrice: a.currentPrice,
    leader: person(a.leaderId),
    winner: person(a.winnerId),
    bidCount: a.bidCount,
    extensionCount: a.extensionCount,
    finalPrice: a.finalPrice,
    outcome: a.outcome,
    outcomeReason: a.outcomeReason,
    createdAt: a.createdAt,
  };
}

export const populateAuction = (query) =>
  query.populate('seller', 'name').populate('leaderId', 'name').populate('winnerId', 'name');

const baseFields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(100),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Choose a category.' }) }),
  description: z.string().trim().min(10, 'Description must be at least 10 characters.').max(2000),
  condition: z.enum(CONDITIONS, { errorMap: () => ({ message: 'Choose a condition.' }) }),
  startPrice: z.coerce.number({ invalid_type_error: 'Enter a starting price.' }).int('Use whole rupees.').min(1, 'Starting price must be at least ₹1.'),
  minIncrement: z.coerce.number({ invalid_type_error: 'Enter a minimum increment.' }).int('Use whole rupees.').min(1, 'Increment must be at least ₹1.'),
  closesAt: z.coerce.date({ errorMap: () => ({ message: 'Choose a closing date and time.' }) }),
};

const createSchema = z.object(baseFields);
const editSchema = z.object(baseFields).partial().strict();

function checkClosingWindow(date) {
  const lead = date.getTime() - Date.now();
  if (lead < MIN_LEAD_MS) return 'Closing time must be at least 30 seconds from now.';
  if (lead > MAX_LEAD_MS) return 'Closing time must be within 60 days.';
  return null;
}

function loadAuction(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Auction not found.' });
  populateAuction(Auction.findById(req.params.id))
    .then((auction) => {
      if (!auction) return res.status(404).json({ error: 'Auction not found.' });
      req.auction = auction;
      next();
    })
    .catch(next);
}

function requireSeller(req, res, next) {
  if (String(req.auction.seller._id) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Only the seller can do this.' });
  }
  next();
}

// ---------- Browse ----------
router.get('/', async (req, res, next) => {
  try {
    const { q, category, condition, minPrice, maxPrice, closingSoon, sort = 'closing' } = req.query;
    const status = STATUSES.includes(req.query.status) ? req.query.status : 'ACTIVE';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 24;
    const now = new Date();

    const filter = { status };
    if (status === 'ACTIVE') filter.closesAt = { $gt: now }; // hide just-expired items before the sweeper runs
    if (closingSoon === 'true') filter.closesAt = { $gt: now, $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
    if (CATEGORIES.includes(category)) filter.category = category;
    if (CONDITIONS.includes(condition)) filter.condition = condition;

    const price = {};
    if (minPrice !== undefined && minPrice !== '' && !Number.isNaN(Number(minPrice))) price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '' && !Number.isNaN(Number(maxPrice))) price.$lte = Number(maxPrice);
    if (Object.keys(price).length) filter.currentPrice = price;

    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }

    const sortMap = {
      closing: { closesAt: 1 },
      newest: { createdAt: -1 },
      priceAsc: { currentPrice: 1 },
      priceDesc: { currentPrice: -1 },
    };

    const [items, total] = await Promise.all([
      populateAuction(Auction.find(filter))
        .sort(sortMap[sort] || sortMap.closing)
        .skip((page - 1) * limit)
        .limit(limit),
      Auction.countDocuments(filter),
    ]);

    res.json({ auctions: items.map(publicAuction), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
});

// ---------- Detail ----------
router.get('/:id', loadAuction, (req, res) => {
  res.json({ auction: publicAuction(req.auction), serverTime: Date.now() });
});

// ---------- Create ----------
router.post('/', requireAuth, upload.array('photos', 5), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const data = parsed.data;

    const closingError = checkClosingWindow(data.closesAt);
    if (closingError) return res.status(400).json({ error: closingError });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Add at least one photo.' });
    }

    const photos = await storePhotos(req.files);
    const auction = await Auction.create({
      ...data,
      seller: req.user._id,
      photos,
      currentPrice: data.startPrice,
      originalClosesAt: data.closesAt,
    });
    await auction.populate('seller', 'name');
    res.status(201).json({ auction: publicAuction(auction) });
  } catch (err) {
    next(err);
  }
});

// ---------- Edit ----------
router.put('/:id', requireAuth, loadAuction, requireSeller, async (req, res, next) => {
  try {
    const auction = req.auction;
    if (auction.status !== 'ACTIVE' || auction.closesAt <= new Date()) {
      return res.status(409).json({ error: 'This auction is closed and can no longer be edited.' });
    }

    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const changes = parsed.data;

    if (auction.bidCount > 0) {
      const locked = Object.keys(changes).filter((k) => k !== 'description');
      if (locked.length) {
        return res.status(409).json({ error: 'After the first bid, only the description can be changed.' });
      }
    }
    if (changes.closesAt) {
      const closingError = checkClosingWindow(changes.closesAt);
      if (closingError) return res.status(400).json({ error: closingError });
      auction.originalClosesAt = changes.closesAt;
    }
    if (changes.startPrice) auction.currentPrice = changes.startPrice;

    Object.assign(auction, changes);
    await auction.save();
    res.json({ auction: publicAuction(auction) });
  } catch (err) {
    next(err);
  }
});

// Cancel, approve, reject, handover and pickup-failed live in routes/sale.js.

export default router;
