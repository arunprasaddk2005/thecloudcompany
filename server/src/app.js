import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import auctionRoutes from './routes/auctions.js';
import meRoutes from './routes/me.js';
import bidRoutes from './routes/bids.js';
import saleRoutes from './routes/sale.js';
import notificationRoutes from './routes/notifications.js';
import { uploadsDir } from './services/upload.js';

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(uploadsDir));

// Server time lets the client correct its countdown for clock drift.
app.get('/api/time', (req, res) => res.json({ now: Date.now() }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/auctions', bidRoutes);
app.use('/api/auctions', saleRoutes);
app.use('/api/me', meRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Each photo must be under 5 MB.' });
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'You can upload up to 5 photos.' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : err.message });
});

export default app;
