import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserEntity } from '../../domain/entities/user.entity.js';
import type {
  CreateUserData,
  IUserRepository,
  UpdateUserData,
} from '../../domain/repositories/user-repository.interface.js';

interface PrismaUserRecord {
  id: number;
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  refreshTokenHash?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaUserOrmModel {
  first(filter: { id: number }): Promise<PrismaUserRecord | null>;
  where(predicate: unknown): {
    first(): Promise<PrismaUserRecord | null>;
    update(data: Record<string, unknown>): Promise<unknown>;
    delete(): Promise<unknown>;
  };
  create(data: Record<string, unknown>): Promise<PrismaUserRecord>;
}

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get userModel(): PrismaUserOrmModel {
    const orm = this.prisma.db.orm as unknown as Record<string, PrismaUserOrmModel>;
    return orm['User'] || (orm['public'] as unknown as Record<string, PrismaUserOrmModel>)?.[
      'User'
    ] || orm['user']!;
  }

  private toEntity(record: PrismaUserRecord): UserEntity {
    return UserEntity.reconstitute({
      id: record.id,
      email: record.email,
      passwordHash: record.password,
      firstName: record.firstName ?? null,
      lastName: record.lastName ?? null,
      refreshTokenHash: record.refreshTokenHash ?? null,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  async findById(id: number): Promise<UserEntity | null> {
    const record = await this.userModel.first({ id });
    return record ? this.toEntity(record) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const record = await this.userModel
      .where((u: { email: { eq: (val: string) => unknown } }) => u.email.eq(normalizedEmail))
      .first();
    return record ? this.toEntity(record) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const now = new Date().toISOString();
    const record = await this.userModel.create({
      email: data.email.toLowerCase().trim(),
      password: data.passwordHash,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      refreshTokenHash: null,
      createdAt: now,
      updatedAt: now,
    });

    return this.toEntity(record);
  }

  async update(id: number, data: UpdateUserData): Promise<UserEntity> {
    const updatePayload: Record<string, unknown> = {};

    if (data.passwordHash !== undefined) updatePayload['password'] = data.passwordHash;
    if (data.firstName !== undefined) updatePayload['firstName'] = data.firstName;
    if (data.lastName !== undefined) updatePayload['lastName'] = data.lastName;
    if (data.refreshTokenHash !== undefined) updatePayload['refreshTokenHash'] = data.refreshTokenHash;

    updatePayload['updatedAt'] = new Date().toISOString();

    await this.userModel.where({ id }).update(updatePayload);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`User with ID ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    await this.userModel.where({ id }).delete();
    return true;
  }
}
