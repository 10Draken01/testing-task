// src/infrastructure/controllers/UserController.ts
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { validateBody } from '../../middlewares/validateBody.middleware.js';
import { idempotencyMiddleware } from '../../middlewares/idempotency.middleware.js';
import { CreateUserSchema } from '../../validation/schemas.js';

import type { IdempotencyDBPort } from '../../../domain/ports/idempotencyDB.port.js';
import type { CreateUserUseCase } from '../../../application/use-cases/CreateUserUseCase.js';
import type { ListUsersUseCase } from '../../../application/use-cases/ListUsersUseCase.js';
import type { ListUserTasksUseCase } from '../../../application/use-cases/ListUserTasksUseCase.js';

interface UserControllerDeps {
  createUserUseCase: CreateUserUseCase;
  listUsersUseCase: ListUsersUseCase;
  listUserTasksUseCase: ListUserTasksUseCase;
  idempotencyDB: IdempotencyDBPort;
}

export function createUserController(deps: UserControllerDeps): Router {
  const router = Router();
  const idempotency = idempotencyMiddleware(deps.idempotencyDB);

  router.post(
    '/users',
    idempotency,
    validateBody(CreateUserSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await deps.createUserUseCase.execute(req.body);
        res.status(201).json(user);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await deps.listUsersUseCase.execute();
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/users/:idUser/tasks',
    async (req: Request<{ idUser: string }>, res: Response, next: NextFunction) => {
      try {
        const tasks = await deps.listUserTasksUseCase.execute(req.params.idUser);
        res.status(200).json(tasks);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}