import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/booking.js';
import walletRoutes from './routes/wallet.js';
import slotRoutes from './routes/slot.js';
import aiRoutes from './routes/ai.js';
import alprRoutes from './routes/alpr.js';

try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get(['/', '/api'], (req, res) => {
  res.status(200).json({ message: 'NETPark API Server is Live & Running!' });
});

// Dual mounting to ensure Vercel rewrites match regardless of path prefix
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/bookings', bookingRoutes);
app.use('/bookings', bookingRoutes);

app.use('/api/wallet', walletRoutes);
app.use('/wallet', walletRoutes);

app.use('/api/slots', slotRoutes);
app.use('/slots', slotRoutes);

app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes);

app.use('/api/alpr', alprRoutes);
app.use('/alpr', alprRoutes);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/netpark';

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;
    if (!MONGO_URI) return;
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
};

export default app;
