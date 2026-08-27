import type { UserEntity } from "../entities/user.entity.js";

export interface UserDBPort {
  save(data: Omit<UserEntity, 'id'>): Promise<UserEntity>;
  get(): Promise<UserEntity[]>;
  getById(id: string): Promise<UserEntity | null>;
  updateById(id: string, data: Partial<UserEntity>): Promise<UserEntity | null>;
  delete(id: string): Promise<boolean>;
}