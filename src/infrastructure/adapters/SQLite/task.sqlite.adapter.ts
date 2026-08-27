// src/infrastructure/adapters/task.sqlite.adapter.ts
import type Database from 'better-sqlite3';

import { SQLite } from './SQLite.js';
import type { TaskEntity } from '../../../domain/entities/task.entity.js';
import type { TaskDBPort } from '../../../domain/ports/taskDB.port.js';
import type { PaginationParams } from '../../../domain/shared/Pagination.js';

// Aqui heredamos de SQLite para poder usar el metodo generateUniqueId
export class TaskSQLiteAdapter extends SQLite implements TaskDBPort {
  constructor(db: Database.Database, name_table: string = 'tasks') {
    super(db, name_table);
  }

  async save(data: Omit<TaskEntity, 'id' | 'status'>): Promise<TaskEntity> {
    const id = this.generateUniqueId();
    this.db
      .prepare(`INSERT INTO ${this.name_table} (id, title, description, status) VALUES (?, ?, ?, ?)`)
      .run(id, data.title, data.description, 'open');
    return { id, ...data, status: 'open' };
  }

  async get(
    pagination: PaginationParams,
    status?: 'open' | 'archived',
  ): Promise<TaskEntity[]> {
    if (status) {
      return this.db
        .prepare(`SELECT * FROM ${this.name_table} WHERE status = ? LIMIT ? OFFSET ?`)
        .all(status, pagination.limit, pagination.offset) as TaskEntity[];
    }
    return this.db
      .prepare(`SELECT * FROM ${this.name_table} LIMIT ? OFFSET ?`)
      .all(pagination.limit, pagination.offset) as TaskEntity[];
  }

  async count(status?: 'open' | 'archived'): Promise<number> {
    const row = status
      ? this.db.prepare(`SELECT COUNT(*) as total FROM ${this.name_table} WHERE status = ?`).get(status)
      : this.db.prepare(`SELECT COUNT(*) as total FROM ${this.name_table}`).get();
    return (row as { total: number }).total;
  }

  async getById(id: string): Promise<TaskEntity | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.name_table} WHERE id = ?`)
      .get(id) as TaskEntity | undefined;
    return row ?? null;
  }

  async updateById(
    id: string,
    data: Partial<Omit<TaskEntity, 'id'>>,
  ): Promise<TaskEntity | null> {
    const current = await this.getById(id);
    if (!current) return null;

    const updated: TaskEntity = { ...current, ...data, id };
    this.db
      .prepare(`UPDATE ${this.name_table} SET title = ?, description = ?, status = ? WHERE id = ?`)
      .run(updated.title, updated.description, updated.status, id);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.prepare(`DELETE FROM ${this.name_table} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  async tryArchive(id: string): Promise<boolean> {
    const result = this.db
      .prepare(`UPDATE ${this.name_table} SET status = 'archived' WHERE id = ? AND status = 'open'`)
      .run(id);
    return result.changes > 0;
  }
}