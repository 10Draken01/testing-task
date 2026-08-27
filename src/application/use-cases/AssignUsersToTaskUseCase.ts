import { NotFoundError, ValidationError } from '../../domain/errors.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { UserDBPort } from '../../domain/ports/userDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';

export class AssignUsersToTaskUseCase {
  constructor(
    private readonly taskDB: TaskDBPort,
    private readonly userDB: UserDBPort,
    private readonly assignmentDB: TaskAssignmentDBPort,
  ) {}

  async execute(taskId: string, userIds: string[]): Promise<void> {
    if (!userIds || userIds.length === 0) {
      throw new ValidationError('userIds es obligatorio y no puede estar vacío');
    }

    const task = await this.taskDB.getById(taskId);
    if (!task) throw new NotFoundError(`La tarea ${taskId} no existe`);

    for (const userId of userIds) {
      const user = await this.userDB.getById(userId);
      if (!user) throw new NotFoundError(`El usuario ${userId} no existe`);
    }

    for (const userId of userIds) {
      const existing = await this.assignmentDB.getByTaskAndUser(taskId, userId);
      if (!existing) {
        await this.assignmentDB.save({ taskId, userId, completed: false });
      }
    }
  }
}