// Resets a user's password directly in the database. For development and demo recovery only.
// Usage (from the project root):  npm --prefix server run reset-password -- you@kongu.edu NewPassword123
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import User from '../models/User.js';

const [email, newPassword] = process.argv.slice(2);

if (!email || !newPassword) {
  console.log('Usage: npm --prefix server run reset-password -- <email> <new-password>');
  process.exit(1);
}
if (newPassword.length < 6) {
  console.log('The new password must be at least 6 characters.');
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
const user = await User.findOne({ email: email.trim().toLowerCase() });
if (!user) {
  const all = await User.find({}, 'email').limit(20).lean();
  console.log(`No account found for ${email}. Accounts in the database:`);
  all.forEach((u) => console.log('  ' + u.email));
} else {
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  console.log(`Password reset for ${user.email}. You can log in with the new password now.`);
}
await mongoose.disconnect();
