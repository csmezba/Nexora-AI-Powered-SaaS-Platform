import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ROLE_REPOSITORY,
  type IRoleRepository,
} from './domain/repositories/role-repository.interface.js';
import {
  PERMISSION_REPOSITORY,
  type IPermissionRepository,
} from './domain/repositories/permission-repository.interface.js';
import {
  ORGANIZATION_REPOSITORY,
  type IOrganizationRepository,
} from '../organization/domain/repositories/organization-repository.interface.js';
import {
  ORGANIZATION_MEMBER_REPOSITORY,
  type IOrganizationMemberRepository,
} from '../organization/domain/repositories/organization-member-repository.interface.js';
import { OrganizationRole } from '../organization/domain/enums/organization-role.enum.js';
import type {
  AssignPermissionsInput,
  AssignRoleToMemberInput,
  CreateRoleInput,
  DeleteRoleResponseDto,
  RemoveRoleFromMemberInput,
  RoleActionResponseDto,
  RoleResponseDto,
  UpdateRoleInput,
} from './dto/role.dto.js';
import type {
  CreatePermissionInput,
  DeletePermissionResponseDto,
  PermissionResponseDto,
  UpdatePermissionInput,
} from './dto/permission.dto.js';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  private async resolveOrganization(pubIdOrSlug: string) {
    const org = await this.organizationRepository.findByPubIdOrSlug(pubIdOrSlug);
    if (!org) {
      throw new NotFoundException(`Organization '${pubIdOrSlug}' not found`);
    }
    return org;
  }

  private async ensureAdminOrOwner(organizationId: number, userId: number) {
    const member = await this.memberRepository.findByOrgAndUser(
      organizationId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    if (
      member.role !== OrganizationRole.OWNER &&
      member.role !== OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only organization OWNER or ADMIN can perform this action',
      );
    }
    return member;
  }

  private async ensureMember(organizationId: number, userId: number) {
    const member = await this.memberRepository.findByOrgAndUser(
      organizationId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return member;
  }

  // --- Role Management ---

  async createRole(
    userId: number,
    input: CreateRoleInput,
  ): Promise<RoleResponseDto> {
    const org = await this.resolveOrganization(input.organizationPubId);
    await this.ensureAdminOrOwner(org.id, userId);

    const existingRole = await this.roleRepository.findByNameAndOrg(
      org.id,
      input.name,
    );
    if (existingRole) {
      throw new ConflictException(
        `Role with name '${input.name}' already exists in this organization`,
      );
    }

    const role = await this.roleRepository.create({
      name: input.name,
      description: input.description,
      organizationId: org.id,
    });

    if (input.permissionPubIds && input.permissionPubIds.length > 0) {
      const permissions = await this.permissionRepository.findByPubIds(
        input.permissionPubIds,
      );
      if (permissions.length !== input.permissionPubIds.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }
      await this.roleRepository.syncPermissions(
        role.id,
        permissions.map((p) => p.id),
      );
    }

    const created = await this.roleRepository.findById(role.id);
    if (!created) {
      throw new NotFoundException('Role could not be retrieved after creation');
    }

    return this.toRoleResponse(created);
  }

  async updateRole(
    pubId: string,
    userId: number,
    input: UpdateRoleInput,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findByPubId(pubId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${pubId}' not found`);
    }

    await this.ensureAdminOrOwner(role.organizationId, userId);

    if (input.name && input.name !== role.name) {
      const existing = await this.roleRepository.findByNameAndOrg(
        role.organizationId,
        input.name,
      );
      if (existing && existing.id !== role.id) {
        throw new ConflictException(
          `Role with name '${input.name}' already exists in this organization`,
        );
      }
    }

    const updated = await this.roleRepository.update(role.id, {
      name: input.name,
      description: input.description,
    });

    return this.toRoleResponse(updated);
  }

  async deleteRole(
    pubId: string,
    userId: number,
  ): Promise<DeleteRoleResponseDto> {
    const role = await this.roleRepository.findByPubId(pubId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${pubId}' not found`);
    }

    await this.ensureAdminOrOwner(role.organizationId, userId);

    await this.roleRepository.delete(role.id);

    return {
      success: true,
      message: `Role '${role.name}' deleted successfully`,
    };
  }

  async getRole(pubId: string, userId: number): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findByPubId(pubId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${pubId}' not found`);
    }

    await this.ensureMember(role.organizationId, userId);

    return this.toRoleResponse(role);
  }

  async listRoles(
    organizationPubId: string,
    userId: number,
  ): Promise<RoleResponseDto[]> {
    const org = await this.resolveOrganization(organizationPubId);
    await this.ensureMember(org.id, userId);

    const roles = await this.roleRepository.findAllByOrg(org.id);
    return roles.map((r) => this.toRoleResponse(r));
  }

  // --- Permission Management ---

  async createPermission(
    input: CreatePermissionInput,
  ): Promise<PermissionResponseDto> {
    const existing = await this.permissionRepository.findByResourceAndAction(
      input.resource,
      input.action,
    );
    if (existing) {
      throw new ConflictException(
        `Permission '${input.resource}:${input.action}' already exists`,
      );
    }

    const permission = await this.permissionRepository.create({
      resource: input.resource,
      action: input.action,
      description: input.description,
    });

    return this.toPermissionResponse(permission);
  }

  async updatePermission(
    pubId: string,
    input: UpdatePermissionInput,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findByPubId(pubId);
    if (!permission) {
      throw new NotFoundException(`Permission with ID '${pubId}' not found`);
    }

    if (input.resource || input.action) {
      const targetResource = input.resource ?? permission.resource;
      const targetAction = input.action ?? permission.action;
      const existing =
        await this.permissionRepository.findByResourceAndAction(
          targetResource,
          targetAction,
        );
      if (existing && existing.id !== permission.id) {
        throw new ConflictException(
          `Permission '${targetResource}:${targetAction}' already exists`,
        );
      }
    }

    const updated = await this.permissionRepository.update(permission.id, {
      resource: input.resource,
      action: input.action,
      description: input.description,
    });

    return this.toPermissionResponse(updated);
  }

  async deletePermission(pubId: string): Promise<DeletePermissionResponseDto> {
    const permission = await this.permissionRepository.findByPubId(pubId);
    if (!permission) {
      throw new NotFoundException(`Permission with ID '${pubId}' not found`);
    }

    await this.permissionRepository.delete(permission.id);

    return {
      success: true,
      message: `Permission '${permission.resource}:${permission.action}' deleted successfully`,
    };
  }

  async listPermissions(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.findAll();
    return permissions.map((p) => this.toPermissionResponse(p));
  }

  async assignPermissionsToRole(
    userId: number,
    input: AssignPermissionsInput,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findByPubId(input.rolePubId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${input.rolePubId}' not found`);
    }

    await this.ensureAdminOrOwner(role.organizationId, userId);

    const permissions = await this.permissionRepository.findByPubIds(
      input.permissionPubIds,
    );
    if (permissions.length !== input.permissionPubIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    await this.roleRepository.syncPermissions(
      role.id,
      permissions.map((p) => p.id),
    );

    const updated = await this.roleRepository.findById(role.id);
    if (!updated) {
      throw new NotFoundException('Role could not be retrieved after update');
    }

    return this.toRoleResponse(updated);
  }

  // --- Member Role Assignment ---

  async assignRoleToMember(
    userId: number,
    input: AssignRoleToMemberInput,
  ): Promise<RoleActionResponseDto> {
    const org = await this.resolveOrganization(input.organizationPubId);
    await this.ensureAdminOrOwner(org.id, userId);

    const member = await this.memberRepository.findByPubId(input.memberPubId);
    if (!member || member.organizationId !== org.id) {
      throw new NotFoundException('Organization member not found');
    }

    const role = await this.roleRepository.findByPubIdAndOrg(
      org.id,
      input.rolePubId,
    );
    if (!role) {
      throw new NotFoundException(
        `Role '${input.rolePubId}' not found in this organization`,
      );
    }

    await this.roleRepository.assignRoleToMember(member.id, role.id);

    return {
      success: true,
      message: `Role '${role.name}' assigned to member successfully`,
      role: this.toRoleResponse(role),
    };
  }

  async removeRoleFromMember(
    userId: number,
    input: RemoveRoleFromMemberInput,
  ): Promise<RoleActionResponseDto> {
    const org = await this.resolveOrganization(input.organizationPubId);
    await this.ensureAdminOrOwner(org.id, userId);

    const member = await this.memberRepository.findByPubId(input.memberPubId);
    if (!member || member.organizationId !== org.id) {
      throw new NotFoundException('Organization member not found');
    }

    const role = await this.roleRepository.findByPubIdAndOrg(
      org.id,
      input.rolePubId,
    );
    if (!role) {
      throw new NotFoundException(
        `Role '${input.rolePubId}' not found in this organization`,
      );
    }

    await this.roleRepository.removeRoleFromMember(member.id, role.id);

    return {
      success: true,
      message: `Role '${role.name}' removed from member successfully`,
      role: this.toRoleResponse(role),
    };
  }

  async getMemberRoles(
    organizationPubId: string,
    memberPubId: string,
    userId: number,
  ): Promise<RoleResponseDto[]> {
    const org = await this.resolveOrganization(organizationPubId);
    await this.ensureMember(org.id, userId);

    const member = await this.memberRepository.findByPubId(memberPubId);
    if (!member || member.organizationId !== org.id) {
      throw new NotFoundException('Organization member not found');
    }

    const roles = await this.roleRepository.getMemberRoles(member.id);
    return roles.map((r) => this.toRoleResponse(r));
  }

  // --- Helpers ---

  private toRoleResponse(role: {
    id: number;
    pubId: string;
    name: string;
    description: string | null;
    organizationId: number;
    permissions?: {
      id: number;
      pubId: string;
      resource: string;
      action: string;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
  }): RoleResponseDto {
    return {
      id: role.id,
      pubId: role.pubId,
      name: role.name,
      description: role.description,
      organizationId: role.organizationId,
      permissions: (role.permissions || []).map((p) =>
        this.toPermissionResponse(p),
      ),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private toPermissionResponse(permission: {
    id: number;
    pubId: string;
    resource: string;
    action: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PermissionResponseDto {
    return {
      id: permission.id,
      pubId: permission.pubId,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}
