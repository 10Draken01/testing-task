import { ValidationError } from '../../domain/errors.js';
import type { UserEntity } from '../../domain/entities/user.entity.js';
import type { UserDBPort } from '../../domain/ports/userDB.port.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CreateUserUseCase {
  constructor(private readonly userDB: UserDBPort) {}

  async execute(input: { name: string; lastName: string; email: string }): Promise<UserEntity> {
    const { name, lastName, email } = input;

    if (!name?.trim() || !lastName?.trim() || !email?.trim()) {
      throw new ValidationError('name, lastName y email son obligatorios');
    }

    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError('El email no es válido');
    }

    return this.userDB.save({ name, lastName, email });
  }
}