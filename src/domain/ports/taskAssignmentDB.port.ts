import type { TaskAssignmentEntity } from '../entities/taskAssignment.entity.js';

export interface TaskAssignmentDBPort {
  save(data: Omit<TaskAssignmentEntity, 'id'>): Promise<TaskAssignmentEntity>;
  getByTaskId(taskId: string): Promise<TaskAssignmentEntity[]>;
  getByUserId(userId: string): Promise<TaskAssignmentEntity[]>;
  getByTaskAndUser(taskId: string, userId: string): Promise<TaskAssignmentEntity | null>;
  updateById(id: string, data: Partial<Omit<TaskAssignmentEntity, 'id'>>): Promise<TaskAssignmentEntity | null>;
}