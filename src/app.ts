import express from 'express';
import type { Express } from 'express';
import { InicializateEndPoints } from './infrastructure/dependency-injection/container.js';
import { errorHandler } from './infrastructure/middlewares/errorHandler.middleware.js';
import { globalRateLimiter } from './infrastructure/middlewares/rateLimiter.middleware.js';

export function createApp(dbPath: string): Express {
  const app = express();
  app.use(express.json());
  app.use(globalRateLimiter);

  InicializateEndPoints(app, dbPath);
  app.use(errorHandler);
  return app;
}