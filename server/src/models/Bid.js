import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const bidSchema = new mongoose.Schema(
  {
    auction: { type: ObjectId, ref: 'Auction', required: true },
    bidder: { type: ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['manual', 'auto'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

bidSchema.index({ auction: 1, createdAt: 1 });

export default mongoose.model('Bid', bidSchema);
