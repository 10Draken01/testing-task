import rateLimit from 'express-rate-limit';
import { RateLimitExceededError } from '../../domain/shared/errors.js';

export const globalRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitExceededError('Demasiadas solicitudes desde esta IP, intentá de nuevo más tarde'));
  },
});