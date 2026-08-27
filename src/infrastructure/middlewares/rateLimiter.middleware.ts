import rateLimit from 'express-rate-limit';
import { RateLimitExceededError } from '../../domain/errors.js';
 
export const globalRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
  standardHeaders: true, // manda los headers RateLimit-* estándar (RateLimit-Limit, -Remaining, -Reset)
  legacyHeaders: false,  // desactiva los headers viejos X-RateLimit-*
  handler: (_req, _res, next) => {
    // Delegamos al error-handler global en vez de armar el JSON acá,
    // así el formato { error: { code, message } } tiene un único punto de verdad.
    next(new RateLimitExceededError('Demasiadas solicitudes desde esta IP, intentá de nuevo más tarde'));
  },
});