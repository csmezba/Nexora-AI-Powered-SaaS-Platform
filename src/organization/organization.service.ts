import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type IOrganizationRepository,
} from '../domain/repositories/organization-repository.interface.js';
import {
  ORGANIZATION_MEMBER_REPOSITORY,
  type IOrganizationMemberRepository,
} from '../domain/repositories/organization-member-repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../domain/repositories/user-repository.interface.js';
import { OrganizationRole } from '../domain/enums/organization-role.enum.js';
import {
  CreateOrganizationInput,
  DeleteOrganizationResponseDto,
  OrganizationResponseDto,
  UpdateOrganizationInput,
} from './dto/organization.dto.js';
import {
  AddOrganizationMemberInput,
  MemberActionResponseDto,
  OrganizationMemberResponseDto,
  RemoveMemberInput,
  UpdateMemberRoleInput,
} from './dto/organization-member.dto.js';

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async createOrganization(
    userId: number,
    input: CreateOrganizationInput,
  ): Promise<OrganizationResponseDto> {
    const slug = input.slug.toLowerCase().trim();
    const existing = await this.orgRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException(
        `Organization slug '${slug}' is already taken`,
      );
    }

    const org = await this.orgRepository.create({
      name: input.name,
      slug,
      logoUrl: input.logoUrl,
      description: input.description,
    });

    await this.memberRepository.create({
      organizationId: org.id,
      userId,
      role: OrganizationRole.OWNER,
    });

    return {
      ...org.sanitize(),
      memberCount: 1,
      currentUserRole: OrganizationRole.OWNER,
    };
  }

  async getOrganizationById(
    orgId: number,
    userId?: number,
  ): Promise<OrganizationResponseDto> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    const memberCount = await this.memberRepository.countByOrg(orgId);
    let currentUserRole: OrganizationRole | undefined;

    if (userId) {
      const membership = await this.memberRepository.findByOrgAndUser(
        orgId,
        userId,
      );
      currentUserRole = membership?.role;
    }

    return {
      ...org.sanitize(),
      memberCount,
      currentUserRole,
    };
  }

  async getOrganizationBySlug(
    slug: string,
    userId?: number,
  ): Promise<OrganizationResponseDto> {
    const org = await this.orgRepository.findBySlug(slug.toLowerCase().trim());
    if (!org) {
      throw new NotFoundException(`Organization with slug '${slug}' not found`);
    }

    const memberCount = await this.memberRepository.countByOrg(org.id);
    let currentUserRole: OrganizationRole | undefined;

    if (userId) {
      const membership = await this.memberRepository.findByOrgAndUser(
        org.id,
        userId,
      );
      currentUserRole = membership?.role;
    }

    return {
      ...org.sanitize(),
      memberCount,
      currentUserRole,
    };
  }

  async getUserOrganizations(
    userId: number,
  ): Promise<OrganizationResponseDto[]> {
    const orgs = await this.orgRepository.findAllByUserId(userId);
    const results: OrganizationResponseDto[] = [];

    for (const org of orgs) {
      const memberCount = await this.memberRepository.countByOrg(org.id);
      const membership = await this.memberRepository.findByOrgAndUser(
        org.id,
        userId,
      );
      results.push({
        ...org.sanitize(),
        memberCount,
        currentUserRole: membership?.role,
      });
    }

    return results;
  }

  async updateOrganization(
    orgId: number,
    userId: number,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationResponseDto> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    const membership = await this.memberRepository.findByOrgAndUser(
      orgId,
      userId,
    );
    if (
      !membership ||
      (membership.role !== OrganizationRole.OWNER &&
        membership.role !== OrganizationRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can update organization details',
      );
    }

    if (input.slug) {
      const newSlug = input.slug.toLowerCase().trim();
      if (newSlug !== org.slug) {
        const existing = await this.orgRepository.findBySlug(newSlug);
        if (existing) {
          throw new ConflictException(
            `Organization slug '${newSlug}' is already taken`,
          );
        }
      }
    }

    const updated = await this.orgRepository.update(orgId, {
      name: input.name,
      slug: input.slug,
      logoUrl: input.logoUrl,
      description: input.description,
    });

    const memberCount = await this.memberRepository.countByOrg(orgId);

    return {
      ...updated.sanitize(),
      memberCount,
      currentUserRole: membership.role,
    };
  }

  async deleteOrganization(
    orgId: number,
    userId: number,
  ): Promise<DeleteOrganizationResponseDto> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    const membership = await this.memberRepository.findByOrgAndUser(
      orgId,
      userId,
    );
    if (!membership || membership.role !== OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'Only the organization owner can delete the organization',
      );
    }

    await this.orgRepository.delete(orgId);

    return {
      success: true,
      message: `Organization '${org.name || org.slug}' has been deleted successfully`,
    };
  }

  async listMembers(
    orgId: number,
    userId: number,
  ): Promise<OrganizationMemberResponseDto[]> {
    const membership = await this.memberRepository.findByOrgAndUser(
      orgId,
      userId,
    );
    if (!membership) {
      throw new ForbiddenException(
        'You must be a member to view the organization member list',
      );
    }

    const membersWithUsers =
      await this.memberRepository.findMembersWithUsers(orgId);

    return membersWithUsers.map(({ member, user }) => ({
      ...member.sanitize(),
      user: user.sanitize(),
    }));
  }

  async addMember(
    currentUserId: number,
    input: AddOrganizationMemberInput,
  ): Promise<MemberActionResponseDto> {
    const callerMembership = await this.memberRepository.findByOrgAndUser(
      input.organizationId,
      currentUserId,
    );
    if (
      !callerMembership ||
      (callerMembership.role !== OrganizationRole.OWNER &&
        callerMembership.role !== OrganizationRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can add new members',
      );
    }

    let targetUser = null;
    if (input.userId) {
      targetUser = await this.userRepository.findById(input.userId);
    } else if (input.email) {
      targetUser = await this.userRepository.findByEmail(input.email);
    } else {
      throw new BadRequestException(
        'Either userId or email must be provided to add a member',
      );
    }

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.memberRepository.findByOrgAndUser(
      input.organizationId,
      targetUser.id,
    );
    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const role = input.role ?? OrganizationRole.MEMBER;
    if (
      role === OrganizationRole.OWNER &&
      callerMembership.role !== OrganizationRole.OWNER
    ) {
      throw new ForbiddenException('Only an owner can grant the OWNER role');
    }

    const newMember = await this.memberRepository.create({
      organizationId: input.organizationId,
      userId: targetUser.id,
      role,
    });

    return {
      success: true,
      message: `User '${targetUser.email}' added to organization successfully`,
      member: {
        ...newMember.sanitize(),
        user: targetUser.sanitize(),
      },
    };
  }

  async updateMemberRole(
    currentUserId: number,
    input: UpdateMemberRoleInput,
  ): Promise<MemberActionResponseDto> {
    const callerMembership = await this.memberRepository.findByOrgAndUser(
      input.organizationId,
      currentUserId,
    );
    if (
      !callerMembership ||
      (callerMembership.role !== OrganizationRole.OWNER &&
        callerMembership.role !== OrganizationRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can update member roles',
      );
    }

    const targetMember = await this.memberRepository.findByOrgAndUser(
      input.organizationId,
      input.userId,
    );
    if (!targetMember) {
      throw new NotFoundException(
        'Target user is not a member of this organization',
      );
    }

    if (callerMembership.role === OrganizationRole.ADMIN) {
      if (targetMember.role === OrganizationRole.OWNER) {
        throw new ForbiddenException(
          'Admins cannot change the role of an Owner',
        );
      }
      if (input.role === OrganizationRole.OWNER) {
        throw new ForbiddenException('Admins cannot promote a member to Owner');
      }
    }

    if (
      targetMember.role === OrganizationRole.OWNER &&
      input.role !== OrganizationRole.OWNER
    ) {
      const ownerCount = await this.memberRepository.countOwnersByOrg(
        input.organizationId,
      );
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the only Owner of the organization. Transfer ownership or assign another Owner first.',
        );
      }
    }

    const updated = await this.memberRepository.updateRole(
      targetMember.id,
      input.role,
    );
    const targetUser = await this.userRepository.findById(input.userId);

    return {
      success: true,
      message: `Member role updated to ${input.role} successfully`,
      member: {
        ...updated.sanitize(),
        user: targetUser ? targetUser.sanitize() : undefined,
      },
    };
  }

  async removeMember(
    currentUserId: number,
    input: RemoveMemberInput,
  ): Promise<MemberActionResponseDto> {
    const callerMembership = await this.memberRepository.findByOrgAndUser(
      input.organizationId,
      currentUserId,
    );
    if (!callerMembership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const targetMember = await this.memberRepository.findByOrgAndUser(
      input.organizationId,
      input.userId,
    );
    if (!targetMember) {
      throw new NotFoundException(
        'Target user is not a member of this organization',
      );
    }

    const isSelf = currentUserId === input.userId;

    if (!isSelf) {
      if (
        callerMembership.role !== OrganizationRole.OWNER &&
        callerMembership.role !== OrganizationRole.ADMIN
      ) {
        throw new ForbiddenException(
          'Only owners and admins can remove other members',
        );
      }
      if (
        callerMembership.role === OrganizationRole.ADMIN &&
        targetMember.role === OrganizationRole.OWNER
      ) {
        throw new ForbiddenException(
          'Admins cannot remove an Owner from the organization',
        );
      }
    }

    if (targetMember.role === OrganizationRole.OWNER) {
      const ownerCount = await this.memberRepository.countOwnersByOrg(
        input.organizationId,
      );
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the sole Owner of the organization. Transfer ownership or delete the organization.',
        );
      }
    }

    await this.memberRepository.delete(targetMember.id);

    return {
      success: true,
      message: isSelf
        ? 'Successfully left the organization'
        : 'Member has been removed from the organization',
    };
  }

  async leaveOrganization(
    userId: number,
    organizationId: number,
  ): Promise<MemberActionResponseDto> {
    return this.removeMember(userId, { organizationId, userId });
  }
}
