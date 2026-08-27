import { NotFoundError } from '../../domain/shared/errors.js';
import type { TaskEntity } from '../../domain/entities/task.entity.js';
import type { UserDBPort } from '../../domain/ports/userDB.port.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';

export interface UserTaskItem {
  task: TaskEntity;
  completed: boolean;
}

export class ListUserTasksUseCase {
  constructor(
    private readonly userDB: UserDBPort,
    private readonly assignmentDB: TaskAssignmentDBPort,
    private readonly taskDB: TaskDBPort,
  ) {}

  async execute(userId: string): Promise<UserTaskItem[]> {
    const user = await this.userDB.getById(userId);
    if (!user) throw new NotFoundError(`El usuario ${userId} no existe`);

    const assignments = await this.assignmentDB.getByUserId(userId);
    const result: UserTaskItem[] = [];

    for (const a of assignments) {
      const task = await this.taskDB.getById(a.taskId);
      if (task) result.push({ task, completed: a.completed });
    }

    return result;
  }
}