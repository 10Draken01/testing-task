import type { UserEntity } from '../entities/user.entity.js';
import type { PaginationParams } from '../shared/Pagination.js';
 
export interface UserDBPort {
  save(data: Omit<UserEntity, 'id'>): Promise<UserEntity>;
  get(pagination: PaginationParams): Promise<UserEntity[]>;
  count(): Promise<number>;
  getById(id: string): Promise<UserEntity | null>;
  updateById(id: string, data: Partial<Omit<UserEntity, 'id'>>): Promise<UserEntity | null>;
  delete(id: string): Promise<boolean>;
}
 