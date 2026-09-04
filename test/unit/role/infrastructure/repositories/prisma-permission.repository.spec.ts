import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaPermissionRepository } from '../../../../../src/role/infrastructure/repositories/prisma-permission.repository.js';
import { PrismaService } from '../../../../../src/prisma/prisma.service.js';

describe('PrismaPermissionRepository', () => {
  let repository: PrismaPermissionRepository;
  let mockPrismaService: PrismaService;
  let mockPermModel: {
    first: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };

  const rawPermRecord = {
    id: 1,
    pubId: 'perm_proj_read',
    resource: 'project',
    action: 'read',
    description: 'Read projects',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockPermModel = {
      first: vi.fn(),
      where: vi.fn().mockReturnValue({
        first: vi.fn(),
        all: vi.fn().mockResolvedValue([rawPermRecord]),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      }),
      create: vi.fn(),
      all: vi.fn().mockResolvedValue([rawPermRecord]),
    };

    mockPrismaService = {
      db: {
        orm: {
          Permission: mockPermModel,
        },
      },
    } as unknown as PrismaService;

    repository = new PrismaPermissionRepository(mockPrismaService);
  });

  it('should find permission by id', async () => {
    mockPermModel.first.mockResolvedValue(rawPermRecord);

    const perm = await repository.findById(1);
    expect(perm).not.toBeNull();
    expect(perm?.pubId).toBe('perm_proj_read');
    expect(perm?.resource).toBe('project');
  });

  it('should find permission by resource and action', async () => {
    mockPermModel.where.mockReturnValue({
      all: vi.fn().mockResolvedValue([rawPermRecord]),
    });

    const perm = await repository.findByResourceAndAction('PROJECT', 'READ');
    expect(perm).not.toBeNull();
    expect(perm?.action).toBe('read');
  });

  it('should create a permission', async () => {
    mockPermModel.create.mockResolvedValue(rawPermRecord);

    const created = await repository.create({
      resource: 'project',
      action: 'read',
      description: 'Read projects',
    });

    expect(created.id).toBe(1);
    expect(mockPermModel.create).toHaveBeenCalled();
  });

  it('should update a permission', async () => {
    mockPermModel.first.mockResolvedValue({
      ...rawPermRecord,
      description: 'Updated desc',
    });

    const updated = await repository.update(1, { description: 'Updated desc' });
    expect(updated.description).toBe('Updated desc');
  });

  it('should delete a permission', async () => {
    const deleted = await repository.delete(1);
    expect(deleted).toBe(true);
  });
});
