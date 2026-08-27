
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

import { SQLite } from './SQLite.js';
import type { UserEntity } from '../../../domain/entities/user.entity.js';
import type { UserDBPort } from '../../../domain/ports/userDB.port.js';
import type { PaginationParams } from '../../../domain/shared/Pagination.js';
import { ConflictError } from '../../../domain/shared/errors.js';

export class UserSQLiteAdapter extends SQLite implements UserDBPort {
  constructor(db: Database.Database, name_table: string = 'users') {
    super(db, name_table);
  }

  async save(data: Omit<UserEntity, 'id'>): Promise<UserEntity> {
    const id = this.generateUniqueId();
    try {
      this.db
        .prepare(`INSERT INTO ${this.name_table} (id, name, lastName, email) VALUES (?, ?, ?, ?)`)
        .run(id, data.name, data.lastName, data.email);
      return { id, ...data };
    } catch (err: any) {
      if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictError(`El email ${data.email} ya está registrado`);
      }
      throw err;
    }
  }

  async get(pagination: PaginationParams): Promise<UserEntity[]> {
    return this.db
      .prepare(`SELECT * FROM ${this.name_table} LIMIT ? OFFSET ?`)
      .all(pagination.limit, pagination.offset) as UserEntity[];
  }

  async count(): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) as total FROM users').get();
    return (row as { total: number }).total;
  }

  async getById(id: string): Promise<UserEntity | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.name_table} WHERE id = ?`)
      .get(id) as UserEntity | undefined;
    return row ?? null;
  }

  async updateById(
    id: string,
    data: Partial<Omit<UserEntity, 'id'>>
  ): Promise<UserEntity | null> {
    const current = await this.getById(id);
    if (!current) return null;

    const updated: UserEntity = { ...current, ...data, id };
    this.db
      .prepare(`UPDATE ${this.name_table} SET name = ?, lastName = ?, email = ? WHERE id = ?`)
      .run(updated.name, updated.lastName, updated.email, id);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.prepare(`DELETE FROM ${this.name_table} WHERE id = ?`).run(id);
    return result.changes > 0;
  }
}