import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RoleService } from './role.service.js';
import {
  AssignPermissionsInput,
  AssignRoleToMemberInput,
  CreateRoleInput,
  DeleteRoleResponseDto,
  RemoveRoleFromMemberInput,
  RoleActionResponseDto,
  RoleResponseDto,
  UpdateRoleInput,
} from './dto/role.dto.js';
import {
  CreatePermissionInput,
  DeletePermissionResponseDto,
  PermissionResponseDto,
  UpdatePermissionInput,
} from './dto/permission.dto.js';

@Resolver(() => RoleResponseDto)
@UseGuards(JwtAuthGuard)
export class RoleResolver {
  constructor(private readonly roleService: RoleService) {}

  // --- Role Queries ---

  @Query(() => [RoleResponseDto], {
    name: 'organizationRoles',
    description: 'Fetch all custom roles belonging to an organization',
  })
  async organizationRoles(
    @Args('organizationPubId', {
      type: () => String,
      description: 'Organization pubId or slug',
    })
    organizationPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<RoleResponseDto[]> {
    return this.roleService.listRoles(organizationPubId, userId);
  }

  @Query(() => RoleResponseDto, {
    name: 'role',
    description: 'Fetch role details with permissions by unique pubId',
  })
  async role(
    @Args('pubId', { type: () => String, description: 'Role pubId' })
    pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<RoleResponseDto> {
    return this.roleService.getRole(pubId, userId);
  }

  @Query(() => [RoleResponseDto], {
    name: 'organizationMemberRoles',
    description: 'Fetch custom roles assigned to an organization member',
  })
  async organizationMemberRoles(
    @Args('organizationPubId', {
      type: () => String,
      description: 'Organization pubId or slug',
    })
    organizationPubId: string,
    @Args('memberPubId', {
      type: () => String,
      description: 'Member pubId',
    })
    memberPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<RoleResponseDto[]> {
    return this.roleService.getMemberRoles(
      organizationPubId,
      memberPubId,
      userId,
    );
  }

  // --- Permission Queries ---

  @Query(() => [PermissionResponseDto], {
    name: 'permissions',
    description: 'Fetch all available system permissions',
  })
  async permissions(): Promise<PermissionResponseDto[]> {
    return this.roleService.listPermissions();
  }

  // --- Role Mutations ---

  @Mutation(() => RoleResponseDto, {
    description:
      'Create a new organization role (Requires OWNER or ADMIN role in organization)',
  })
  async createRole(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateRoleInput,
  ): Promise<RoleResponseDto> {
    return this.roleService.createRole(userId, input);
  }

  @Mutation(() => RoleResponseDto, {
    description:
      'Update role details (Requires OWNER or ADMIN role in organization)',
  })
  async updateRole(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Role pubId' })
    pubId: string,
    @Args('input') input: UpdateRoleInput,
  ): Promise<RoleResponseDto> {
    return this.roleService.updateRole(pubId, userId, input);
  }

  @Mutation(() => DeleteRoleResponseDto, {
    description:
      'Delete a role from organization (Requires OWNER or ADMIN role in organization)',
  })
  async deleteRole(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Role pubId' })
    pubId: string,
  ): Promise<DeleteRoleResponseDto> {
    return this.roleService.deleteRole(pubId, userId);
  }

  @Mutation(() => RoleResponseDto, {
    description:
      'Assign or synchronize permissions for a role (Requires OWNER or ADMIN role)',
  })
  async assignPermissionsToRole(
    @CurrentUser('id') userId: number,
    @Args('input') input: AssignPermissionsInput,
  ): Promise<RoleResponseDto> {
    return this.roleService.assignPermissionsToRole(userId, input);
  }

  // --- Permission Mutations ---

  @Mutation(() => PermissionResponseDto, {
    description: 'Create a new permission entry',
  })
  async createPermission(
    @Args('input') input: CreatePermissionInput,
  ): Promise<PermissionResponseDto> {
    return this.roleService.createPermission(input);
  }

  @Mutation(() => PermissionResponseDto, {
    description: 'Update permission details',
  })
  async updatePermission(
    @Args('pubId', { type: () => String, description: 'Permission pubId' })
    pubId: string,
    @Args('input') input: UpdatePermissionInput,
  ): Promise<PermissionResponseDto> {
    return this.roleService.updatePermission(pubId, input);
  }

  @Mutation(() => DeletePermissionResponseDto, {
    description: 'Delete a permission',
  })
  async deletePermission(
    @Args('pubId', { type: () => String, description: 'Permission pubId' })
    pubId: string,
  ): Promise<DeletePermissionResponseDto> {
    return this.roleService.deletePermission(pubId);
  }

  // --- Member Role Assignment Mutations ---

  @Mutation(() => RoleActionResponseDto, {
    description:
      'Assign a role to an organization member (Requires OWNER or ADMIN role)',
  })
  async assignRoleToMember(
    @CurrentUser('id') userId: number,
    @Args('input') input: AssignRoleToMemberInput,
  ): Promise<RoleActionResponseDto> {
    return this.roleService.assignRoleToMember(userId, input);
  }

  @Mutation(() => RoleActionResponseDto, {
    description:
      'Remove a role from an organization member (Requires OWNER or ADMIN role)',
  })
  async removeRoleFromMember(
    @CurrentUser('id') userId: number,
    @Args('input') input: RemoveRoleFromMemberInput,
  ): Promise<RoleActionResponseDto> {
    return this.roleService.removeRoleFromMember(userId, input);
  }
}
