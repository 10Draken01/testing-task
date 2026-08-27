import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/CreateTestApp.js';

async function createUser(app: any, email: string) {
    const key = randomUUID();
    const res = await request(app).post('/users').send({ name: 'U', lastName: 'L', email }).set('Idempotency-Key', key);
    return res.body.id as string;
}

async function createTask(app: any) {
    const key = randomUUID();
    const res = await request(app).post('/tasks').send({ title: 'T' }).set('Idempotency-Key', key);
    return res.body.id as string;
}

describe('POST /tasks/:idTask/complete', () => {
    beforeEach(() => {
        process.env.NOTIFY_URL = 'https://example.com/notify';
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ status: 200 }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('marca la parte del usuario como completada', async () => {
        const app = createTestApp();
        var key = randomUUID();
        const userId = await createUser(app, 'a@test.com');
        const taskId = await createTask(app);
        await request(app).post(`/tasks/${taskId}/assign`).set('Idempotency-Key', key).send({ userIds: [userId] });

        key = randomUUID();
        const res = await request(app).post(`/tasks/${taskId}/complete`).set('Idempotency-Key', key).send({ userId });

        expect(res.status).toBe(200);
    });

    it('rechaza si la tarea no existe', async () => {
        const app = createTestApp();
        const key = randomUUID();
        const userId = await createUser(app, 'a@test.com');

        const res = await request(app).post('/tasks/no-existe/complete').set('Idempotency-Key', key).send({ userId });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rechaza si el usuario no está asignado a la tarea', async () => {
        const app = createTestApp();
        const key = randomUUID();
        const userId = await createUser(app, 'a@test.com');
        const taskId = await createTask(app); // sin asignar a nadie

        const res = await request(app).post(`/tasks/${taskId}/complete`).set('Idempotency-Key', key).send({ userId });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('archiva la tarea cuando todos completan, y registra la notificación', async () => {
        const app = createTestApp();
        var key = randomUUID();
        const userId = await createUser(app, 'a@test.com');
        const taskId = await createTask(app);
        await request(app).post(`/tasks/${taskId}/assign`).set('Idempotency-Key', key).send({ userIds: [userId] });
        key = randomUUID();
        await request(app).post(`/tasks/${taskId}/complete`).set('Idempotency-Key', key).send({ userId });

        key = randomUUID();
        const detail = await request(app).get(`/tasks/${taskId}`).set('Idempotency-Key', key);
        expect(detail.body.status).toBe('archived');

        key = randomUUID();
        const notifications = await request(app).get(`/tasks/${taskId}/notifications`).set('Idempotency-Key', key);
        expect(notifications.body).toHaveLength(1);
        expect(notifications.body[0].statusHttp).toBe(200);
    });

    it('archiva UNA sola vez y notifica UNA sola vez cuando los dos últimos usuarios completan a la vez', async () => {
        const app = createTestApp();
        var key = randomUUID();
        const user1 = await createUser(app, 'u1@test.com');
        const user2 = await createUser(app, 'u2@test.com');
        const taskId = await createTask(app);
        await request(app).post(`/tasks/${taskId}/assign`).set('Idempotency-Key', key).send({ userIds: [user1, user2] });

        // Dos requests concurrentes, cada uno completando su parte
        const key1 = randomUUID();
        const key2 = randomUUID();
        await Promise.all([
            request(app).post(`/tasks/${taskId}/complete`).set('Idempotency-Key', key1).send({ userId: user1 }),
            request(app).post(`/tasks/${taskId}/complete`).set('Idempotency-Key', key2).send({ userId: user2 }),
        ]);
        
        key = randomUUID();
        const detail = await request(app).get(`/tasks/${taskId}`).set('Idempotency-Key', key);
        expect(detail.body.status).toBe('archived');

        key = randomUUID();
        const notifications = await request(app).get(`/tasks/${taskId}/notifications`).set('Idempotency-Key', key);
        expect(notifications.body).toHaveLength(1); // no dos intentos por doble archivado
    });

    it('reintenta hasta 3 veces si la notificación responde 5xx, y registra cada intento', async () => {
        (global.fetch as any) = vi
            .fn()
            .mockResolvedValueOnce({ status: 500 })
            .mockResolvedValueOnce({ status: 500 })
            .mockResolvedValueOnce({ status: 200 });

        const app = createTestApp();
        const userId = await createUser(app, 'a@test.com');
        const taskId = await createTask(app);
        var key = randomUUID();
        await request(app).post(`/tasks/${taskId}/assign`).set('Idempotency-Key', key).send({ userIds: [userId] });

        key = randomUUID();
        await request(app).post(`/tasks/${taskId}/complete`).set('Idempotency-Key', key).send({ userId });

        key = randomUUID();
        const notifications = await request(app).get(`/tasks/${taskId}/notifications`).set('Idempotency-Key', key);
        expect(notifications.body).toHaveLength(3);
        expect(notifications.body.map((n: any) => n.statusHttp)).toEqual([500, 500, 200]);
    });
});