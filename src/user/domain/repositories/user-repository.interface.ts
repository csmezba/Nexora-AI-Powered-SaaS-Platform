import { UserEntity } from '../entities/user.entity.js';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UpdateUserData {
  passwordHash?: string;
  firstName?: string | null;
  lastName?: string | null;
  refreshTokenHash?: string | null;
}

export interface IUserRepository {
  findById(id: number): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(id: number, data: UpdateUserData): Promise<UserEntity>;
  delete(id: number): Promise<boolean>;
}
