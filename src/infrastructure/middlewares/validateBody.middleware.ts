import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';
import { ValidationError } from '../../domain/shared/errors.js';

function formatZodMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join(' | ');
}

export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ValidationError(formatZodMessage(result.error)));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new ValidationError(formatZodMessage(result.error)));
    }
    res.locals.query = result.data;
    next();
  };
}