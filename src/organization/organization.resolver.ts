import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { OrganizationService } from './organization.service.js';
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

@Resolver(() => OrganizationResponseDto)
@UseGuards(JwtAuthGuard)
export class OrganizationResolver {
  constructor(private readonly organizationService: OrganizationService) {}

  @Query(() => [OrganizationResponseDto], {
    name: 'myOrganizations',
    description:
      'Fetch all organizations the authenticated user is a member of',
  })
  async myOrganizations(
    @CurrentUser('id') userId: number,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationService.getUserOrganizations(userId);
  }

  @Query(() => OrganizationResponseDto, {
    name: 'organization',
    description: 'Fetch organization details by unique pubId or slug',
  })
  async organization(
    @Args('pubIdOrSlug', { type: () => String, description: 'Organization pubId or slug' }) pubIdOrSlug: string,
    @CurrentUser('id') userId: number,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.getOrganization(pubIdOrSlug, userId);
  }

  @Query(() => OrganizationResponseDto, {
    name: 'organizationBySlug',
    description: 'Fetch organization details by unique slug',
  })
  async organizationBySlug(
    @Args('slug', { type: () => String, description: 'Organization slug' }) slug: string,
    @CurrentUser('id') userId: number,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.getOrganizationBySlug(slug, userId);
  }

  @Query(() => [OrganizationMemberResponseDto], {
    name: 'organizationMembers',
    description:
      'Fetch all members belonging to an organization with their user profiles',
  })
  async organizationMembers(
    @Args('organizationPubId', { type: () => String, description: 'Organization pubId or slug' }) organizationPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<OrganizationMemberResponseDto[]> {
    return this.organizationService.listMembers(organizationPubId, userId);
  }

  @Mutation(() => OrganizationResponseDto, {
    description: 'Create a new organization and assign the creator as OWNER',
  })
  async createOrganization(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateOrganizationInput,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.createOrganization(userId, input);
  }

  @Mutation(() => OrganizationResponseDto, {
    description: 'Update organization details (Requires OWNER or ADMIN role)',
  })
  async updateOrganization(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Organization pubId or slug' }) pubId: string,
    @Args('input') input: UpdateOrganizationInput,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.updateOrganization(pubId, userId, input);
  }

  @Mutation(() => DeleteOrganizationResponseDto, {
    description: 'Delete an organization (Requires OWNER role)',
  })
  async deleteOrganization(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Organization pubId or slug' }) pubId: string,
  ): Promise<DeleteOrganizationResponseDto> {
    return this.organizationService.deleteOrganization(pubId, userId);
  }

  @Mutation(() => MemberActionResponseDto, {
    description:
      'Add a new member to an organization (Requires OWNER or ADMIN role)',
  })
  async addOrganizationMember(
    @CurrentUser('id') userId: number,
    @Args('input') input: AddOrganizationMemberInput,
  ): Promise<MemberActionResponseDto> {
    return this.organizationService.addMember(userId, input);
  }

  @Mutation(() => MemberActionResponseDto, {
    description:
      'Update a member role within an organization (Requires OWNER or ADMIN role)',
  })
  async updateOrganizationMemberRole(
    @CurrentUser('id') userId: number,
    @Args('input') input: UpdateMemberRoleInput,
  ): Promise<MemberActionResponseDto> {
    return this.organizationService.updateMemberRole(userId, input);
  }

  @Mutation(() => MemberActionResponseDto, {
    description:
      'Remove a member from an organization (Requires OWNER or ADMIN role)',
  })
  async removeOrganizationMember(
    @CurrentUser('id') userId: number,
    @Args('input') input: RemoveMemberInput,
  ): Promise<MemberActionResponseDto> {
    return this.organizationService.removeMember(userId, input);
  }

  @Mutation(() => MemberActionResponseDto, {
    description: 'Leave an organization as a member',
  })
  async leaveOrganization(
    @CurrentUser('id') userId: number,
    @Args('organizationPubId', { type: () => String, description: 'Organization pubId or slug' }) organizationPubId: string,
  ): Promise<MemberActionResponseDto> {
    return this.organizationService.leaveOrganization(userId, organizationPubId);
  }
}
