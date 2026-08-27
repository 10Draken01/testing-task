import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/CreateTestApp.js';

describe('Idempotency-Key en POST /tasks', () => {
  it('misma key + mismo body ejecuta una sola vez y devuelve la misma respuesta', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const payload = { title: 'Tarea única' };

    const res1 = await request(app).post('/tasks').set('Idempotency-Key', key).send(payload);
    const res2 = await request(app).post('/tasks').set('Idempotency-Key', key).send(payload);

    expect(res1.status).toBe(res2.status);
    expect(res1.body).toEqual(res2.body); // mismo id, no se creó una segunda tarea

    const all = await request(app).get('/tasks');
    expect(all.body.data).toHaveLength(1);
  });

  it('misma key + body distinto devuelve 422', async () => {
    const app = createTestApp();
    const key = randomUUID();

    await request(app).post('/tasks').set('Idempotency-Key', key).send({ title: 'A' });
    const res = await request(app).post('/tasks').set('Idempotency-Key', key).send({ title: 'B' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_MISMATCH');
  });

  it('dos requests EN PARALELO con la misma key ejecutan la operación una sola vez', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const payload = { title: 'Tarea concurrente' };

    const [res1, res2] = await Promise.all([
      request(app).post('/tasks').set('Idempotency-Key', key).send(payload),
      request(app).post('/tasks').set('Idempotency-Key', key).send(payload),
    ]);

    expect(res1.status).toBe(res2.status);
    expect(res1.body).toEqual(res2.body);

    const all = await request(app).get('/tasks');
    expect(all.body.data).toHaveLength(1); // nunca se duplicó
  });

  it('rechaza si falta el header Idempotency-Key', async () => {
    const app = createTestApp();
    const res = await request(app).post('/tasks').send({ title: 'Tarea 1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
});