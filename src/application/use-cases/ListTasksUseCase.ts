import type { TaskEntity } from '../../domain/entities/task.entity.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';
import type { PaginatedResult } from '../../domain/shared/Pagination.js';

export interface TaskListItem extends TaskEntity {
  assignments: { userId: string; completed: boolean }[];
}

export class ListTasksUseCase {
  constructor(
    private readonly taskDB: TaskDBPort,
    private readonly assignmentDB: TaskAssignmentDBPort,
  ) {}

  async execute(
    page: number = 1,
    limit: number,
    status?: 'open' | 'archived',
  ): Promise<PaginatedResult<TaskListItem>> {
    const offset = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      this.taskDB.get({ limit, offset }, status),
      this.taskDB.count(status),
    ]);

    const data: TaskListItem[] = [];
    for (const task of tasks) {
      const assignments = await this.assignmentDB.getByTaskId(task.id);
      data.push({
        ...task,
        assignments: assignments.map((a) => ({ userId: a.userId, completed: a.completed })),
      });
    }

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}