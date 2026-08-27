import type { UserEntity } from '../../domain/entities/user.entity.js';
import type { TaskEntity } from '../../domain/entities/task.entity.js';
import type { UserDBPort } from '../../domain/ports/userDB.port.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';
import type { PaginatedResult } from '../../domain/shared/Pagination.js';

export interface UserListItem extends UserEntity {
  pendingTasks: TaskEntity[];
}

export class ListUsersUseCase {
  constructor(
    private readonly userDB: UserDBPort,
    private readonly assignmentDB: TaskAssignmentDBPort,
    private readonly taskDB: TaskDBPort,
  ) {}

  async execute(page: number, limit: number): Promise<PaginatedResult<UserListItem>> {
    const offset = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userDB.get({ limit, offset }),
      this.userDB.count(),
    ]);

    const data: UserListItem[] = [];
    for (const user of users) {
      const assignments = await this.assignmentDB.getByUserId(user.id);
      const pending = assignments.filter((a) => !a.completed);
      const pendingTasks: TaskEntity[] = [];
      for (const a of pending) {
        const task = await this.taskDB.getById(a.taskId);
        if (task) pendingTasks.push(task);
      }
      data.push({ ...user, pendingTasks });
    }

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}