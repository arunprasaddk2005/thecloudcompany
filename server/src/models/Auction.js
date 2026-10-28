import mongoose from 'mongoose';
import { CATEGORIES, CONDITIONS, STATUSES } from '../constants.js';

const { ObjectId } = mongoose.Schema.Types;

const auctionSchema = new mongoose.Schema(
  {
    seller: { type: ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, required: true, trim: true },
    condition: { type: String, enum: CONDITIONS, required: true },
    photos: { type: [String], default: [] },

    startPrice: { type: Number, required: true, min: 1 },
    minIncrement: { type: Number, required: true, min: 1 },
    closesAt: { type: Date, required: true },
    originalClosesAt: { type: Date, required: true },

    status: { type: String, enum: STATUSES, default: 'ACTIVE' },

    // currentPrice starts equal to startPrice. bidCount === 0 means "no bids yet".
    currentPrice: { type: Number, required: true },
    leaderId: { type: ObjectId, ref: 'User', default: null },
    bidCount: { type: Number, default: 0 },
    extensionCount: { type: Number, default: 0 },

    winnerId: { type: ObjectId, ref: 'User', default: null },
    finalPrice: { type: Number, default: null },
    outcome: { type: String, default: null },
    outcomeReason: { type: String, default: null },
  },
  { timestamps: true }
);

auctionSchema.index({ status: 1, closesAt: 1 });
auctionSchema.index({ category: 1 });

export default mongoose.model('Auction', auctionSchema);
