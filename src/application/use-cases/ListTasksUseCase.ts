import type { TaskEntity } from '../../domain/entities/task.entity.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';

export interface TaskListItem extends TaskEntity {
  assignments: { userId: string; completed: boolean }[];
}

export class ListTasksUseCase {
  constructor(
    private readonly taskDB: TaskDBPort,
    private readonly assignmentDB: TaskAssignmentDBPort,
  ) {}

  async execute(status?: 'open' | 'archived'): Promise<TaskListItem[]> {
    const tasks = await this.taskDB.get();
    const filtered = status ? tasks.filter((t) => t.status === status) : tasks;

    const result: TaskListItem[] = [];
    for (const task of filtered) {
      const assignments = await this.assignmentDB.getByTaskId(task.id);
      result.push({
        ...task,
        assignments: assignments.map((a) => ({ userId: a.userId, completed: a.completed })),
      });
    }
    return result;
  }
}