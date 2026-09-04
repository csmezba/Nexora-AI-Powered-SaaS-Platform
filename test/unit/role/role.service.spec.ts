import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { RoleService } from '../../../src/role/role.service.js';
import { IRoleRepository } from '../../../src/role/domain/repositories/role-repository.interface.js';
import { IPermissionRepository } from '../../../src/role/domain/repositories/permission-repository.interface.js';
import { IOrganizationRepository } from '../../../src/organization/domain/repositories/organization-repository.interface.js';
import { IOrganizationMemberRepository } from '../../../src/organization/domain/repositories/organization-member-repository.interface.js';
import { RoleEntity } from '../../../src/role/domain/entities/role.entity.js';
import { PermissionEntity } from '../../../src/role/domain/entities/permission.entity.js';
import { OrganizationEntity } from '../../../src/organization/domain/entities/organization.entity.js';
import { OrganizationMemberEntity } from '../../../src/organization/domain/entities/organization-member.entity.js';
import { OrganizationRole } from '../../../src/organization/domain/enums/organization-role.enum.js';

describe('RoleService', () => {
  let service: RoleService;
  let mockRoleRepo: IRoleRepository;
  let mockPermRepo: IPermissionRepository;
  let mockOrgRepo: IOrganizationRepository;
  let mockMemberRepo: IOrganizationMemberRepository;

  const sampleOrg = OrganizationEntity.reconstitute({
    id: 1,
    pubId: 'org_abc123',
    name: 'Acme Corp',
    slug: 'acme',
    logoUrl: null,
    description: 'Test Org',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const sampleOwnerMember = OrganizationMemberEntity.reconstitute({
    id: 100,
    pubId: 'mem_own123',
    organizationId: 1,
    userId: 10,
    role: OrganizationRole.OWNER,
    joinedAt: new Date(),
  });

  const sampleRegularMember = OrganizationMemberEntity.reconstitute({
    id: 101,
    pubId: 'mem_reg456',
    organizationId: 1,
    userId: 20,
    role: OrganizationRole.MEMBER,
    joinedAt: new Date(),
  });

  const samplePerm = PermissionEntity.reconstitute({
    id: 1,
    pubId: 'perm_proj_create',
    resource: 'project',
    action: 'create',
    description: 'Create projects',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const sampleRole = RoleEntity.reconstitute({
    id: 5,
    pubId: 'rol_lead123',
    name: 'Lead Developer',
    description: 'Tech lead',
    organizationId: 1,
    permissions: [samplePerm.sanitize()],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockRoleRepo = {
      findById: vi.fn(),
      findByPubId: vi.fn(),
      findByNameAndOrg: vi.fn(),
      findByPubIdAndOrg: vi.fn(),
      findAllByOrg: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getRolePermissions: vi.fn(),
      assignPermissions: vi.fn(),
      removePermissions: vi.fn(),
      syncPermissions: vi.fn(),
      getMemberRoles: vi.fn(),
      assignRoleToMember: vi.fn(),
      removeRoleFromMember: vi.fn(),
    };

    mockPermRepo = {
      findById: vi.fn(),
      findByPubId: vi.fn(),
      findByResourceAndAction: vi.fn(),
      findAll: vi.fn(),
      findByIds: vi.fn(),
      findByPubIds: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockOrgRepo = {
      findById: vi.fn(),
      findByPubId: vi.fn(),
      findBySlug: vi.fn(),
      findByPubIdOrSlug: vi.fn(),
      findAllByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockMemberRepo = {
      findById: vi.fn(),
      findByPubId: vi.fn(),
      findByOrgAndUser: vi.fn(),
      findMembersWithUsers: vi.fn(),
      findUserMemberships: vi.fn(),
      countByOrg: vi.fn(),
      countOwnersByOrg: vi.fn(),
      create: vi.fn(),
      updateRole: vi.fn(),
      delete: vi.fn(),
      deleteByOrgAndUser: vi.fn(),
    };

    service = new RoleService(
      mockRoleRepo,
      mockPermRepo,
      mockOrgRepo,
      mockMemberRepo,
    );
  });

  describe('createRole', () => {
    it('should create role successfully when caller is OWNER', async () => {
      vi.mocked(mockOrgRepo.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleOwnerMember);
      vi.mocked(mockRoleRepo.findByNameAndOrg).mockResolvedValue(null);
      vi.mocked(mockRoleRepo.create).mockResolvedValue(sampleRole);
      vi.mocked(mockRoleRepo.findById).mockResolvedValue(sampleRole);

      const result = await service.createRole(10, {
        organizationPubId: 'org_abc123',
        name: 'Lead Developer',
        description: 'Tech lead',
      });

      expect(result.pubId).toBe('rol_lead123');
      expect(result.name).toBe('Lead Developer');
    });

    it('should throw ForbiddenException when caller is not OWNER or ADMIN', async () => {
      vi.mocked(mockOrgRepo.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleRegularMember);

      await expect(
        service.createRole(20, {
          organizationPubId: 'org_abc123',
          name: 'Lead Developer',
        }),
      ).rejects.toThrowError(ForbiddenException);
    });

    it('should throw ConflictException if role name already exists in org', async () => {
      vi.mocked(mockOrgRepo.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleOwnerMember);
      vi.mocked(mockRoleRepo.findByNameAndOrg).mockResolvedValue(sampleRole);

      await expect(
        service.createRole(10, {
          organizationPubId: 'org_abc123',
          name: 'Lead Developer',
        }),
      ).rejects.toThrowError(ConflictException);
    });

    it('should throw BadRequestException if invalid permission pubIds provided', async () => {
      vi.mocked(mockOrgRepo.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleOwnerMember);
      vi.mocked(mockRoleRepo.findByNameAndOrg).mockResolvedValue(null);
      vi.mocked(mockRoleRepo.create).mockResolvedValue(sampleRole);
      vi.mocked(mockPermRepo.findByPubIds).mockResolvedValue([]);

      await expect(
        service.createRole(10, {
          organizationPubId: 'org_abc123',
          name: 'Lead Developer',
          permissionPubIds: ['perm_invalid'],
        }),
      ).rejects.toThrowError(BadRequestException);
    });
  });

  describe('updateRole', () => {
    it('should update role name and description', async () => {
      vi.mocked(mockRoleRepo.findByPubId).mockResolvedValue(sampleRole);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleOwnerMember);
      vi.mocked(mockRoleRepo.findByNameAndOrg).mockResolvedValue(null);
      vi.mocked(mockRoleRepo.update).mockResolvedValue(
        RoleEntity.reconstitute({
          id: 5,
          pubId: 'rol_lead123',
          name: 'Principal Developer',
          description: 'Principal',
          organizationId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.updateRole('rol_lead123', 10, {
        name: 'Principal Developer',
        description: 'Principal',
      });

      expect(result.name).toBe('Principal Developer');
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      vi.mocked(mockRoleRepo.findByPubId).mockResolvedValue(sampleRole);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleOwnerMember);
      vi.mocked(mockRoleRepo.delete).mockResolvedValue(true);

      const result = await service.deleteRole('rol_lead123', 10);
      expect(result.success).toBe(true);
    });
  });

  describe('permissions', () => {
    it('should create permission', async () => {
      vi.mocked(mockPermRepo.findByResourceAndAction).mockResolvedValue(null);
      vi.mocked(mockPermRepo.create).mockResolvedValue(samplePerm);

      const result = await service.createPermission({
        resource: 'project',
        action: 'create',
        description: 'Create projects',
      });

      expect(result.pubId).toBe('perm_proj_create');
      expect(result.resource).toBe('project');
    });

    it('should throw ConflictException if permission already exists', async () => {
      vi.mocked(mockPermRepo.findByResourceAndAction).mockResolvedValue(samplePerm);

      await expect(
        service.createPermission({
          resource: 'project',
          action: 'create',
        }),
      ).rejects.toThrowError(ConflictException);
    });

    it('should list permissions', async () => {
      vi.mocked(mockPermRepo.findAll).mockResolvedValue([samplePerm]);

      const list = await service.listPermissions();
      expect(list.length).toBe(1);
      expect(list[0]!.pubId).toBe('perm_proj_create');
    });
  });

  describe('member role assignment', () => {
    it('should assign role to member', async () => {
      vi.mocked(mockOrgRepo.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleOwnerMember);
      vi.mocked(mockMemberRepo.findByPubId).mockResolvedValue(sampleRegularMember);
      vi.mocked(mockRoleRepo.findByPubIdAndOrg).mockResolvedValue(sampleRole);
      vi.mocked(mockRoleRepo.assignRoleToMember).mockResolvedValue({
        pubId: 'omr_123',
        organizationMemberId: 101,
        roleId: 5,
        assignedAt: new Date(),
        sanitize: vi.fn(),
      } as any);

      const result = await service.assignRoleToMember(10, {
        organizationPubId: 'org_abc123',
        memberPubId: 'mem_reg456',
        rolePubId: 'rol_lead123',
      });

      expect(result.success).toBe(true);
      expect(result.role?.pubId).toBe('rol_lead123');
    });

    it('should remove role from member', async () => {
      vi.mocked(mockOrgRepo.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleOwnerMember);
      vi.mocked(mockMemberRepo.findByPubId).mockResolvedValue(sampleRegularMember);
      vi.mocked(mockRoleRepo.findByPubIdAndOrg).mockResolvedValue(sampleRole);
      vi.mocked(mockRoleRepo.removeRoleFromMember).mockResolvedValue(true);

      const result = await service.removeRoleFromMember(10, {
        organizationPubId: 'org_abc123',
        memberPubId: 'mem_reg456',
        rolePubId: 'rol_lead123',
      });

      expect(result.success).toBe(true);
    });
  });
});
