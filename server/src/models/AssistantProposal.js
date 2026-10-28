import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const proposalSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    auction: { type: ObjectId, ref: 'Auction', required: true },
    maxAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'declined', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('AssistantProposal', proposalSchema);
