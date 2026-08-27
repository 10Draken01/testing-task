import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

export function inicializateDatabase(dbPath: string = './data.db'): Database.Database {
  const db = new Database(dbPath);
  // Esto permite que las transacciones se escriban en un archivo WAL (Write-Ahead Logging) en lugar de bloquear la base de datos completa, 
  // lo que mejora el rendimiento en entornos con múltiples conexiones.
  db.pragma('journal_mode = WAL');
  // Esto habilita las claves foráneas en SQLite, lo que permite que las relaciones entre tablas se respeten y 
  // se apliquen las restricciones de integridad referencial.
  db.pragma('foreign_keys = ON');

  const schemaPath = join(process.cwd(), 'src/infrastructure/adapters/SQLite/SQL', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  return db;
}