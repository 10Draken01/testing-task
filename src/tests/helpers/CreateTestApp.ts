import { createApp } from '../../app.js';

export function createTestApp() {
  // ':memory:' crea una base nueva y aislada en cada llamada:
  // ningún test comparte estado con otro.
  return createApp(':memory:');
}