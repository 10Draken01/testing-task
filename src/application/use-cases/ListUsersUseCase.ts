import type { UserEntity } from '../../domain/entities/user.entity.js';
import type { TaskEntity } from '../../domain/entities/task.entity.js';
import type { UserDBPort } from '../../domain/ports/userDB.port.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';

export interface UserListItem extends UserEntity {
  pendingTasks: TaskEntity[];
}

export class ListUsersUseCase {
  constructor(
    private readonly userDB: UserDBPort,
    private readonly assignmentDB: TaskAssignmentDBPort,
    private readonly taskDB: TaskDBPort,
  ) {}

  async execute(): Promise<UserListItem[]> {
    const users = await this.userDB.get();
    const result: UserListItem[] = [];

    for (const user of users) {
      const assignments = await this.assignmentDB.getByUserId(user.id);
      const pending = assignments.filter((a) => !a.completed);

      const pendingTasks: TaskEntity[] = [];
      for (const a of pending) {
        const task = await this.taskDB.getById(a.taskId);
        if (task) pendingTasks.push(task);
      }

      result.push({ ...user, pendingTasks });
    }

    return result;
  }
}