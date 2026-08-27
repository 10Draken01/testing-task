import { NotFoundError } from '../../domain/errors.js';
import type { NotificationAttemptEntity } from '../../domain/entities/notificationAttempt.entity.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { NotificationDBPort } from '../../domain/ports/notificationDB.port.js';

export class ListTaskNotificationsUseCase {
  constructor(
    private readonly taskDB: TaskDBPort,
    private readonly notificationDB: NotificationDBPort,
  ) {}

  async execute(taskId: string): Promise<NotificationAttemptEntity[]> {
    const task = await this.taskDB.getById(taskId);
    if (!task) throw new NotFoundError(`La tarea ${taskId} no existe`);

    return this.notificationDB.getByTaskId(taskId);
  }
}