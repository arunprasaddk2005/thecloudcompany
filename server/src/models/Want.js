import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const wantSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    keywords: { type: [String], default: [] },
    category: { type: String, default: null },
    condition: { type: String, default: null },
    maxPrice: { type: Number, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Want', wantSchema);
