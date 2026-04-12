import { Request, Response, NextFunction } from 'express';

/**
 * globalErrorHandler — register this LAST in index.ts, after all routes.
 *
 * Catches any error passed via next(err) or thrown inside async route handlers
 * (Express 5 automatically catches async throws, so no asyncHandler wrapper needed).
 *
 * In development: includes the error message to aid debugging.
 * In production:  returns only a generic message — never exposes stack traces.
 */
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // next is required as the 4th parameter for Express to recognize this as an error handler
  _next: NextFunction
) {
  const isProd = process.env.NODE_ENV === 'production';

  // Always log the full error server-side
  console.error('[Unhandled Error]', err.message, err.stack);

  const status = (err as any).status ?? 500;
  res.status(status).json({
    error: isProd ? 'Internal server error' : err.message
  });
}
