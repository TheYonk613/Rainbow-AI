import { Router } from 'express';
import { google } from 'googleapis';
import { db } from './db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Securely instantiate Google OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Define minimum permissions needed for Calendar operation via the Principle of Least Privilege
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar'
];

/**
 * Phase 1: Redirect unauthenticated user to Google Consent Screen
 */
router.get('/google', (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Mandatory: Forces refresh_token issuance
      prompt: 'consent',      // Mandatory: Needed so Google continually yields refresh_token 
      scope: SCOPES
    });
    res.redirect(url);
  } catch (error) {
    console.error('[Auth Error] Failed generating Google Auth URL:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Phase 2: Ingress Callback from Google
 * Securely exchanges the single-use code for persistent tokens, maps to User Identity.
 */
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  // Handle User Rejection / Failure
  if (error) {
    console.error('[Auth Error] Google responded with error:', error);
    return res.redirect('http://localhost:5173/?login=auth_rejected');
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  try {
    // 1. Core token exchange
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 2. Extract verified Identity from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    if (!userInfo.data.email || !userInfo.data.id) {
       throw new Error('Google identity missing critical fields (email/id)');
    }

    // 3. Atomically persist to SQLite matching ACID standards
    const upsertUserAndTokens = db.transaction(() => {
      // Upsert core identity
      db.prepare(`
        INSERT INTO users (id, email) 
        VALUES (@id, @email)
        ON CONFLICT(email) DO UPDATE SET id=excluded.id
      `).run({ id: userInfo.data.id, email: userInfo.data.email });

      // Clean existing tokens for user to avoid mapping collision
      db.prepare(`DELETE FROM oauth_credentials WHERE user_id = ? AND provider = 'google'`).run(userInfo.data.id);

      // Securely store active access payloads and refresh tokens
      db.prepare(`
        INSERT INTO oauth_credentials (id, user_id, provider, access_token, refresh_token, expires_at)
        VALUES (@id, @userId, 'google', @accessToken, @refreshToken, @expiresAt)
      `).run({
        id: crypto.randomUUID(),
        userId: userInfo.data.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null, // Might be null if Google remembers the session without prompt='consent'
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
      });
    });

    upsertUserAndTokens();

    console.log(`[Auth Success] Session secured for ${userInfo.data.email}`);

    // 4. Resolve back to Frontend Application
    // Future architectural step: we will set a secure httpOnly cookie with a JWT here
    res.redirect('http://localhost:5173/?login=success');

  } catch (err) {
    console.error('[Auth Fatal] OAuth Token Exchange or DB Insertion failed:', err);
    res.redirect('http://localhost:5173/?login=failed');
  }
});

export default router;
