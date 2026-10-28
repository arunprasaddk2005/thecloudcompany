import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const questionSchema = new mongoose.Schema(
  {
    auction: { type: ObjectId, ref: 'Auction', required: true, index: true },
    asker: { type: ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 300 },
    answer: { type: String, default: null },
    answeredAt: { type: Date, default: null },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Question', questionSchema);
