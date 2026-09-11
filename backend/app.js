import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import authRoutes, { seedMasterAdmin } from './routes/auth.js';
import bookingRoutes from './routes/booking.js';
import walletRoutes from './routes/wallet.js';
import slotRoutes from './routes/slot.js';
import aiRoutes from './routes/ai.js';
import alprRoutes from './routes/alpr.js';
import { ParkingSlot } from './models/ParkingSlot.js';

try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

mongoose.set('bufferCommands', false);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Ensure DB is connected before processing any API request
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (e) {
    console.error('DB Middleware Connection Error:', e.message);
  }
  next();
});

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

const seedDefaultSlots = async () => {
    try {
        const initialHubliBranches = [
            { locationName: 'NETPark Vidya Nagar', slotNumber: 'Hubli', isAvailable: true, bikePrice: 30, carPrice: 50, coordinates: { lat: 15.366138, lng: 75.118796 } },
            { locationName: 'NETPark Gokul Road', slotNumber: 'Hubli', isAvailable: true, bikePrice: 20, carPrice: 40, coordinates: { lat: 15.350735, lng: 75.106196 } },
            { locationName: 'NETPark Keshwapur', slotNumber: 'Hubli', isAvailable: true, bikePrice: 15, carPrice: 30, coordinates: { lat: 15.360716, lng: 75.124945 } },
            { locationName: 'NETPark Hosur Road', slotNumber: 'Hubli', isAvailable: true, bikePrice: 25, carPrice: 45, coordinates: { lat: 15.362352, lng: 75.117154 } },
            { locationName: 'NETPark Navanagar', slotNumber: 'Hubli', isAvailable: true, bikePrice: 20, carPrice: 35, coordinates: { lat: 15.398652, lng: 75.062716 } }
        ];

        for (const branch of initialHubliBranches) {
            const exists = await ParkingSlot.findOne({ locationName: branch.locationName });
            if (!exists) {
                await ParkingSlot.create(branch);
            }
        }
    } catch (e) {}
};

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  const uri = process.env.MONGO_URI;

  try {
    if (uri) {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log('Connected to Primary MongoDB');
    } else {
      throw new Error('No MONGO_URI provided in environment');
    }
  } catch (error) {
    console.warn('Primary MongoDB connection failed:', error.message, '- Falling back to Memory DB');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`Connected to In-Memory DB at ${memoryUri}`);
    } catch (memErr) {
      console.error('In-Memory Fallback error:', memErr.message);
    }
  }

  try {
    await seedDefaultSlots();
    await seedMasterAdmin();
  } catch (e) {}
};

export default app;
