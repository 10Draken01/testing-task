import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/CreateTestApp.js';

describe('POST /tasks', () => {
  it('crea una tarea con status "open" por defecto', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const res = await request(app).post('/tasks').set('Idempotency-Key', key).send({ title: 'Comprar leche' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('open');
    expect(res.body.description).toBe(''); // opcional, default vacío
  });

  it('acepta description opcional', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const res = await request(app).post('/tasks').set('Idempotency-Key', key).send({
      title: 'Comprar leche',
      description: 'Marca La Serenísima',
    });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Marca La Serenísima');
  });

  it('rechaza si falta el título', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const res = await request(app).post('/tasks').set('Idempotency-Key', key).send({ description: 'sin título' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /tasks', () => {
  it('filtra por status', async () => {
    const app = createTestApp();
    var key = randomUUID();
    await request(app).post('/tasks').set('Idempotency-Key', key).send({ title: 'Tarea 1' });

    key = randomUUID();
    const res = await request(app).get('/tasks').set('Idempotency-Key', key).query({ status: 'archived' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]); // ninguna archivada todavía
  });

  it('rechaza un status inválido en el query', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const res = await request(app).get('/tasks').set('Idempotency-Key', key).query({ status: 'not-a-status' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});