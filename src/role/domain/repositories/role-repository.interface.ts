import type { RoleEntity } from '../entities/role.entity.js';
import type { RolePermissionEntity } from '../entities/role-permission.entity.js';
import type { OrganizationMemberRoleEntity } from '../entities/organization-member-role.entity.js';
import type { PermissionEntity } from '../entities/permission.entity.js';

export interface CreateRoleData {
  pubId?: string;
  name: string;
  description?: string | null;
  organizationId: number;
}

export interface UpdateRoleData {
  name?: string;
  description?: string | null;
}

export interface IRoleRepository {
  findById(id: number): Promise<RoleEntity | null>;
  findByPubId(pubId: string): Promise<RoleEntity | null>;
  findByNameAndOrg(
    organizationId: number,
    name: string,
  ): Promise<RoleEntity | null>;
  findByPubIdAndOrg(
    organizationId: number,
    pubId: string,
  ): Promise<RoleEntity | null>;
  findAllByOrg(organizationId: number): Promise<RoleEntity[]>;
  create(data: CreateRoleData): Promise<RoleEntity>;
  update(id: number, data: UpdateRoleData): Promise<RoleEntity>;
  delete(id: number): Promise<boolean>;

  // Role permissions
  getRolePermissions(roleId: number): Promise<PermissionEntity[]>;
  assignPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<RolePermissionEntity[]>;
  removePermissions(roleId: number, permissionIds: number[]): Promise<boolean>;
  syncPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<PermissionEntity[]>;

  // Member roles
  getMemberRoles(organizationMemberId: number): Promise<RoleEntity[]>;
  assignRoleToMember(
    organizationMemberId: number,
    roleId: number,
  ): Promise<OrganizationMemberRoleEntity>;
  removeRoleFromMember(
    organizationMemberId: number,
    roleId: number,
  ): Promise<boolean>;
}

export const ROLE_REPOSITORY = Symbol('IRoleRepository');
