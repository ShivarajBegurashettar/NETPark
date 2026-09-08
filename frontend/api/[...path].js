import app, { connectDB } from '../backend/app.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('Serverless Function Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
