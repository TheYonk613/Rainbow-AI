import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDB } from './db.js';
import authRouter from './auth.js';
import calendarRouter from './calendar.js';
import aiRouter from './ai.js';
import { generalLimiter, aiLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { httpLogger, logger } from './middleware/logger.js';

dotenv.config();

// ── Startup: fail fast if critical env vars are missing ───────────
const REQUIRED_ENV = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[Startup] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[Startup] Add them to your .env file. See .env.example for reference.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & Middleware ─────────────────────────────────────────

// CORS: credentials:true is required for the JWT cookie to travel cross-origin.
// Lock ALLOWED_ORIGIN to your production domain before deploying.
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(httpLogger);          // Structured request logging (pino)
app.use(express.json());
app.use(cookieParser());      // Parses req.cookies — needed for JWT auth
app.use(generalLimiter);      // 60 req/min global rate limit

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/ai', aiLimiter, aiRouter);   // Extra rate limit on expensive AI routes

// Basic health check (unauthenticated — used by uptime monitors)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Rainbow-AI Backend is running',
    timestamp: new Date().toISOString()
  });
});

// ── Global error handler (must be last) ──────────────────────────
app.use(globalErrorHandler);

// ── Start (dev / Railway / Fly) ───────────────────────────────────
// In Vercel serverless mode, api/index.ts imports the app directly
// and Vercel handles the listening. The listen() call is skipped there.
if (process.env.VERCEL !== '1') {
  initDB();
  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

export default app;
