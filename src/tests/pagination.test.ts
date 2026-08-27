import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/CreateTestApp.js';

async function createTask(app: any, title: string) {
  await request(app).post('/tasks').set('Idempotency-Key', randomUUID()).send({ title });
}

async function createUser(app: any, email: string) {
  await request(app)
    .post('/users')
    .set('Idempotency-Key', randomUUID())
    .send({ name: 'U', lastName: 'L', email });
}

describe('Paginación en GET /tasks', () => {
  it('devuelve la primera página con el límite por defecto', async () => {
    const app = createTestApp();
    for (let i = 1; i <= 3; i++) {
      await createTask(app, `Tarea ${i}`);
    }

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it('respeta ?page y ?limit', async () => {
    const app = createTestApp();
    for (let i = 1; i <= 5; i++) {
      await createTask(app, `Tarea ${i}`);
    }

    const page1 = await request(app).get('/tasks').query({ page: 1, limit: 2 });
    const page2 = await request(app).get('/tasks').query({ page: 2, limit: 2 });
    const page3 = await request(app).get('/tasks').query({ page: 3, limit: 2 });

    expect(page1.body.data).toHaveLength(2);
    expect(page2.body.data).toHaveLength(2);
    expect(page3.body.data).toHaveLength(1); // última página, resto

    expect(page1.body.pagination).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });

    // Los IDs de cada página no se repiten entre sí
    const idsPage1 = page1.body.data.map((t: any) => t.id);
    const idsPage2 = page2.body.data.map((t: any) => t.id);
    expect(idsPage1.some((id: string) => idsPage2.includes(id))).toBe(false);
  });

  it('combina paginación con el filtro de status', async () => {
    const app = createTestApp();
    await createTask(app, 'Abierta 1');
    await createTask(app, 'Abierta 2');

    const res = await request(app).get('/tasks').query({ status: 'open', page: 1, limit: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(2); // total del filtro, no del limit
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('rechaza limit mayor al máximo permitido', async () => {
    const app = createTestApp();
    const res = await request(app).get('/tasks').query({ limit: 99999 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza page menor a 1', async () => {
    const app = createTestApp();
    const res = await request(app).get('/tasks').query({ page: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('página vacía cuando no hay resultados para ese page', async () => {
    const app = createTestApp();
    await createTask(app, 'Única tarea');

    const res = await request(app).get('/tasks').query({ page: 5, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(1);
  });
});

describe('Paginación en GET /users', () => {
  it('devuelve la primera página con el límite por defecto', async () => {
    const app = createTestApp();
    for (let i = 1; i <= 3; i++) {
      await createUser(app, `user${i}@test.com`);
    }

    const res = await request(app).get('/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it('respeta ?page y ?limit', async () => {
    const app = createTestApp();
    for (let i = 1; i <= 5; i++) {
      await createUser(app, `user${i}@test.com`);
    }

    const page1 = await request(app).get('/users').query({ page: 1, limit: 2 });
    const page2 = await request(app).get('/users').query({ page: 2, limit: 2 });

    expect(page1.body.data).toHaveLength(2);
    expect(page2.body.data).toHaveLength(2);
    expect(page1.body.pagination).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });

    const idsPage1 = page1.body.data.map((u: any) => u.id);
    const idsPage2 = page2.body.data.map((u: any) => u.id);
    expect(idsPage1.some((id: string) => idsPage2.includes(id))).toBe(false);
  });

  it('rechaza limit mayor al máximo permitido', async () => {
    const app = createTestApp();
    const res = await request(app).get('/users').query({ limit: 99999 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});