# API Reference — TaskNotification

Documentación completa de cada endpoint. Para instrucciones de instalación, decisiones técnicas y supuestos, ver el [README](../README.md).

## Formato de errores

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Descripción del problema" } }
```

| Code                        | Status | Cuándo ocurre                                                          |
|------------------------------|:------:|--------------------------------------------------------------------------|
| `VALIDATION_ERROR`          | 400    | Falta un campo obligatorio o tiene un formato inválido.                 |
| `NOT_FOUND`                 | 404    | La tarea o el usuario referenciado no existe.                           |
| `CONFLICT`                  | 409    | Ej: email duplicado al crear usuario.                                   |
| `IDEMPOTENCY_KEY_REQUIRED`  | 400    | No se envió el header `Idempotency-Key` en un `POST`.                   |
| `IDEMPOTENCY_KEY_MISMATCH`  | 422    | Se reusó una `Idempotency-Key` con un body distinto al original.        |
| `IDEMPOTENCY_IN_PROGRESS`   | 409    | La operación con esa `Idempotency-Key` sigue procesándose (timeout).    |
| `RATE_LIMIT_EXCEEDED`       | 429    | Se superó el límite de requests permitido para esta IP (mejora extra).  |
| `INTERNAL_ERROR`            | 500    | Error no controlado.                                                    |

## Idempotencia (header `Idempotency-Key`, obligatorio en todo POST)

- Si no se envía el header, `400 IDEMPOTENCY_KEY_REQUIRED`.
- Mismo body + misma key → se ejecuta una sola vez, ambas respuestas idénticas (incluso en paralelo).
- Body distinto + misma key → `422 IDEMPOTENCY_KEY_MISMATCH`.
- Se recomienda un UUID v4 generado en el cliente por cada operación nueva (no por cada reintento de la misma).

---

## `POST /users`

Registra un usuario.

**Body:** `{ "name": "Ana", "lastName": "Pérez", "email": "ana@test.com" }`

**201:** `{ "id": "...", "name": "Ana", "lastName": "Pérez", "email": "ana@test.com" }`

**Errores:** `400` (falta `name`/`lastName`/`email`, email inválido, o falta `Idempotency-Key`). `409` (email duplicado).

## `GET /users`

Lista usuarios con sus tareas pendientes.

**200:** `[{ "id": "...", "name": "...", "lastName": "...", "email": "...", "pendingTasks": [ { "id": "...", "title": "...", "status": "open" } ] }]`

## `GET /users/:idUser/tasks`

Tareas asignadas a un usuario, indicando si completó su parte.

**200:** `[{ "task": { "id": "...", "title": "...", "status": "open" }, "completed": false }]`

**Errores:** `404` (usuario inexistente).

## `POST /tasks`

Registra una tarea. Estado por defecto `"open"`. `description` es opcional (default `""`).

**Body:** `{ "title": "Comprar leche", "description": "Marca La Serenísima" }`

**201:** `{ "id": "...", "title": "...", "description": "...", "status": "open" }`

**Errores:** `400` (falta `title` o `Idempotency-Key`).

## `GET /tasks`

**Query opcional:** `?status=open|archived`

**200:** `[{ "id": "...", "title": "...", "status": "open", "assignments": [{ "userId": "...", "completed": false }] }]`

**Errores:** `400` (`status` inválido).

## `GET /tasks/:idTask`

Detalle completo de una tarea, con usuarios asignados y si cada uno completó.

**200:** `{ "id": "...", "title": "...", "status": "archived", "assignedUsers": [{ "user": {...}, "completed": true }] }`

**Errores:** `404` (tarea inexistente).

## `POST /tasks/:idTask/assign`

Asigna usuarios a una tarea. Si un usuario ya estaba asignado, no se duplica.

**Body:** `{ "userIds": ["idUser1", "idUser2"] }`

**200:** `{ "message": "Usuarios asignados correctamente" }`

**Errores:** `400` (`userIds` vacío/falta, o falta `Idempotency-Key`). `404` (tarea o algún usuario no existen).

## `POST /tasks/:idTask/complete`

Marca completada la parte de un usuario. Cuando todos completaron, la tarea pasa a `"archived"` y se dispara la notificación.

**Body:** `{ "userId": "idUser1" }`

**200:** `{ "message": "Tarea marcada como completada para el usuario" }`

**Errores:** `400` (falta `userId` o `Idempotency-Key`). `404` (tarea/usuario inexistente, o usuario no asignado a esa tarea).

## `GET /tasks/:idTask/notifications`

Intentos de notificación de archivado (número de intento, timestamp, status HTTP obtenido).

**200:** `[{ "id": "...", "taskId": "...", "attemptNumber": 1, "timestamp": "...", "statusHttp": 500 }]`

**Errores:** `404` (tarea inexistente).

---

## Notificaciones de archivado

Al archivar una tarea, `POST` a `NOTIFY_URL` con `{ "taskId", "title", "archivedAt" }`. Si responde `5xx` o no responde, reintenta con backoff creciente hasta 3 intentos, cada uno auditado en `notification_attempts`. El archivado de la tarea es independiente del resultado del envío.

## Rate limiting (mejora extra, fuera del alcance obligatorio)

Límite global por IP (`RATE_LIMIT_MAX`, default 100 requests por `RATE_LIMIT_WINDOW_MS`, default 60s). Al superarlo: `429 RATE_LIMIT_EXCEEDED`. Se agregó como medida de seguridad básica contra abuso/DoS, sin costo de infraestructura adicional. Headers `RateLimit-*` incluidos en la respuesta.

## Ejemplo de flujo completo (curl)

```bash
curl -X POST https://testing-task.online/users \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3f1a9c2e-1111-4a2b-8c3d-000000000001" \
  -d '{"name":"Ana","lastName":"Pérez","email":"ana@test.com"}'

curl -X POST https://testing-task.online/tasks \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3f1a9c2e-2222-4a2b-8c3d-000000000002" \
  -d '{"title":"Comprar leche"}'

curl -X POST https://testing-task.online/tasks/<idTask>/assign \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3f1a9c2e-3333-4a2b-8c3d-000000000003" \
  -d '{"userIds":["<idUser>"]}'

curl -X POST https://testing-task.online/tasks/<idTask>/complete \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3f1a9c2e-4444-4a2b-8c3d-000000000004" \
  -d '{"userId":"<idUser>"}'

curl https://testing-task.online/tasks/<idTask>/notifications
```