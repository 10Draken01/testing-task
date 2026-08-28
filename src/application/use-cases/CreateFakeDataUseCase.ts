import { faker } from '@faker-js/faker';

import type { UserDBPort } from '../../domain/ports/userDB.port.js';
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';

export class CreateFakeDataUseCase {
  constructor(
      private readonly taskDB: TaskDBPort,
      private readonly userDB: UserDBPort,
      private readonly assignmentDB: TaskAssignmentDBPort
    ) { }

  async execute(): Promise<any> {

    const assingments: 
      {
        user_id: string,
        task_id: string
      }[]
     = []
    
    for (let i = 0; i < 100; i++) {
      const name = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName: name, lastName: lastName });

      const user = await this.userDB.save({ name, lastName, email });

      const title = faker.lorem.words({ min: 2, max: 5 });
      const description = faker.lorem.sentence();
      const task = await this.taskDB.save({
        title: title,
        description: description ?? '',
        status: 'open',
      });
      if( i <=50 && task.id ) {
        assingments.push({
          user_id: user.id,
          task_id: task.id
        })
      }
    }

    for (const assignment of assingments) {
      await this.assignmentDB.save({
        taskId: assignment.task_id,
        userId: assignment.user_id,
        completed: false
      });
    }

    return {
      message: "Datos de prueba generados correctamente"
    }
  }
}