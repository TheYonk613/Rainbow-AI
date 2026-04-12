import rateLimit from 'express-rate-limit';

/**
 * aiLimiter — applied to /api/ai router.
 *
 * Every AI call costs real money (Whisper + GPT-4o-mini).
 * 10 requests/minute per IP prevents runaway costs from a looping client or abuse.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: 'Too many AI requests — please wait a moment before trying again.' }
});

/**
 * generalLimiter — applied globally in index.ts.
 *
 * 60 requests/minute per IP covers normal calendar usage while blocking
 * automated scanning or accidental tight-loop clients.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down.' }
});
