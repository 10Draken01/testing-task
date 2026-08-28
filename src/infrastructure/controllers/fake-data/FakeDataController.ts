import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { fakeDataMiddleware } from '../../middlewares/fakeData.middleware.js';

import type { CreateFakeDataUseCase } from '../../../application/use-cases/CreateFakeDataUseCase.js';

interface FakeDataControllerDeps {
  createFakeDataUseCase: CreateFakeDataUseCase;
}
 
export function createFakeDataController(deps: FakeDataControllerDeps): Router {
  const router = Router();
 
  router.post(
    '/fake-data',
    fakeDataMiddleware(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const response = await deps.createFakeDataUseCase.execute();
        res.status(201).json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}