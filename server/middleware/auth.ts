import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request so TypeScript knows req.user exists on protected routes
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

/**
 * requireAuth — JWT middleware for all protected API routes.
 *
 * Reads the signed JWT from the httpOnly cookie set after Google OAuth.
 * On success: attaches req.user = { id, email } and calls next().
 * On failure: returns 401 — the frontend should redirect to /api/auth/google.
 *
 * To protect a route:
 *   router.get('/example', requireAuth, (req, res) => {
 *     const userId = req.user!.id;
 *   });
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // JWT_SECRET missing at runtime — crash loudly rather than silently passing requests through
    console.error('[Auth] FATAL: JWT_SECRET environment variable is not set.');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const payload = jwt.verify(token, secret) as { id: string; email: string };
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    // Token is expired, tampered, or invalid
    res.clearCookie('token');
    return res.status(401).json({ error: 'Session expired — please log in again' });
  }
}
