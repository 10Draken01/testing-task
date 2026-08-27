import { NotFoundError } from '../../domain/errors.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { UserDBPort } from '../../domain/ports/userDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';
import type { NotifierPort } from '../../domain/ports/notifier.port.js';

export class CompleteTaskUseCase {
  constructor(
    private readonly taskDB: TaskDBPort,
    private readonly userDB: UserDBPort,
    private readonly assignmentDB: TaskAssignmentDBPort,
    private readonly notifier: NotifierPort,
  ) {}

  async execute(taskId: string, userId: string): Promise<void> {
    const task = await this.taskDB.getById(taskId);
    if (!task) throw new NotFoundError(`La tarea ${taskId} no existe`);

    const user = await this.userDB.getById(userId);
    if (!user) throw new NotFoundError(`El usuario ${userId} no existe`);

    const assignment = await this.assignmentDB.getByTaskAndUser(taskId, userId);
    if (!assignment) {
      throw new NotFoundError(`El usuario ${userId} no está asignado a la tarea ${taskId}`);
    }

    if (!assignment.completed) {
      await this.assignmentDB.updateById(assignment.id, { completed: true });
    }

    const allAssignments = await this.assignmentDB.getByTaskId(taskId);
    const allCompleted = allAssignments.every((a) => a.completed);

    if (allCompleted) {
      const didArchiveNow = await this.taskDB.tryArchive(taskId);

      if (didArchiveNow) {
        await this.notifier.notifyTaskArchived({
          taskId,
          title: task.title,
          archivedAt: new Date().toISOString(),
        });
      }
    }
  }
}