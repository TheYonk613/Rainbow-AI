import { Router } from 'express';
import { google } from 'googleapis';
import { db } from './db.js';
import { requireAuth } from './middleware/auth.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const isProd = process.env.NODE_ENV === 'production';

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

const FRONTEND_URL = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

/**
 * ensureFreshGoogleToken — call this before any Google API request.
 *
 * Checks whether the stored access_token is within 5 minutes of expiry.
 * If so, uses the refresh_token to obtain a new one and persists it.
 * Returns an OAuth2 client ready to use, or null if no credentials exist.
 */
export async function ensureFreshGoogleToken(userId: string) {
  const credentials = db.prepare(`
    SELECT access_token, refresh_token, expires_at
    FROM oauth_credentials
    WHERE user_id = ? AND provider = 'google'
  `).get(userId) as { access_token: string; refresh_token: string | null; expires_at: string | null } | undefined;

  if (!credentials) return null; // User hasn't connected Google — offline mode

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Check if the access token will expire within the next 5 minutes
  const expiresAt = credentials.expires_at ? new Date(credentials.expires_at).getTime() : 0;
  const fiveMinutes = 5 * 60 * 1000;
  const needsRefresh = Date.now() >= expiresAt - fiveMinutes;

  if (needsRefresh && credentials.refresh_token) {
    client.setCredentials({ refresh_token: credentials.refresh_token });
    const { credentials: fresh } = await client.refreshAccessToken();

    db.prepare(`
      UPDATE oauth_credentials
      SET access_token = ?, expires_at = ?
      WHERE user_id = ? AND provider = 'google'
    `).run(
      fresh.access_token,
      fresh.expiry_date ? new Date(fresh.expiry_date).toISOString() : null,
      userId
    );

    client.setCredentials(fresh);
  } else {
    client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
    });
  }

  return client;
}

/**
 * Phase 1: Redirect unauthenticated user to Google Consent Screen
 */
router.get('/google', (_req, res) => {
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
 * Exchanges the single-use code for persistent tokens, maps to User Identity,
 * then issues a signed JWT stored in a secure httpOnly cookie.
 */
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  // Handle User Rejection / Failure
  if (error) {
    console.error('[Auth Error] Google responded with error:', error);
    return res.redirect(`${FRONTEND_URL}/?login=auth_rejected`);
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

    const userId = userInfo.data.id;
    const email = userInfo.data.email;

    // 3. Atomically persist to SQLite matching ACID standards
    const upsertUserAndTokens = db.transaction(() => {
      // Upsert core identity
      db.prepare(`
        INSERT INTO users (id, email)
        VALUES (@id, @email)
        ON CONFLICT(email) DO UPDATE SET id=excluded.id
      `).run({ id: userId, email });

      // Clean existing tokens for user to avoid mapping collision
      db.prepare(`DELETE FROM oauth_credentials WHERE user_id = ? AND provider = 'google'`).run(userId);

      // Securely store active access payloads and refresh tokens
      db.prepare(`
        INSERT INTO oauth_credentials (id, user_id, provider, access_token, refresh_token, expires_at)
        VALUES (@id, @userId, 'google', @accessToken, @refreshToken, @expiresAt)
      `).run({
        id: crypto.randomUUID(),
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
      });
    });

    upsertUserAndTokens();

    // 4. Issue a signed JWT and store it in a secure httpOnly cookie.
    //    This cookie is sent automatically on every subsequent API request —
    //    the frontend never touches it directly (XSS-safe).
    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign({ id: userId, email }, secret, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,                    // Not accessible via JS — prevents XSS token theft
      secure: isProd,                    // HTTPS-only in production
      sameSite: 'lax',                   // Sent on top-level navigations; blocks CSRF from third-party sites
      maxAge: 7 * 24 * 60 * 60 * 1000   // 7 days in milliseconds
    });

    console.log(`[Auth Success] Session secured for ${email}`);

    // 5. Resolve back to Frontend Application
    res.redirect(`${FRONTEND_URL}/?login=success`);

  } catch (err) {
    console.error('[Auth Fatal] OAuth Token Exchange or DB Insertion failed:', err);
    res.redirect(`${FRONTEND_URL}/?login=failed`);
  }
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile if their JWT cookie is valid.
 * The frontend calls this on every page load to restore auth state.
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user!.id, email: req.user!.email });
});

/**
 * POST /api/auth/logout
 * Clears the JWT cookie, ending the session.
 */
router.post('/logout', (_req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: 'lax' });
  res.json({ success: true });
});

export default router;
