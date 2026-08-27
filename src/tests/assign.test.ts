import { randomUUID } from 'crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/CreateTestApp.js';

async function createUser(app: any, email = 'u1@test.com') {
    const key = randomUUID();
    const res = await request(app).post('/users').set('Idempotency-Key', key).send({ name: 'U', lastName: 'L', email });
    return res.body.id as string;
}

async function createTask(app: any) {
    const key = randomUUID();
    const res = await request(app).post('/tasks').set('Idempotency-Key', key).send({ title: 'T' });
    return res.body.id as string;
}

describe('POST /tasks/:idTask/assign', () => {
    it('asigna usuarios correctamente', async () => {
        const app = createTestApp();
        var key = randomUUID();
        const userId = await createUser(app);
        const taskId = await createTask(app);

        const res = await request(app).post(`/tasks/${taskId}/assign`).set('Idempotency-Key', key).send({ userIds: [userId] });

        expect(res.status).toBe(200);

        key = randomUUID();
        const detail = await request(app).get(`/tasks/${taskId}`).set('Idempotency-Key', key);
        expect(detail.body.assignedUsers).toHaveLength(1);
    });

    it('rechaza si la tarea no existe', async () => {
        const app = createTestApp();
        const userId = await createUser(app);
        const key = randomUUID();

        const res = await request(app)
            .post('/tasks/tarea-inexistente/assign')
            .set('Idempotency-Key', key)
            .send({ userIds: [userId] });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rechaza si algún usuario no existe', async () => {
        const app = createTestApp();
        const key = randomUUID();
        const taskId = await createTask(app);

        const res = await request(app)
            .post(`/tasks/${taskId}/assign`)
            .set('Idempotency-Key', key)
            .send({ userIds: ['usuario-inexistente'] });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('no duplica la relación si el usuario ya estaba asignado', async () => {
        const app = createTestApp();
        var key = randomUUID();
        const userId = await createUser(app);
        const taskId = await createTask(app);

        await request(app).post(`/tasks/${taskId}/assign`).set('Idempotency-Key', key).send({ userIds: [userId] });
        key = randomUUID();
        await request(app).post(`/tasks/${taskId}/assign`).set('Idempotency-Key', key).send({ userIds: [userId] });

        key = randomUUID();
        const detail = await request(app).get(`/tasks/${taskId}`).set('Idempotency-Key', key);
        expect(detail.body.assignedUsers).toHaveLength(1); // sigue siendo 1, no 2
    });
});