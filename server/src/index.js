import mongoose from 'mongoose';
import app from './app.js';
import { config, cloudinaryEnabled } from './config.js';
import { startSweeper } from './services/sweeper.js';

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log(`MongoDB connected: ${config.mongoUri}`);
  console.log(`Photo storage: ${cloudinaryEnabled ? 'Cloudinary' : 'local disk (server/uploads)'}`);
  startSweeper(1000);
  console.log('Closing sweeper running (every 1 s)');
  app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
