import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const autoBidSchema = new mongoose.Schema({
  auction: { type: ObjectId, ref: 'Auction', required: true },
  bidder: { type: ObjectId, ref: 'User', required: true },
  maxAmount: { type: Number, required: true },
  setAt: { type: Date, default: Date.now }, // tie-break: earlier wins
  active: { type: Boolean, default: true },
});

autoBidSchema.index({ auction: 1, bidder: 1 }, { unique: true });

export default mongoose.model('AutoBid', autoBidSchema);
