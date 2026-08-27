import { ValidationError } from '../../domain/shared/errors.js';
import type { TaskEntity } from '../../domain/entities/task.entity.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';

export class CreateTaskUseCase {
  constructor(private readonly taskDB: TaskDBPort) {}

  async execute(input: { title: string; description?: string }): Promise<TaskEntity> {
    if (!input.title?.trim()) {
      throw new ValidationError('El título es obligatorio');
    }

    return this.taskDB.save({
      title: input.title,
      description: input.description ?? '',
      status: 'open',
    });
  }
}