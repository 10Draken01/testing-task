import type { TaskEntity } from "../entities/task.entity.js";

export interface TaskDBPort {
  save(data: Omit<TaskEntity, 'id'>): Promise<TaskEntity>;
  get(): Promise<TaskEntity[]>;
  getById(id: string): Promise<TaskEntity | null>;
  updateById(id: string, data: Partial<TaskEntity>): Promise<TaskEntity | null>;
  delete(id: string): Promise<boolean>;
  tryArchive(id: string): Promise<boolean>;
}