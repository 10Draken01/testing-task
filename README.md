# TaskNotification API

API REST para gestión de tareas y usuarios, con asignación de tareas, notificaciones de archivado con reintentos, e idempotencia en operaciones de escritura.

🔗 **API desplegada:** [https://testing-task.online/](https://testing-task.online/)

> **Nota:** desplegada en el free tier de Render. La instancia se "duerme" tras ~15 min de inactividad (el primer request después puede tardar 30-50s en responder), y la base de datos SQLite no tiene disco persistente garantizado — puede resetearse en un redeploy o reinicio. Suficiente para testing/demo; no apto para producción real sin upgrade de plan.

## Stack

- Node.js + Express 5
- TypeScript (ESM, `type: "module"`)
- SQLite (`better-sqlite3`)
- Validación con Zod
- Tests con Vitest + Supertest

---

## Instalación

```bash
npm install
```

Creá un archivo `.env` en la raíz del proyecto (ver `.env.example` si existe, o copiá esto):

```env
PORT=3000
DB_PATH=./data.db
NOTIFY_URL=https://tu-endpoint-de-notificaciones.com/notify
```

| Variable     | Descripción                                                                 | Obligatoria |
|--------------|------------------------------------------------------------------------------|:-----------:|
| `PORT`       | Puerto donde levanta el servidor. Default: `3000`.                          | No           |
| `DB_PATH`    | Ruta del archivo SQLite. Default: `./data.db`.                              | No           |
| `NOTIFY_URL` | URL externa a la que se notifica cuando una tarea se archiva.               | Sí*          |
| `RATE_LIMIT_WINDOW_MS` | Ventana de tiempo (ms) para el rate limiting. Default: `60000` (1 min). | No |
| `RATE_LIMIT_MAX`       | Máximo de requests por IP dentro de la ventana. Default: `100`.        | No |

\* Si no se configura, las notificaciones quedan registradas localmente sin intentar el envío HTTP.

## Levantar la API

```bash
npm run dev     # con recarga automática (tsx)
npm start       # producción
```

La base de datos SQLite se crea automáticamente en `DB_PATH` la primera vez que corre la app (tablas incluidas).

## Correr los tests

```bash
npm test          # corre todos los tests una vez
npm run test:watch  # modo watch
```

Los tests usan una base de datos SQLite en memoria (`:memory:`), aislada por test — no tocan tu `data.db` de desarrollo.

---

## Formato de errores

Toda respuesta de error sigue este formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descripción del problema"
  }
}
```

| Code                        | Status | Cuándo ocurre                                                          |
|-----------------------------|:------:|--------------------------------------------------------------------------|
| `VALIDATION_ERROR`          | 400    | Falta un campo obligatorio o tiene un formato inválido.                 |
| `NOT_FOUND`                 | 404    | La tarea o el usuario referenciado no existe.                           |
| `CONFLICT`                  | 409    | Ej: email duplicado al crear usuario.                                   |
| `IDEMPOTENCY_KEY_REQUIRED`  | 400    | No se envió el header `Idempotency-Key` en un `POST`.                   |
| `IDEMPOTENCY_KEY_MISMATCH`  | 422    | Se reusó una `Idempotency-Key` con un body distinto al original.        |
| `IDEMPOTENCY_IN_PROGRESS`   | 409    | La operación con esa `Idempotency-Key` sigue procesándose (timeout).    |
| `RATE_LIMIT_EXCEEDED`       | 429    | Se superó el límite de requests permitido para esta IP.                 |
| `INTERNAL_ERROR`            | 500    | Error no controlado.                                                    |

---

## Idempotencia (header `Idempotency-Key`)

Todos los endpoints `POST` **requieren** el header `Idempotency-Key`:

```
Idempotency-Key: <string-único-que-generás-vos-por-request>
```

- Si no se envía el header, la API responde `400 IDEMPOTENCY_KEY_REQUIRED`.
- Si reenviás el **mismo body** con la **misma key**, la operación se ejecuta una sola vez y ambas respuestas son idénticas (incluso si llegan en paralelo).
- Si reusás la key con un **body distinto**, la API responde `422 IDEMPOTENCY_KEY_MISMATCH`.

Se recomienda usar un UUID v4 generado en el cliente antes de cada intento de operación (no uno nuevo por reintento).

---

## Endpoints

### `POST /users`

Registra un usuario. Requiere header `Idempotency-Key`.

**Body:**
```json
{
  "name": "Ana",
  "lastName": "Pérez",
  "email": "ana@test.com"
}
```

**Respuesta `201`:**
```json
{
  "id": "a1b2c3...",
  "name": "Ana",
  "lastName": "Pérez",
  "email": "ana@test.com"
}
```

**Errores:** `400` si falta `name`, `lastName` o `email`, si el email no es válido, o si falta el header `Idempotency-Key`. `409` si el email ya está registrado.

---

### `GET /users`

Lista todos los usuarios, con sus tareas pendientes (asignadas y no completadas).

**Respuesta `200`:**
```json
[
  {
    "id": "a1b2c3...",
    "name": "Ana",
    "lastName": "Pérez",
    "email": "ana@test.com",
    "pendingTasks": [
      { "id": "t1...", "title": "Comprar leche", "description": "", "status": "open" }
    ]
  }
]
```

---

### `GET /users/:idUser/tasks`

Lista todas las tareas asignadas a un usuario, indicando si completó su parte.

**Respuesta `200`:**
```json
[
  {
    "task": { "id": "t1...", "title": "Comprar leche", "description": "", "status": "open" },
    "completed": false
  }
]
```

**Errores:** `404` si el usuario no existe.

---

### `POST /tasks`

Registra una tarea. Estado por defecto: `"open"`. Requiere header `Idempotency-Key`.

**Body:**
```json
{
  "title": "Comprar leche",
  "description": "Marca La Serenísima"
}
```

`description` es opcional (default: `""`). `title` es obligatorio.

**Respuesta `201`:**
```json
{
  "id": "t1...",
  "title": "Comprar leche",
  "description": "Marca La Serenísima",
  "status": "open"
}
```

**Errores:** `400` si falta `title` o el header `Idempotency-Key`.

---

### `GET /tasks`

Lista todas las tareas, indicando qué usuarios ya completaron su parte.

**Query params opcionales:**

| Param    | Valores            |
|----------|---------------------|
| `status` | `open` \| `archived` |

Ejemplo: `GET /tasks?status=open`

**Respuesta `200`:**
```json
[
  {
    "id": "t1...",
    "title": "Comprar leche",
    "description": "",
    "status": "open",
    "assignments": [
      { "userId": "a1b2c3...", "completed": false }
    ]
  }
]
```

**Errores:** `400` si `status` no es `open` ni `archived`.

---

### `GET /tasks/:idTask`

Devuelve el detalle completo de una tarea.

**Respuesta `200`:**
```json
{
  "id": "t1...",
  "title": "Comprar leche",
  "description": "",
  "status": "archived",
  "assignedUsers": [
    {
      "user": { "id": "a1b2c3...", "name": "Ana", "lastName": "Pérez", "email": "ana@test.com" },
      "completed": true
    }
  ]
}
```

**Errores:** `404` si la tarea no existe.

---

### `POST /tasks/:idTask/assign`

Asigna uno o más usuarios a una tarea. Si un usuario ya estaba asignado, no se duplica la relación. Requiere header `Idempotency-Key`.

**Body:**
```json
{
  "userIds": ["a1b2c3...", "d4e5f6..."]
}
```

**Respuesta `200`:**
```json
{ "message": "Usuarios asignados correctamente" }
```

**Errores:** `400` si `userIds` falta/está vacío, o si falta el header `Idempotency-Key`. `404` si la tarea o alguno de los usuarios no existen.

---

### `POST /tasks/:idTask/complete`

Marca como completada la parte de un usuario en una tarea. Cuando **todos** los usuarios asignados completaron, la tarea pasa a `"archived"` y se dispara la notificación (ver abajo). Requiere header `Idempotency-Key`.

**Body:**
```json
{
  "userId": "a1b2c3..."
}
```

**Respuesta `200`:**
```json
{ "message": "Tarea marcada como completada para el usuario" }
```

**Errores:** `400` si falta `userId` o el header `Idempotency-Key`. `404` si la tarea o el usuario no existen, o si el usuario no está asignado a esa tarea.

---

### `GET /tasks/:idTask/notifications`

Lista los intentos de notificación de archivado para una tarea (número de intento, timestamp, status HTTP obtenido).

**Respuesta `200`:**
```json
[
  { "id": "n1...", "taskId": "t1...", "attemptNumber": 1, "timestamp": "2026-08-26T20:00:00.000Z", "statusHttp": 500 },
  { "id": "n2...", "taskId": "t1...", "attemptNumber": 2, "timestamp": "2026-08-26T20:00:01.000Z", "statusHttp": 200 }
]
```

**Errores:** `404` si la tarea no existe.

---

## Notificaciones de archivado

Cuando una tarea se archiva, la API hace `POST` a `NOTIFY_URL` con:

```json
{
  "taskId": "t1...",
  "title": "Comprar leche",
  "archivedAt": "2026-08-26T20:00:00.000Z"
}
```

- Si la respuesta es `5xx` o no hay respuesta (timeout/conexión), reintenta con espera creciente hasta un máximo de **3 intentos**.
- Cada intento queda registrado y es consultable vía `GET /tasks/:idTask/notifications`.
- El archivado de la tarea es independiente del resultado de la notificación: si el envío falla las 3 veces, la tarea igual queda `archived`.

## Rate limiting (mejora de seguridad)

**Por qué se agregó:** ninguno de los mecanismos anteriores (idempotencia, validación) protege al servidor de un volumen anómalo de tráfico desde una misma IP — ya sea un cliente mal configurado en loop, un script de reintentos sin backoff, o directamente un intento de saturar la API (denial of service básico). El rate limiting agrega ese grado de seguridad faltante: acota cuántas requests puede hacer una IP en una ventana de tiempo, protegiendo la disponibilidad e integridad del servidor mientras está desplegado en producción.

**Cómo funciona:**

- Se aplica de forma **global**, a todos los endpoints, antes de llegar a cualquier ruta.
- Cada IP tiene un máximo de `RATE_LIMIT_MAX` requests (default: `100`) dentro de una ventana de `RATE_LIMIT_WINDOW_MS` (default: `60000` ms = 1 minuto).
- Al superar el límite, la API responde `429 Too Many Requests` con el mismo formato de error que el resto de la API:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Demasiadas solicitudes desde esta IP, intentá de nuevo más tarde"
  }
}
```

- La respuesta incluye los headers estándar `RateLimit-Limit`, `RateLimit-Remaining` y `RateLimit-Reset`, para que un cliente bien implementado pueda ajustar su ritmo de requests sin necesidad de parsear el body.

**Ajustar el límite:** si tu caso de uso legítimamente necesita más throughput por IP (por ejemplo, un cliente interno de confianza), subí `RATE_LIMIT_MAX` o ampliá `RATE_LIMIT_WINDOW_MS` vía variables de entorno — no hace falta tocar código.

---

## Ejemplo de flujo completo (curl)

`Idempotency-Key` es obligatorio en todo `POST` — generá un UUID distinto por cada operación nueva (no por cada intento/reintento de la misma operación).

Los ejemplos usan la API desplegada (`https://testing-task.online`); reemplazá por `http://localhost:3000` si estás corriendo en local.

```bash
# 1. Crear usuario
curl -X POST https://testing-task.online/users \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3f1a9c2e-1111-4a2b-8c3d-000000000001" \
  -d '{"name":"Ana","lastName":"Pérez","email":"ana@test.com"}'

# 2. Crear tarea
curl -X POST https://testing-task.online/tasks \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3f1a9c2e-2222-4a2b-8c3d-000000000002" \
  -d '{"title":"Comprar leche"}'

# 3. Asignar el usuario a la tarea
curl -X POST https://testing-task.online/tasks/<idTask>/assign \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3f1a9c2e-3333-4a2b-8c3d-000000000003" \
  -d '{"userIds":["<idUser>"]}'

# 4. Completar la tarea para ese usuario (archiva y notifica si era el último)
curl -X POST https://testing-task.online/tasks/<idTask>/complete \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3f1a9c2e-4444-4a2b-8c3d-000000000004" \
  -d '{"userId":"<idUser>"}'

# 5. Ver intentos de notificación
curl https://testing-task.online/tasks/<idTask>/notifications
```