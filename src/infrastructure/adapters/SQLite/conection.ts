// src/infrastructure/db/connection.ts
import Database from 'better-sqlite3';

export function inicializateDatabase(dbPath: string = './data.db'): Database.Database {
  const db = new Database(dbPath);
  // Esto permite que las transacciones se escriban en un archivo WAL (Write-Ahead Logging) en lugar de bloquear la base de datos completa, 
  // lo que mejora el rendimiento en entornos con múltiples conexiones.
  db.pragma('journal_mode = WAL');
  // Esto habilita las claves foráneas en SQLite, lo que permite que las relaciones entre tablas se respeten y 
  // se apliquen las restricciones de integridad referencial.
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email    TEXT NOT NULL UNIQUE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_assignments (
      id        TEXT PRIMARY KEY,
      taskId    TEXT NOT NULL REFERENCES tasks(id),
      userId    TEXT NOT NULL REFERENCES users(id),
      completed INTEGER NOT NULL DEFAULT 0,
      UNIQUE (taskId, userId)
    );
  `);
  // el UNIQUE(taskId, userId) es la garantía real anti-duplicados,
  // a nivel de base de datos, no solo en el use case.

  // NUEVA: historial de intentos de notificación
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_attempts (
      id            TEXT PRIMARY KEY,
      taskId        TEXT NOT NULL REFERENCES tasks(id),
      attemptNumber INTEGER NOT NULL,
      timestamp     TEXT NOT NULL,
      statusHttp    INTEGER
    );
  `);

  db.exec(`
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
  `);

  return db;
}