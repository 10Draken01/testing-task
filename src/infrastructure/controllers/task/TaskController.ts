import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { validateBody, validateQuery } from '../../middlewares/validateBody.middleware.js';
import { idempotencyMiddleware } from '../../middlewares/idempotency.middleware.js';
import {
  CreateTaskSchema,
  AssignUsersSchema,
  CompleteTaskSchema,
  ListTasksQuerySchema,
} from '../../validation/schemas.js';

import type { IdempotencyDBPort } from '../../../domain/ports/idempotencyDB.port.js';
import type { CreateTaskUseCase } from '../../../application/use-cases/CreateTaskUseCase.js';
import type { AssignUsersToTaskUseCase } from '../../../application/use-cases/AssignUsersToTaskUseCase.js';
import type { CompleteTaskUseCase } from '../../../application/use-cases/CompleteTaskUseCase.js';
import type { ListTasksUseCase } from '../../../application/use-cases/ListTasksUseCase.js';
import type { GetTaskByIdUseCase } from '../../../application/use-cases/GetTaskByIdUseCase.js';
import type { ListTaskNotificationsUseCase } from '../../../application/use-cases/ListTaskNotificationsUseCase.js';

interface TaskControllerDeps {
  createTaskUseCase: CreateTaskUseCase;
  assignUsersToTaskUseCase: AssignUsersToTaskUseCase;
  completeTaskUseCase: CompleteTaskUseCase;
  listTasksUseCase: ListTasksUseCase;
  getTaskByIdUseCase: GetTaskByIdUseCase;
  listTaskNotificationsUseCase: ListTaskNotificationsUseCase;
  idempotencyDB: IdempotencyDBPort;
}
 
export function createTaskController(deps: TaskControllerDeps): Router {
  const router = Router();
  const idempotency = idempotencyMiddleware(deps.idempotencyDB);
 
  router.post(
    '/tasks',
    idempotency,
    validateBody(CreateTaskSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const task = await deps.createTaskUseCase.execute(req.body);
        res.status(201).json(task);
      } catch (err) {
        next(err);
      }
    },
  );
 
  router.post(
    '/tasks/:idTask/assign',
    idempotency,
    validateBody(AssignUsersSchema),
    async (req: Request<{ idTask: string }>, res: Response, next: NextFunction) => {
      try {
        await deps.assignUsersToTaskUseCase.execute(req.params.idTask, req.body.userIds);
        res.status(200).json({ message: 'Usuarios asignados correctamente' });
      } catch (err) {
        next(err);
      }
    },
  );
 
  router.post(
    '/tasks/:idTask/complete',
    idempotency,
    validateBody(CompleteTaskSchema),
    async (req: Request<{ idTask: string }>, res: Response, next: NextFunction) => {
      try {
        await deps.completeTaskUseCase.execute(req.params.idTask, req.body.userId);
        res.status(200).json({ message: 'Tarea marcada como completada para el usuario' });
      } catch (err) {
        next(err);
      }
    },
  );
 
  router.get(
    '/tasks',
    validateQuery(ListTasksQuerySchema),
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const { page, limit, status } = res.locals.query as {
          page: number;
          limit: number;
          status?: 'open' | 'archived';
        };
        const result = await deps.listTasksUseCase.execute(page, limit, status);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );
 
  router.get(
    '/tasks/:idTask',
    async (req: Request<{ idTask: string }>, res: Response, next: NextFunction) => {
      try {
        const task = await deps.getTaskByIdUseCase.execute(req.params.idTask);
        res.status(200).json(task);
      } catch (err) {
        next(err);
      }
    },
  );
 
  router.get(
    '/tasks/:idTask/notifications',
    async (req: Request<{ idTask: string }>, res: Response, next: NextFunction) => {
      try {
        const notifications = await deps.listTaskNotificationsUseCase.execute(req.params.idTask);
        res.status(200).json(notifications);
      } catch (err) {
        next(err);
      }
    },
  );
 
  return router;
}