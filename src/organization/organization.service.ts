import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type IOrganizationRepository,
} from './domain/repositories/organization-repository.interface.js';
import {
  ORGANIZATION_MEMBER_REPOSITORY,
  type IOrganizationMemberRepository,
} from './domain/repositories/organization-member-repository.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../user/domain/repositories/user-repository.interface.js';
import { OrganizationRole } from './domain/enums/organization-role.enum.js';
import { OrganizationEntity } from './domain/entities/organization.entity.js';
import { UserEntity } from '../user/domain/entities/user.entity.js';
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
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  public async resolveOrganization(identifier: string): Promise<OrganizationEntity> {
    try {
      const trimmed = identifier.trim();
      if (trimmed.startsWith('org_')) {
        const byPubId = await this.orgRepository.findByPubId(trimmed);
        if (byPubId) return byPubId;
      }
      const bySlug = await this.orgRepository.findBySlug(trimmed.toLowerCase());
      if (bySlug) return bySlug;

      const byPubId = await this.orgRepository.findByPubId(trimmed);
      if (byPubId) return byPubId;

      throw new NotFoundException(`Organization '${identifier}' not found`);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in resolveOrganization: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while resolving organization',
      );
    }
  }

  public async resolveUser(identifier: string): Promise<UserEntity> {
    try {
      const str = identifier.trim();
      if (str.includes('@')) {
        const user = await this.userRepository.findByEmail(str);
        if (user) return user;
      }
      if (str.startsWith('usr_')) {
        const user = await this.userRepository.findByPubId(str);
        if (user) return user;
      }
      const userByPubId = await this.userRepository.findByPubId(str);
      if (userByPubId) return userByPubId;

      const userByEmail = await this.userRepository.findByEmail(str);
      if (userByEmail) return userByEmail;

      throw new NotFoundException(`User '${identifier}' not found`);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in resolveUser: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while resolving user',
      );
    }
  }

  async createOrganization(
    userId: number,
    input: CreateOrganizationInput,
  ): Promise<OrganizationResponseDto> {
    try {
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in createOrganization: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while creating organization',
      );
    }
  }

  async getOrganizationByPubId(
    pubId: string,
    userId?: number,
  ): Promise<OrganizationResponseDto> {
    try {
      const org = await this.orgRepository.findByPubId(pubId.trim());
      if (!org) {
        throw new NotFoundException(`Organization with pubId '${pubId}' not found`);
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in getOrganizationByPubId: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while fetching organization by pubId',
      );
    }
  }

  async getOrganizationBySlug(
    slug: string,
    userId?: number,
  ): Promise<OrganizationResponseDto> {
    try {
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in getOrganizationBySlug: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while fetching organization by slug',
      );
    }
  }

  async getOrganization(
    identifier: string,
    userId?: number,
  ): Promise<OrganizationResponseDto> {
    try {
      const org = await this.resolveOrganization(identifier);
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in getOrganization: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while fetching organization',
      );
    }
  }

  async getUserOrganizations(
    userId: number,
  ): Promise<OrganizationResponseDto[]> {
    try {
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in getUserOrganizations: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while fetching user organizations',
      );
    }
  }

  async updateOrganization(
    orgIdentifier: string,
    userId: number,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationResponseDto> {
    try {
      const org = await this.resolveOrganization(orgIdentifier);

      const membership = await this.memberRepository.findByOrgAndUser(
        org.id,
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

      const updated = await this.orgRepository.update(org.id, {
        name: input.name,
        slug: input.slug,
        logoUrl: input.logoUrl,
        description: input.description,
      });

      const memberCount = await this.memberRepository.countByOrg(org.id);

      return {
        ...updated.sanitize(),
        memberCount,
        currentUserRole: membership.role,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in updateOrganization: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while updating organization',
      );
    }
  }

  async deleteOrganization(
    orgIdentifier: string,
    userId: number,
  ): Promise<DeleteOrganizationResponseDto> {
    try {
      const org = await this.resolveOrganization(orgIdentifier);

      const membership = await this.memberRepository.findByOrgAndUser(
        org.id,
        userId,
      );
      if (!membership || membership.role !== OrganizationRole.OWNER) {
        throw new ForbiddenException(
          'Only the organization owner can delete the organization',
        );
      }

      await this.orgRepository.delete(org.id);

      return {
        success: true,
        message: `Organization '${org.name || org.slug}' has been deleted successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in deleteOrganization: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while deleting organization',
      );
    }
  }

  async listMembers(
    orgIdentifier: string,
    userId: number,
  ): Promise<OrganizationMemberResponseDto[]> {
    try {
      const org = await this.resolveOrganization(orgIdentifier);
      const membership = await this.memberRepository.findByOrgAndUser(
        org.id,
        userId,
      );
      if (!membership) {
        throw new ForbiddenException(
          'You must be a member to view the organization member list',
        );
      }

      const membersWithUsers =
        await this.memberRepository.findMembersWithUsers(org.id);

      return membersWithUsers.map(({ member, user }) => ({
        ...member.sanitize(),
        user: user.sanitize(),
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in listMembers: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while listing organization members',
      );
    }
  }

  async addMember(
    currentUserId: number,
    input: AddOrganizationMemberInput,
  ): Promise<MemberActionResponseDto> {
    try {
      const org = await this.resolveOrganization(input.organizationId);

      const callerMembership = await this.memberRepository.findByOrgAndUser(
        org.id,
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

      let targetUser: UserEntity | null = null;
      if (input.userId) {
        targetUser = await this.resolveUser(input.userId);
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
        org.id,
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
        organizationId: org.id,
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in addMember: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while adding organization member',
      );
    }
  }

  async updateMemberRole(
    currentUserId: number,
    input: UpdateMemberRoleInput,
  ): Promise<MemberActionResponseDto> {
    try {
      const org = await this.resolveOrganization(input.organizationId);

      const callerMembership = await this.memberRepository.findByOrgAndUser(
        org.id,
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

      const targetUser = await this.resolveUser(input.userId);
      const targetMember = await this.memberRepository.findByOrgAndUser(
        org.id,
        targetUser.id,
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
          org.id,
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

      return {
        success: true,
        message: `Member role updated to ${input.role} successfully`,
        member: {
          ...updated.sanitize(),
          user: targetUser.sanitize(),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in updateMemberRole: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while updating member role',
      );
    }
  }

  async removeMember(
    currentUserId: number,
    input: RemoveMemberInput,
  ): Promise<MemberActionResponseDto> {
    try {
      const org = await this.resolveOrganization(input.organizationId);

      const callerMembership = await this.memberRepository.findByOrgAndUser(
        org.id,
        currentUserId,
      );
      if (!callerMembership) {
        throw new ForbiddenException('You are not a member of this organization');
      }

      const targetUser = await this.resolveUser(input.userId);
      const targetMember = await this.memberRepository.findByOrgAndUser(
        org.id,
        targetUser.id,
      );
      if (!targetMember) {
        throw new NotFoundException(
          'Target user is not a member of this organization',
        );
      }

      const isSelf = currentUserId === targetUser.id;

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
          org.id,
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in removeMember: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while removing member',
      );
    }
  }

  async leaveOrganization(
    userId: number,
    organizationPubId: string,
  ): Promise<MemberActionResponseDto> {
    try {
      const user = await this.userRepository.findById(userId);
      return await this.removeMember(userId, {
        organizationId: organizationPubId,
        userId: user?.pubId ?? String(userId),
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in leaveOrganization: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while leaving organization',
      );
    }
  }
}
