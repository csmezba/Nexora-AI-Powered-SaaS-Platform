import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaRoleRepository } from '../../../../../src/role/infrastructure/repositories/prisma-role.repository.js';
import { PrismaService } from '../../../../../src/prisma/prisma.service.js';

describe('PrismaRoleRepository', () => {
  let repository: PrismaRoleRepository;
  let mockPrismaService: PrismaService;
  let mockRoleModel: {
    first: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };
  let mockPermModel: {
    first: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };
  let mockRolePermModel: {
    first: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };
  let mockMemberRoleModel: {
    first: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };

  const rawRoleRecord = {
    id: 1,
    pubId: 'rol_lead123',
    name: 'Lead Developer',
    description: 'Tech lead',
    organizationId: 10,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const rawPermRecord = {
    id: 1,
    pubId: 'perm_task_create',
    resource: 'task',
    action: 'create',
    description: 'Create tasks',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const rawRolePermRecord = {
    pubId: 'rp_123',
    roleId: 1,
    permissionId: 1,
    assignedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockRoleModel = {
      first: vi.fn(),
      where: vi.fn().mockReturnValue({
        first: vi.fn(),
        all: vi.fn().mockResolvedValue([rawRoleRecord]),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      }),
      create: vi.fn(),
      all: vi.fn().mockResolvedValue([rawRoleRecord]),
    };

    mockPermModel = {
      first: vi.fn(),
      where: vi.fn().mockReturnValue({
        first: vi.fn(),
        all: vi.fn().mockResolvedValue([rawPermRecord]),
      }),
      all: vi.fn().mockResolvedValue([rawPermRecord]),
    };

    mockRolePermModel = {
      first: vi.fn(),
      where: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue([rawRolePermRecord]),
        delete: vi.fn().mockResolvedValue({}),
      }),
      create: vi.fn().mockResolvedValue(rawRolePermRecord),
      all: vi.fn().mockResolvedValue([rawRolePermRecord]),
    };

    mockMemberRoleModel = {
      first: vi.fn(),
      where: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue({}),
      }),
      create: vi.fn().mockResolvedValue({
        pubId: 'omr_123',
        organizationMemberId: 5,
        roleId: 1,
        assignedAt: new Date(),
      }),
      all: vi.fn().mockResolvedValue([]),
    };

    mockPrismaService = {
      db: {
        orm: {
          Role: mockRoleModel,
          Permission: mockPermModel,
          RolePermission: mockRolePermModel,
          OrganizationMemberRole: mockMemberRoleModel,
        },
      },
    } as unknown as PrismaService;

    repository = new PrismaRoleRepository(mockPrismaService);
  });

  it('should find role by id with permissions', async () => {
    mockRoleModel.first.mockResolvedValue(rawRoleRecord);

    const role = await repository.findById(1);
    expect(role).not.toBeNull();
    expect(role?.id).toBe(1);
    expect(role?.name).toBe('Lead Developer');
    expect(role?.permissions.length).toBe(1);
  });

  it('should create a role', async () => {
    mockRoleModel.create.mockResolvedValue(rawRoleRecord);

    const created = await repository.create({
      name: 'Lead Developer',
      description: 'Tech lead',
      organizationId: 10,
    });

    expect(created.id).toBe(1);
    expect(created.name).toBe('Lead Developer');
  });

  it('should sync permissions for a role', async () => {
    const res = await repository.syncPermissions(1, [1]);
    expect(res.length).toBe(1);
  });

  it('should assign role to organization member', async () => {
    const assigned = await repository.assignRoleToMember(5, 1);
    expect(assigned.pubId).toBe('omr_123');
    expect(assigned.roleId).toBe(1);
  });

  it('should remove role from organization member', async () => {
    const removed = await repository.removeRoleFromMember(5, 1);
    expect(removed).toBe(true);
  });
});
