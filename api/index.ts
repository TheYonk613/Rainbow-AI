/**
 * Vercel Serverless Adapter
 *
 * This file exports the Express app so Vercel can run it as a serverless function.
 * The vercel.json rewrites route all /api/* traffic here.
 *
 * ⚠️  IMPORTANT — Before deploying to Vercel you must:
 *
 *  1. Complete the PostgreSQL migration (server/db.ts → pg Pool).
 *     SQLite uses a local file — Vercel's filesystem is ephemeral and read-only,
 *     so the database.sqlite file will be lost between function invocations.
 *
 *  2. Create a Supabase project and get your connection string:
 *     DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
 *
 *  3. Set all environment variables in the Vercel dashboard
 *     (Project Settings → Environment Variables) or via the Vercel CLI:
 *     vercel env add JWT_SECRET
 *     vercel env add GOOGLE_CLIENT_ID
 *     vercel env add GOOGLE_CLIENT_SECRET
 *     vercel env add GOOGLE_REDIRECT_URI   ← must be your production URL
 *     vercel env add OPENAI_API_KEY
 *     vercel env add ALLOWED_ORIGIN        ← your Vercel frontend URL
 *     vercel env add DATABASE_URL
 *
 *  4. Update GOOGLE_REDIRECT_URI in Google Cloud Console to your production URL.
 */

import app from '../server/index.js';

export default app;
