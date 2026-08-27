import type { NotificationAttemptEntity } from '../entities/notificationAttempt.entity.js';

export interface NotificationDBPort {
  save(data: Omit<NotificationAttemptEntity, 'id'>): Promise<NotificationAttemptEntity>;
  getByTaskId(taskId: string): Promise<NotificationAttemptEntity[]>;
}