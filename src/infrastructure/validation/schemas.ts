import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1, 'name es obligatorio'),
  lastName: z.string().trim().min(1, 'lastName es obligatorio'),
  email: z.string().trim().email('email no es válido'),
});

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, 'title es obligatorio'),
  description: z.string().optional().default(''),
});

export const AssignUsersSchema = z.object({
  userIds: z.array(z.string().min(1)).nonempty('userIds no puede estar vacío'),
});

export const CompleteTaskSchema = z.object({
  userId: z.string().min(1, 'userId es obligatorio'),
});

export const ListTasksQuerySchema = z.object({
  status: z.enum(['open', 'archived']).optional(),
});