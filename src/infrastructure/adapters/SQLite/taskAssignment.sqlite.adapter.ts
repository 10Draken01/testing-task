// src/infrastructure/adapters/taskAssignment.sqlite.adapter.ts
import type Database from 'better-sqlite3';
import { SQLite } from './SQLite.js';
import type { TaskAssignmentEntity } from '../../../domain/entities/taskAssignment.entity.js';
import type { TaskAssignmentDBPort } from '../../../domain/ports/taskAssignmentDB.port.js';

export class TaskAssignmentSQLiteAdapter extends SQLite implements TaskAssignmentDBPort {
  constructor(db: Database.Database, name_table: string = 'task_assignments') {
    super(db, name_table);
  }

  async save(data: Omit<TaskAssignmentEntity, 'id'>): Promise<TaskAssignmentEntity> {
    const id = this.generateUniqueId();
    this.db
      .prepare(
        `INSERT INTO ${this.name_table} (id, taskId, userId, completed) VALUES (?, ?, ?, ?)`
      )
      .run(id, data.taskId, data.userId, data.completed ? 1 : 0);
    return { id, ...data };
  }

  async getByTaskId(taskId: string): Promise<TaskAssignmentEntity[]> {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.name_table} WHERE taskId = ?`)
      .all(taskId) as any[];
    return rows.map(this.mapRow);
  }

  async getByUserId(userId: string): Promise<TaskAssignmentEntity[]> {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.name_table} WHERE userId = ?`)
      .all(userId) as any[];
    return rows.map(this.mapRow);
  }

  async getByTaskAndUser(taskId: string, userId: string): Promise<TaskAssignmentEntity | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.name_table} WHERE taskId = ? AND userId = ?`)
      .get(taskId, userId) as any;
    return row ? this.mapRow(row) : null;
  }

  async updateById(
    id: string,
    data: Partial<Omit<TaskAssignmentEntity, 'id'>>
  ): Promise<TaskAssignmentEntity | null> {
    const current = this.db
      .prepare(`SELECT * FROM ${this.name_table} WHERE id = ?`)
      .get(id) as any;
    if (!current) return null;

    const updated = { ...this.mapRow(current), ...data, id };
    this.db
      .prepare(
        `UPDATE ${this.name_table} SET taskId = ?, userId = ?, completed = ? WHERE id = ?`
      )
      .run(updated.taskId, updated.userId, updated.completed ? 1 : 0, id);

    return updated;
  }

  // SQLite guarda booleans como 0/1; los normalizamos al leer
  private mapRow(row: any): TaskAssignmentEntity {
    return {
      id: row.id,
      taskId: row.taskId,
      userId: row.userId,
      completed: !!row.completed,
    };
  }
}