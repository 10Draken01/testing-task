import express from 'express';
import type { Express } from 'express';
import { InicializateEndPoints } from './infrastructure/dependency-injection/container.js';
import { errorHandler } from './infrastructure/middlewares/errorHandler.middleware.js';
import { corsMiddleware } from './infrastructure/middlewares/cors.middleware.js';

export function createApp(dbPath: string): Express {
  const app = express();
  app.use(corsMiddleware); 
  app.use(express.json());

  InicializateEndPoints(app, dbPath);
  app.use(errorHandler);
  return app;
}