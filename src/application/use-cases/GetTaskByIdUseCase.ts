import { NotFoundError } from '../../domain/shared/errors.js';
import type { TaskEntity } from '../../domain/entities/task.entity.js';
import type { UserEntity } from '../../domain/entities/user.entity.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { UserDBPort } from '../../domain/ports/userDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';

export interface TaskDetail extends TaskEntity {
  assignedUsers: { user: UserEntity; completed: boolean }[];
}

export class GetTaskByIdUseCase {
  constructor(
    private readonly taskDB: TaskDBPort,
    private readonly userDB: UserDBPort,
    private readonly assignmentDB: TaskAssignmentDBPort,
  ) {}

  async execute(taskId: string): Promise<TaskDetail> {
    const task = await this.taskDB.getById(taskId);
    if (!task) throw new NotFoundError(`La tarea ${taskId} no existe`);

    const assignments = await this.assignmentDB.getByTaskId(taskId);
    const assignedUsers: { user: UserEntity; completed: boolean }[] = [];

    for (const a of assignments) {
      const user = await this.userDB.getById(a.userId);
      if (user) assignedUsers.push({ user, completed: a.completed });
    }

    return { ...task, assignedUsers };
  }
}