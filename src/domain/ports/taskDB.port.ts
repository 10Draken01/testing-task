import type { TaskEntity } from '../entities/task.entity.js';
import type { PaginationParams } from '../shared/Pagination.js';
 
export interface TaskDBPort {
  save(data: Omit<TaskEntity, 'id'>): Promise<TaskEntity>;
  get(pagination: PaginationParams, status?: 'open' | 'archived'): Promise<TaskEntity[]>;
  count(status?: 'open' | 'archived'): Promise<number>;
  getById(id: string): Promise<TaskEntity | null>;
  updateById(id: string, data: Partial<Omit<TaskEntity, 'id'>>): Promise<TaskEntity | null>;
  delete(id: string): Promise<boolean>;
  tryArchive(id: string): Promise<boolean>;
}