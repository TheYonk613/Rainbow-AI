import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * validate(schema) — Zod request body validation middleware.
 *
 * Usage:
 *   router.post('/events', requireAuth, validate(createEventSchema), handler)
 *
 * Returns 400 with field-level errors on invalid input.
 * On success: req.body is replaced with the parsed (typed) output.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: result.error.flatten().fieldErrors
      });
    }
    req.body = result.data; // Use Zod's parsed/coerced output
    next();
  };
}

// ── Schemas ────────────────────────────────────────────────────────

/** POST /api/calendar/events */
export const createEventSchema = z.object({
  id:     z.string().min(1),
  title:  z.string().min(1).max(500),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startH: z.number().min(0).max(24),
  endH:   z.number().min(0).max(24),
  color:  z.string().optional()
});

/** PUT /api/calendar/events/:id */
export const updateEventSchema = z.object({
  title:  z.string().min(1).max(500).optional(),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  startH: z.number().min(0).max(24).optional(),
  endH:   z.number().min(0).max(24).optional(),
  color:  z.string().optional(),
  notes:  z.string().max(5000).optional()
});

/** POST /api/ai/execute */
export const executeSchema = z.object({
  transcript: z.string().min(1).max(2000)
});
