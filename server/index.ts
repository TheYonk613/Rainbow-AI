import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, initDB } from './db.js';
import authRouter from './auth.js';
import calendarRouter from './calendar.js';
import aiRouter from './ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security & Middleware
app.use(cors());
app.use(express.json());

// Main Route Attachments
app.use('/api/auth', authRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/ai', aiRouter);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Rainbow-AI Backend is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
