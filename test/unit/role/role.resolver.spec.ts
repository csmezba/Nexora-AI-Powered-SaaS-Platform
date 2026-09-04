import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RoleResolver } from '../../../src/role/role.resolver.js';
import { RoleService } from '../../../src/role/role.service.js';

describe('RoleResolver', () => {
  let resolver: RoleResolver;
  let mockRoleService: Partial<RoleService>;

  const sampleRoleResponse = {
    id: 1,
    pubId: 'rol_abc123',
    name: 'Developer',
    description: 'Dev role',
    organizationId: 10,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const samplePermResponse = {
    id: 1,
    pubId: 'perm_xyz',
    resource: 'task',
    action: 'create',
    description: 'Create task',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRoleService = {
      listRoles: vi.fn().mockResolvedValue([sampleRoleResponse]),
      getRole: vi.fn().mockResolvedValue(sampleRoleResponse),
      createRole: vi.fn().mockResolvedValue(sampleRoleResponse),
      updateRole: vi.fn().mockResolvedValue(sampleRoleResponse),
      deleteRole: vi.fn().mockResolvedValue({ success: true, message: 'Deleted' }),
      listPermissions: vi.fn().mockResolvedValue([samplePermResponse]),
      createPermission: vi.fn().mockResolvedValue(samplePermResponse),
      updatePermission: vi.fn().mockResolvedValue(samplePermResponse),
      deletePermission: vi.fn().mockResolvedValue({ success: true, message: 'Deleted' }),
      assignPermissionsToRole: vi.fn().mockResolvedValue(sampleRoleResponse),
      assignRoleToMember: vi.fn().mockResolvedValue({ success: true, message: 'Assigned' }),
      removeRoleFromMember: vi.fn().mockResolvedValue({ success: true, message: 'Removed' }),
      getMemberRoles: vi.fn().mockResolvedValue([sampleRoleResponse]),
    };

    resolver = new RoleResolver(mockRoleService as RoleService);
  });

  it('should query organizationRoles', async () => {
    const res = await resolver.organizationRoles('org_123', 10);
    expect(res).toEqual([sampleRoleResponse]);
    expect(mockRoleService.listRoles).toHaveBeenCalledWith('org_123', 10);
  });

  it('should query role by pubId', async () => {
    const res = await resolver.role('rol_abc123', 10);
    expect(res).toEqual(sampleRoleResponse);
  });

  it('should query permissions', async () => {
    const res = await resolver.permissions();
    expect(res).toEqual([samplePermResponse]);
  });

  it('should mutate createRole', async () => {
    const res = await resolver.createRole(10, {
      organizationPubId: 'org_123',
      name: 'Developer',
    });
    expect(res).toEqual(sampleRoleResponse);
  });

  it('should mutate assignRoleToMember', async () => {
    const res = await resolver.assignRoleToMember(10, {
      organizationPubId: 'org_123',
      memberPubId: 'mem_456',
      rolePubId: 'rol_abc123',
    });
    expect(res.success).toBe(true);
  });
});
