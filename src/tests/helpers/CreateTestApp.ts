// Debe setearse ANTES de importar createApp, porque rateLimiter.middleware.ts
// lee estas env vars al construir el limiter (import-time), no en cada request.
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ?? '100000';
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ?? '60000';

import { createApp } from '../../app.js';

export function createTestApp() {
  // ':memory:' crea una base nueva y aislada en cada llamada:
  // ningún test comparte estado con otro.
  return createApp(':memory:');
}