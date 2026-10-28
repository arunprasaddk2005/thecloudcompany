import http from 'node:http';
import mongoose from 'mongoose';
import app from './app.js';
import { config, cloudinaryEnabled } from './config.js';
import { startSweeper } from './services/sweeper.js';
import { publishClosed } from './services/events.js';
import { initSocket } from './socket.js';

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log(`MongoDB connected: ${config.mongoUri}`);
  console.log(`Photo storage: ${cloudinaryEnabled ? 'Cloudinary' : 'local disk (server/uploads)'}`);
  const server = http.createServer(app);
  initSocket(server);
  startSweeper(1000, publishClosed);
  console.log('Closing sweeper running (every 1 s)');
  server.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
