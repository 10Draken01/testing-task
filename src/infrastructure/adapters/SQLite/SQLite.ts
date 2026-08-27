// src/infrastructure/adapters/task.sqlite.adapter.ts
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export class SQLite {
  constructor(
    protected readonly db: Database.Database,
    protected readonly name_table: string = ''
  ) {}

  protected generateUniqueId(): string {
    const checkStmt = this.db.prepare(`SELECT 1 FROM ${this.name_table} WHERE id = ?`);
    let id = randomUUID();
    while (checkStmt.get(id)) {
      id = randomUUID();
    }
    return id;
  }
}