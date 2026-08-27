import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { IdempotencyDBPort } from '../../domain/ports/idempotencyDB.port.js';
import {
  MissingIdempotencyKeyError,
  ConflictError,
  IdempotencyKeyMismatchError,
  IdempotencyInProgressError,
} from '../../domain/errors.js';

function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

export function idempotencyMiddleware(idempotencyDB: IdempotencyDBPort) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.header('Idempotency-Key');
    if (!key)  {
      return next(new MissingIdempotencyKeyError('El header Idempotency-Key es obligatorio'));
    };

    const bodyHash = hashBody(req.body);
    const { created } = idempotencyDB.tryCreate({
      idempotencyKey: key,
      method: req.method,
      path: req.path,
      bodyHash,
      createdAt: new Date().toISOString(),
    });

    if (created) {
      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        idempotencyDB.complete(key, {
          responseStatus: res.statusCode,
          responseBody: JSON.stringify(body),
        });
        return originalJson(body);
      };
      return next();
    }

    const existing = idempotencyDB.getByKey(key);

    if (!existing) {
      return next(new ConflictError('Conflicto procesando Idempotency-Key'));
    }

    if (existing.bodyHash !== bodyHash) {
      return next(new IdempotencyKeyMismatchError('Idempotency-Key ya usada con un body diferente'));
    }

    if (existing.status === 'completed') {
      res.status(existing.responseStatus ?? 200).json(
        existing.responseBody ? JSON.parse(existing.responseBody) : {},
      );
      return;
    }

    return next(new IdempotencyInProgressError('La operación con esta Idempotency-Key todavía se está procesando'));
  };
}