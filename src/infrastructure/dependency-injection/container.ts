import Express from 'express';

import { inicializateDatabase } from '../adapters/SQLite/conection.js';

// Ports
import type { TaskDBPort } from '../../domain/ports/taskDB.port.js';
import type { UserDBPort } from '../../domain/ports/userDB.port.js';
import type { TaskAssignmentDBPort } from '../../domain/ports/taskAssignmentDB.port.js';
import type { NotificationDBPort } from '../../domain/ports/notificationDB.port.js';
import type { IdempotencyDBPort } from '../../domain/ports/idempotencyDB.port.js';
import type { NotifierPort } from '../../domain/ports/notifier.port.js';

// Adapters SQLite
import { UserSQLiteAdapter } from '../adapters/SQLite/user.sqlite.adapter.js';
import { TaskSQLiteAdapter } from '../adapters/SQLite/task.sqlite.adapter.js';
import { TaskAssignmentSQLiteAdapter } from '../adapters/SQLite/taskAssignment.sqlite.adapter.js';
import { NotificationSQLiteAdapter } from '../adapters/SQLite/notification.sqlite.adapter.js';
import { IdempotencySQLiteAdapter } from '../adapters/SQLite/idempotency.sqlite.adapter.js';

// Adapter de notificación externa (no es SQLite)
import { HttpNotifierAdapter } from '../adapters/Notifier/httpNotifier.adapter.js';

// Use cases
import { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase.js';
import { ListUsersUseCase } from '../../application/use-cases/ListUsersUseCase.js';
import { ListUserTasksUseCase } from '../../application/use-cases/ListUserTasksUseCase.js';
import { CreateTaskUseCase } from '../../application/use-cases/CreateTaskUseCase.js';
import { AssignUsersToTaskUseCase } from '../../application/use-cases/AssignUsersToTaskUseCase.js';
import { CompleteTaskUseCase } from '../../application/use-cases/CompleteTaskUseCase.js';
import { ListTasksUseCase } from '../../application/use-cases/ListTasksUseCase.js';
import { GetTaskByIdUseCase } from '../../application/use-cases/GetTaskByIdUseCase.js';
import { ListTaskNotificationsUseCase } from '../../application/use-cases/ListTaskNotificationsUseCase.js';

import { CreateFakeDataUseCase } from '../../application/use-cases/CreateFakeDataUseCase.js';

// Controllers
import { createUserController } from '../controllers/user/UserController.js';
import { createTaskController } from '../controllers/task/TaskController.js';
import { createFakeDataController } from '../controllers/fake-data/FakeDataController.js';

export function InicializateEndPoints(app: Express.Application, db_path: string): void {
    const db = inicializateDatabase(db_path);

    // --- Adapters (implementan los ports) ---
    const user_db_repository: UserDBPort = new UserSQLiteAdapter(db);
    const task_db_repository: TaskDBPort = new TaskSQLiteAdapter(db);
    const task_assignment_db_repository: TaskAssignmentDBPort = new TaskAssignmentSQLiteAdapter(db);
    const notification_db_repository: NotificationDBPort = new NotificationSQLiteAdapter(db);
    const idempotency_db_repository: IdempotencyDBPort = new IdempotencySQLiteAdapter(db);
    const notifier: NotifierPort = new HttpNotifierAdapter(notification_db_repository);

    // --- Use cases (reciben los ports, no los adapters concretos) ---
    const createUserUseCase = new CreateUserUseCase(user_db_repository);
    const listUsersUseCase = new ListUsersUseCase(
        user_db_repository,
        task_assignment_db_repository,
        task_db_repository,
    );
    const listUserTasksUseCase = new ListUserTasksUseCase(
        user_db_repository,
        task_assignment_db_repository,
        task_db_repository,
    );

    const createTaskUseCase = new CreateTaskUseCase(task_db_repository);
    const assignUsersToTaskUseCase = new AssignUsersToTaskUseCase(
        task_db_repository,
        user_db_repository,
        task_assignment_db_repository,
    );
    const completeTaskUseCase = new CompleteTaskUseCase(
        task_db_repository,
        user_db_repository,
        task_assignment_db_repository,
        notifier,
    );
    const listTasksUseCase = new ListTasksUseCase(task_db_repository, task_assignment_db_repository);
    const getTaskByIdUseCase = new GetTaskByIdUseCase(
        task_db_repository,
        user_db_repository,
        task_assignment_db_repository,
    );
    const listTaskNotificationsUseCase = new ListTaskNotificationsUseCase(
        task_db_repository,
        notification_db_repository,
    );

    const createFakeDataUseCase = new CreateFakeDataUseCase(
        task_db_repository,
        user_db_repository,
        task_assignment_db_repository
    );

    // --- Controllers (reciben solo los use cases que necesitan) ---
    const userController = createUserController({
        createUserUseCase,
        listUsersUseCase,
        listUserTasksUseCase,
        idempotencyDB: idempotency_db_repository,
    });

    const taskController = createTaskController({
        createTaskUseCase,
        assignUsersToTaskUseCase,
        completeTaskUseCase,
        listTasksUseCase,
        getTaskByIdUseCase,
        listTaskNotificationsUseCase,
        idempotencyDB: idempotency_db_repository
    });

    const fakeDataController = createFakeDataController({
        createFakeDataUseCase,
    });

    // --- Registro de rutas ---
    app.get('/', (_req, res) => {
        res.json({ message: 'Hello World' });
    });

    app.use(userController);
    app.use(taskController);

    app.use(fakeDataController);
}