import { UserEntity } from '../entities/user.entity.js';
import { UserRole } from '../enums/user-role.enum.js';
import { UserStatus } from '../enums/user-status.enum.js';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserData {
  passwordHash?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole;
  status?: UserStatus;
  refreshTokenHash?: string | null;
}

export interface IUserRepository {
  findById(id: number): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(id: number, data: UpdateUserData): Promise<UserEntity>;
  delete(id: number): Promise<boolean>;
}
