// src/infrastructure/adapters/httpNotifier.adapter.ts
import type { NotifierPort } from '../../../domain/ports/notifier.port.js';
import type { NotificationDBPort } from '../../../domain/ports/notificationDB.port.js';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500; // backoff: 500ms, 1000ms, 2000ms...

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HttpNotifierAdapter implements NotifierPort {
  constructor(
    private readonly notificationDB: NotificationDBPort,
    private readonly notifyUrl: string = process.env.NOTIFY_URL ?? '',
  ) {}

  async notifyTaskArchived(payload: {
    taskId: string;
    title: string;
    archivedAt: string;
  }): Promise<void> {
    if (!this.notifyUrl) {
      // Sin NOTIFY_URL configurada no tiene sentido intentar; lo dejamos
      // registrado igual para que quede visible en /notifications.
      await this.notificationDB.save({
        taskId: payload.taskId,
        attemptNumber: 1,
        timestamp: new Date().toISOString(),
        statusHttp: 0,
      });
      return;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const timestamp = new Date().toISOString();
      let statusHttp: number | undefined;

      try {
        const response = await fetch(this.notifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: payload.taskId,
            title: payload.title,
            archivedAt: payload.archivedAt,
          }),
        });

        statusHttp = response.status;

        await this.notificationDB.save({
          taskId: payload.taskId,
          attemptNumber: attempt,
          timestamp,
          statusHttp,
        });

        // Éxito: 2xx/3xx/4xx (4xx es error del cliente, no tiene sentido
        // reintentar un 400 esperando que cambie). Solo 5xx o no-respuesta reintentan.
        if (response.status < 500) {
          return;
        }
      } catch {
        // No hubo respuesta (timeout, DNS, conexión rechazada, etc.)
        await this.notificationDB.save({
          taskId: payload.taskId,
          attemptNumber: attempt,
          timestamp,
          statusHttp: 0,
        });
      }

      // Si no fue el último intento, esperamos antes de reintentar (backoff exponencial)
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
    // Se agotaron los 3 intentos; queda todo registrado en notification_attempts
    // y consultable vía GET /tasks/:idTask/notifications. No lanzamos error:
    // el archivado de la tarea ya ocurrió y es válido independientemente
    // de si la notificación externa se pudo entregar.
  }
}