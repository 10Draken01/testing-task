-- Esquema de la base de datos TaskNotification.
-- Relaciones:
--   task_assignments.taskId  -> tasks.id       (N:1)
--   task_assignments.userId  -> users.id       (N:1)
--   notification_attempts.taskId -> tasks.id   (N:1)
--   users <-> tasks es N:M, resuelta por task_assignments (tabla puente)

CREATE TABLE IF NOT EXISTS users (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email    TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived'))
);

-- Tabla puente de la relación N:M entre users y tasks.
-- UNIQUE(taskId, userId) es la garantía real anti-duplicados a nivel de DB,
-- no solo en la lógica de negocio.
CREATE TABLE IF NOT EXISTS task_assignments (
  id        TEXT PRIMARY KEY,
  taskId    TEXT NOT NULL REFERENCES tasks(id),
  userId    TEXT NOT NULL REFERENCES users(id),
  completed INTEGER NOT NULL DEFAULT 0,
  UNIQUE (taskId, userId)
);

-- Historial de intentos de notificación externa al archivar una tarea.
CREATE TABLE IF NOT EXISTS notification_attempts (
  id            TEXT PRIMARY KEY,
  taskId        TEXT NOT NULL REFERENCES tasks(id),
  attemptNumber INTEGER NOT NULL,
  timestamp     TEXT NOT NULL,
  statusHttp    INTEGER
);

-- Claves de idempotencia para POST. idempotencyKey como PRIMARY KEY es lo que
-- garantiza atomicidad real ante requests concurrentes con la misma key.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotencyKey TEXT PRIMARY KEY,
  method         TEXT NOT NULL,
  path           TEXT NOT NULL,
  bodyHash       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed')),
  responseStatus INTEGER,
  responseBody   TEXT,
  createdAt      TEXT NOT NULL
);