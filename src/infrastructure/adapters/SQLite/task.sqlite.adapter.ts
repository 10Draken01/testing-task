// src/infrastructure/adapters/task.sqlite.adapter.ts
import type Database from 'better-sqlite3';

import { SQLite } from './SQLite.js';
import type { TaskEntity } from '../../../domain/entities/task.entity.js';
import type { TaskDBPort } from '../../../domain/ports/taskDB.port.js';

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

  async get(): Promise<TaskEntity[]> {
    return this.db.prepare(`SELECT * FROM ${this.name_table}`).all() as TaskEntity[];
  }

  async getById(id: string): Promise<TaskEntity | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.name_table} WHERE id = ?`)
      .get(id) as TaskEntity | undefined;
    return row ?? null;
  }

  async updateById(
    id: string,
    data: Partial<Omit<TaskEntity, 'id'>>
  ): Promise<TaskEntity | null> {
    const current = await this.getById(id);
    if (!current) return null;

    const updated: TaskEntity = { ...current, ...data, id };
    this.db
      .prepare(`UPDATE ${this.name_table} SET title = ?, description = ? WHERE id = ?`)
      .run(updated.title, updated.description, id);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.prepare(`DELETE FROM ${this.name_table} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  async tryArchive(id: string): Promise<boolean> {
    const result = this.db
      .prepare(`UPDATE tasks SET status = 'archived' WHERE id = ? AND status = 'open'`)
      .run(id);
    // changes > 0 solo si ESTA llamada fue la que cambió el estado.
    // Si otra ya lo había archivado, changes = 0, y así evitamos
    // notificar dos veces en el caso de los dos últimos usuarios simultáneos.
    return result.changes > 0;
  }
}