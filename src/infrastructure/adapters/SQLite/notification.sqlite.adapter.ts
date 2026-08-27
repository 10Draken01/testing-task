import type Database from 'better-sqlite3';
import { SQLite } from './SQLite.js';
import type { NotificationAttemptEntity } from '../../../domain/entities/notificationAttempt.entity.js';
import type { NotificationDBPort } from '../../../domain/ports/notificationDB.port.js';

export class NotificationSQLiteAdapter extends SQLite implements NotificationDBPort {
  constructor(db: Database.Database, name_table: string = 'notification_attempts') {
    super(db, name_table);
  }

  async save(
    data: Omit<NotificationAttemptEntity, 'id'>
  ): Promise<NotificationAttemptEntity> {
    const id = this.generateUniqueId();
    this.db
      .prepare(
        `INSERT INTO ${this.name_table} (id, taskId, attemptNumber, timestamp, statusHttp)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, data.taskId, data.attemptNumber, data.timestamp, data.statusHttp ?? null);
    return { id, ...data };
  }

  async getByTaskId(taskId: string): Promise<NotificationAttemptEntity[]> {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.name_table} WHERE taskId = ? ORDER BY attemptNumber ASC`)
      .all(taskId) as any[];
    return rows.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      attemptNumber: row.attemptNumber,
      timestamp: row.timestamp,
      statusHttp: row.statusHttp ?? undefined,
    }));
  }
}