import type { Request, Response, NextFunction } from 'express';
import {
  UnauthorizedError
} from '../../domain/shared/errors.js';

export function fakeDataMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.header('Admin-Password');
    if (!key)  {
      return next(new UnauthorizedError('No tienes autorización para generar datos de prueba'));
    };

    if (key !== process.env.ADMIN_PASSWORD) {
      return next(new UnauthorizedError('No tienes autorización para generar datos de prueba'));
    }

    return next();
  };
}