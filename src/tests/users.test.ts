import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/CreateTestApp.js';

describe('POST /users', () => {
  it('crea un usuario y devuelve id + datos', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const res = await request(app).post('/users').set('Idempotency-Key', key).send({
      name: 'Ana',
      lastName: 'Pérez',
      email: 'ana@test.com',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe('ana@test.com');
  });

  it('rechaza si falta un campo obligatorio', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const res = await request(app).post('/users').set('Idempotency-Key', key).send({
      name: 'Ana',
      email: 'ana@test.com',
      // falta lastName
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza si el email no es válido', async () => {
    const app = createTestApp();
    const key = randomUUID();
    const res = await request(app).post('/users').set('Idempotency-Key', key).send({
      name: 'Ana',
      lastName: 'Pérez',
      email: 'no-es-un-email',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza email duplicado con 409', async () => {
    const app = createTestApp();
    const payload = { name: 'Ana', lastName: 'Pérez', email: 'dup@test.com' };

    await request(app).post('/users').set('Idempotency-Key', randomUUID()).send(payload);
    const res = await request(app)
      .post('/users')
      .set('Idempotency-Key', randomUUID())
      .send({ ...payload, name: 'Otro' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rechaza si falta el header Idempotency-Key', async () => {
    const app = createTestApp();
    const res = await request(app).post('/users').send({
      name: 'Ana',
      lastName: 'Pérez',
      email: 'sin-key@test.com',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
});