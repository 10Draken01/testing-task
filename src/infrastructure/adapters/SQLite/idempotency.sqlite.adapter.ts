import type Database from 'better-sqlite3';
import type { IdempotencyKeyEntity } from '../../../domain/entities/idempotencyKey.entity.js';
import type { IdempotencyDBPort } from '../../../domain/ports/idempotencyDB.port.js';

export class IdempotencySQLiteAdapter implements IdempotencyDBPort {
  constructor(private readonly db: Database.Database) {}

  tryCreate(data: {
    idempotencyKey: string;
    method: string;
    path: string;
    bodyHash: string;
    createdAt: string;
  }): { created: boolean } {
    try {
      this.db
        .prepare(
          `INSERT INTO idempotency_keys
             (idempotencyKey, method, path, bodyHash, status, createdAt)
           VALUES (?, ?, ?, ?, 'processing', ?)`
        )
        .run(data.idempotencyKey, data.method, data.path, data.bodyHash, data.createdAt);
      return { created: true };
    } catch (err: any) {
      // SQLITE_CONSTRAINT_PRIMARYKEY -> alguien ya tiene esta key
      if (err?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        return { created: false };
      }
      throw err;
    }
  }

  getByKey(idempotencyKey: string): IdempotencyKeyEntity | null {
    const row = this.db
      .prepare('SELECT * FROM idempotency_keys WHERE idempotencyKey = ?')
      .get(idempotencyKey) as any;
    if (!row) return null;
    return row as IdempotencyKeyEntity;
  }

  complete(
    idempotencyKey: string,
    data: { responseStatus: number; responseBody: string }
  ): void {
    this.db
      .prepare(
        `UPDATE idempotency_keys
         SET status = 'completed', responseStatus = ?, responseBody = ?
         WHERE idempotencyKey = ?`
      )
      .run(data.responseStatus, data.responseBody, idempotencyKey);
  }
}