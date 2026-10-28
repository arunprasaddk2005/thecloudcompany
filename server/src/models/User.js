import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // PRIVATE: only shared between seller and winner after approval. Never put in public responses.
    phone: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
