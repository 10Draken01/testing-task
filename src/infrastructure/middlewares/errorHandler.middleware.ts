import type { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../domain/errors.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction, // Express exige 4 parámetros para reconocerlo como error handler
): void {
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // Error no controlado (bug, excepción de SQLite no mapeada, etc.)
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' },
  });
}