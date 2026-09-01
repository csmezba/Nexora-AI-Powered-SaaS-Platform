import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaUserRepository } from '../../../../src/infrastructure/repositories/prisma-user.repository.js';
import { PrismaService } from '../../../../src/prisma/prisma.service.js';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let mockPrismaService: PrismaService;
  let mockUserModel: {
    first: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  const rawUserRecord = {
    id: 1,
    email: 'test@nexora.ai',
    password: '$2a$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    refreshTokenHash: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockUserModel = {
      first: vi.fn(),
      where: vi.fn().mockReturnValue({
        first: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      }),
      create: vi.fn(),
    };

    mockPrismaService = {
      db: {
        orm: {
          User: mockUserModel,
        },
      },
    } as unknown as PrismaService;

    repository = new PrismaUserRepository(mockPrismaService);
  });

  it('should find user by id and return domain UserEntity', async () => {
    mockUserModel.first.mockResolvedValue(rawUserRecord);

    const user = await repository.findById(1);

    expect(user).not.toBeNull();
    expect(user?.id).toBe(1);
    expect(user?.email).toBe('test@nexora.ai');
  });

  it('should return null if user not found by id', async () => {
    mockUserModel.first.mockResolvedValue(null);

    const user = await repository.findById(999);
    expect(user).toBeNull();
  });

  it('should find user by email and return domain UserEntity', async () => {
    const whereChain = {
      first: vi.fn().mockResolvedValue(rawUserRecord),
    };
    mockUserModel.where.mockReturnValue(whereChain);

    const user = await repository.findByEmail('TEST@NEXORA.AI');

    expect(user).not.toBeNull();
    expect(user?.email).toBe('test@nexora.ai');
  });

  it('should create a new user and return domain UserEntity', async () => {
    mockUserModel.create.mockResolvedValue(rawUserRecord);

    const created = await repository.create({
      email: 'test@nexora.ai',
      passwordHash: '$2a$10$hashedpassword',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(created.id).toBe(1);
    expect(created.email).toBe('test@nexora.ai');
    expect(mockUserModel.create).toHaveBeenCalled();
  });

  it('should update user and return updated entity', async () => {
    mockUserModel.first.mockResolvedValue({
      ...rawUserRecord,
      firstName: 'UpdatedName',
    });

    const updated = await repository.update(1, { firstName: 'UpdatedName' });

    expect(updated.firstName).toBe('UpdatedName');
  });

  it('should delete user and return true', async () => {
    const result = await repository.delete(1);
    expect(result).toBe(true);
    expect(mockUserModel.where).toHaveBeenCalledWith({ id: 1 });
  });
});
