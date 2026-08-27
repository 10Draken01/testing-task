import type { IdempotencyKeyEntity } from '../entities/idempotencyKey.entity.js';

export interface IdempotencyDBPort {
  tryCreate(data: {
    idempotencyKey: string;
    method: string;
    path: string;
    bodyHash: string;
    createdAt: string;
  }): { created: boolean };

  getByKey(idempotencyKey: string): IdempotencyKeyEntity | null;

  complete(
    idempotencyKey: string,
    data: { responseStatus: number; responseBody: string }
  ): void;
}