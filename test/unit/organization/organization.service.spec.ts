import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationService } from '../../../src/organization/organization.service.js';
import { IOrganizationRepository } from '../../../src/organization/domain/repositories/organization-repository.interface.js';
import { IOrganizationMemberRepository } from '../../../src/organization/domain/repositories/organization-member-repository.interface.js';
import { IUserRepository } from '../../../src/user/domain/repositories/user-repository.interface.js';
import { OrganizationEntity } from '../../../src/organization/domain/entities/organization.entity.js';
import { OrganizationMemberEntity } from '../../../src/organization/domain/entities/organization-member.entity.js';
import { OrganizationRole } from '../../../src/organization/domain/enums/organization-role.enum.js';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockOrgRepo: IOrganizationRepository;
  let mockMemberRepo: IOrganizationMemberRepository;
  let mockUserRepo: IUserRepository;

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

  const sampleMember = OrganizationMemberEntity.reconstitute({
    id: 100,
    organizationId: 1,
    userId: 10,
    role: OrganizationRole.OWNER,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockOrgRepo = {
      findById: vi.fn(),
      findByPubId: vi.fn(),
      findBySlug: vi.fn(),
      findAllByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockMemberRepo = {
      findById: vi.fn(),
      findByOrgAndUser: vi.fn(),
      findAllByOrg: vi.fn(),
      findMembersWithUsers: vi.fn(),
      countByOrg: vi.fn(),
      countOwnersByOrg: vi.fn(),
      create: vi.fn(),
      updateRole: vi.fn(),
      delete: vi.fn(),
    };

    mockUserRepo = {
      findById: vi.fn(),
      findByPubId: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    service = new OrganizationService(
      mockOrgRepo,
      mockMemberRepo,
      mockUserRepo,
    );
  });

  describe('resolveOrganization', () => {
    it('should resolve organization by pubId', async () => {
      vi.mocked(mockOrgRepo.findByPubId).mockResolvedValue(sampleOrg);

      const org = await service.resolveOrganization('org_abc123');
      expect(org).toEqual(sampleOrg);
    });

    it('should resolve organization by slug', async () => {
      vi.mocked(mockOrgRepo.findBySlug).mockResolvedValue(sampleOrg);

      const org = await service.resolveOrganization('acme');
      expect(org).toEqual(sampleOrg);
    });

    it('should throw NotFoundException if organization not found', async () => {
      vi.mocked(mockOrgRepo.findByPubId).mockResolvedValue(null);
      vi.mocked(mockOrgRepo.findBySlug).mockResolvedValue(null);

      await expect(service.resolveOrganization('nonexistent')).rejects.toThrowError(
        NotFoundException,
      );
    });

    it('should wrap unknown errors in InternalServerErrorException', async () => {
      vi.mocked(mockOrgRepo.findBySlug).mockRejectedValue(new Error('DB crashed'));

      await expect(service.resolveOrganization('acme')).rejects.toThrowError(
        InternalServerErrorException,
      );
    });
  });

  describe('createOrganization', () => {
    it('should create organization and owner member successfully', async () => {
      vi.mocked(mockOrgRepo.findBySlug).mockResolvedValue(null);
      vi.mocked(mockOrgRepo.create).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.create).mockResolvedValue(sampleMember);

      const result = await service.createOrganization(10, {
        name: 'Acme Corp',
        slug: 'acme',
      });

      expect(result.slug).toBe('acme');
      expect(result.currentUserRole).toBe(OrganizationRole.OWNER);
      expect(result.memberCount).toBe(1);
    });

    it('should throw ConflictException if slug already exists', async () => {
      vi.mocked(mockOrgRepo.findBySlug).mockResolvedValue(sampleOrg);

      await expect(
        service.createOrganization(10, {
          name: 'Acme Corp',
          slug: 'acme',
        }),
      ).rejects.toThrowError(ConflictException);
    });
  });

  describe('getOrganization', () => {
    it('should return organization with role and count', async () => {
      vi.mocked(mockOrgRepo.findByPubId).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.countByOrg).mockResolvedValue(3);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleMember);

      const result = await service.getOrganization('org_abc123', 10);
      expect(result.memberCount).toBe(3);
      expect(result.currentUserRole).toBe(OrganizationRole.OWNER);
    });
  });

  describe('updateOrganization', () => {
    it('should reject update if user is not OWNER or ADMIN', async () => {
      vi.mocked(mockOrgRepo.findByPubId).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(
        OrganizationMemberEntity.reconstitute({
          id: 101,
          organizationId: 1,
          userId: 10,
          role: OrganizationRole.MEMBER,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await expect(
        service.updateOrganization('org_abc123', 10, { name: 'New Name' }),
      ).rejects.toThrowError(ForbiddenException);
    });
  });

  describe('deleteOrganization', () => {
    it('should allow owner to delete organization', async () => {
      vi.mocked(mockOrgRepo.findByPubId).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(mockOrgRepo.delete).mockResolvedValue(undefined);

      const result = await service.deleteOrganization('org_abc123', 10);
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException if caller is not owner', async () => {
      vi.mocked(mockOrgRepo.findByPubId).mockResolvedValue(sampleOrg);
      vi.mocked(mockMemberRepo.findByOrgAndUser).mockResolvedValue(
        OrganizationMemberEntity.reconstitute({
          id: 102,
          organizationId: 1,
          userId: 10,
          role: OrganizationRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await expect(
        service.deleteOrganization('org_abc123', 10),
      ).rejects.toThrowError(ForbiddenException);
    });
  });
});
