import { z } from 'zod';

const MAX_PAGE_SIZE = Number(process.env.MAX_PAGE_SIZE ?? 100);
const DEFAULT_PAGE_SIZE = Number(process.env.DEFAULT_PAGE_SIZE ?? 20);

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

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const ListTasksQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(['open', 'archived']).optional(),
});

export const ListUsersQuerySchema = PaginationQuerySchema;