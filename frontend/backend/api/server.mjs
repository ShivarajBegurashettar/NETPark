import serverless from 'serverless-http';
import app, { connectDB } from '../app.js';

// Connect to DB on cold start
await connectDB();

export const handler = serverless(app);
