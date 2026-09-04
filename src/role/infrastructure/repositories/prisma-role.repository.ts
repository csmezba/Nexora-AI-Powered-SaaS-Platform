import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RoleEntity } from '../../domain/entities/role.entity.js';
import { PermissionEntity } from '../../domain/entities/permission.entity.js';
import { RolePermissionEntity } from '../../domain/entities/role-permission.entity.js';
import { OrganizationMemberRoleEntity } from '../../domain/entities/organization-member-role.entity.js';
import { generatePubId } from '../../../common/utils/unique-id.util.js';
import type {
  CreateRoleData,
  IRoleRepository,
  UpdateRoleData,
} from '../../domain/repositories/role-repository.interface.js';

interface PrismaRoleRecord {
  id: number;
  pubId: string;
  name: string;
  description?: string | null;
  organizationId: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaPermissionRecord {
  id: number;
  pubId: string;
  resource: string;
  action: string;
  description?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaRolePermissionRecord {
  pubId: string;
  roleId: number;
  permissionId: number;
  assignedAt: string | Date;
}

interface PrismaMemberRoleRecord {
  pubId: string;
  organizationMemberId: number;
  roleId: number;
  assignedAt: string | Date;
}

interface PrismaOrmModel<T> {
  first(filter?: Record<string, unknown>): Promise<T | null>;
  where(predicate: unknown): {
    first(): Promise<T | null>;
    all(): Promise<T[]> & AsyncIterable<T>;
    update(data: Record<string, unknown>): Promise<unknown>;
    delete(): Promise<unknown>;
  };
  create(data: Record<string, unknown>): Promise<T>;
  all(): Promise<T[]> & AsyncIterable<T>;
}

@Injectable()
export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get roleModel(): PrismaOrmModel<PrismaRoleRecord> {
    const orm = this.prisma.db.orm as unknown as Record<
      string,
      PrismaOrmModel<PrismaRoleRecord>
    >;
    return (
      orm['Role'] ||
      (
        orm['public'] as unknown as Record<
          string,
          PrismaOrmModel<PrismaRoleRecord>
        >
      )?.['Role'] ||
      orm['role']!
    );
  }

  private get permissionModel(): PrismaOrmModel<PrismaPermissionRecord> {
    const orm = this.prisma.db.orm as unknown as Record<
      string,
      PrismaOrmModel<PrismaPermissionRecord>
    >;
    return (
      orm['Permission'] ||
      (
        orm['public'] as unknown as Record<
          string,
          PrismaOrmModel<PrismaPermissionRecord>
        >
      )?.['Permission'] ||
      orm['permission']!
    );
  }

  private get rolePermissionModel(): PrismaOrmModel<PrismaRolePermissionRecord> {
    const orm = this.prisma.db.orm as unknown as Record<
      string,
      PrismaOrmModel<PrismaRolePermissionRecord>
    >;
    return (
      orm['RolePermission'] ||
      (
        orm['public'] as unknown as Record<
          string,
          PrismaOrmModel<PrismaRolePermissionRecord>
        >
      )?.['RolePermission'] ||
      orm['rolePermission']!
    );
  }

  private get memberRoleModel(): PrismaOrmModel<PrismaMemberRoleRecord> {
    const orm = this.prisma.db.orm as unknown as Record<
      string,
      PrismaOrmModel<PrismaMemberRoleRecord>
    >;
    return (
      orm['OrganizationMemberRole'] ||
      (
        orm['public'] as unknown as Record<
          string,
          PrismaOrmModel<PrismaMemberRoleRecord>
        >
      )?.['OrganizationMemberRole'] ||
      orm['organizationMemberRole']!
    );
  }

  private toRoleEntity(
    record: PrismaRoleRecord,
    permissions?: PermissionEntity[],
  ): RoleEntity {
    return RoleEntity.reconstitute({
      id: record.id,
      pubId: record.pubId,
      name: record.name,
      description: record.description ?? null,
      organizationId: record.organizationId,
      permissions: permissions ? permissions.map((p) => p.sanitize()) : [],
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  private toPermissionEntity(
    record: PrismaPermissionRecord,
  ): PermissionEntity {
    return PermissionEntity.reconstitute({
      id: record.id,
      pubId: record.pubId,
      resource: record.resource,
      action: record.action,
      description: record.description ?? null,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  async findById(id: number): Promise<RoleEntity | null> {
    const record = await this.roleModel.first({ id });
    if (!record) return null;
    const permissions = await this.getRolePermissions(record.id);
    return this.toRoleEntity(record, permissions);
  }

  async findByPubId(pubId: string): Promise<RoleEntity | null> {
    const record = await this.roleModel
      .where((r: { pubId: { eq: (val: string) => unknown } }) =>
        r.pubId.eq(pubId),
      )
      .first();
    if (!record) return null;
    const permissions = await this.getRolePermissions(record.id);
    return this.toRoleEntity(record, permissions);
  }

  async findByNameAndOrg(
    organizationId: number,
    name: string,
  ): Promise<RoleEntity | null> {
    const trimmed = name.trim();
    const records = await this.roleModel
      .where((r: { organizationId: { eq: (val: number) => unknown } }) =>
        r.organizationId.eq(organizationId),
      )
      .all();

    const matched = (records || []).find(
      (r) =>
        r.organizationId === organizationId &&
        r.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!matched) return null;
    const permissions = await this.getRolePermissions(matched.id);
    return this.toRoleEntity(matched, permissions);
  }

  async findByPubIdAndOrg(
    organizationId: number,
    pubId: string,
  ): Promise<RoleEntity | null> {
    const record = await this.roleModel
      .where((r: { pubId: { eq: (val: string) => unknown } }) =>
        r.pubId.eq(pubId),
      )
      .first();
    if (!record || record.organizationId !== organizationId) return null;
    const permissions = await this.getRolePermissions(record.id);
    return this.toRoleEntity(record, permissions);
  }

  async findAllByOrg(organizationId: number): Promise<RoleEntity[]> {
    const records = await this.roleModel
      .where((r: { organizationId: { eq: (val: number) => unknown } }) =>
        r.organizationId.eq(organizationId),
      )
      .all();

    const results: RoleEntity[] = [];
    for (const record of records || []) {
      const permissions = await this.getRolePermissions(record.id);
      results.push(this.toRoleEntity(record, permissions));
    }
    return results;
  }

  async create(data: CreateRoleData): Promise<RoleEntity> {
    const now = new Date().toISOString();
    const record = await this.roleModel.create({
      pubId: data.pubId ?? generatePubId('rol'),
      name: data.name.trim(),
      description: data.description ?? null,
      organizationId: data.organizationId,
      createdAt: now,
      updatedAt: now,
    });

    return this.toRoleEntity(record, []);
  }

  async update(id: number, data: UpdateRoleData): Promise<RoleEntity> {
    const updatePayload: Record<string, unknown> = {};
    if (data.name !== undefined) updatePayload['name'] = data.name.trim();
    if (data.description !== undefined)
      updatePayload['description'] = data.description;
    updatePayload['updatedAt'] = new Date().toISOString();

    await this.roleModel.where({ id }).update(updatePayload);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Role with ID ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    await this.roleModel.where({ id }).delete();
    return true;
  }

  async getRolePermissions(roleId: number): Promise<PermissionEntity[]> {
    const rps = await this.rolePermissionModel
      .where((rp: { roleId: { eq: (val: number) => unknown } }) =>
        rp.roleId.eq(roleId),
      )
      .all();

    if (!rps || rps.length === 0) return [];

    const permissionIds = rps.map((rp) => rp.permissionId);
    const allPermissions = await this.permissionModel.all();
    const permMap = new Map((allPermissions || []).map((p) => [p.id, p]));

    return permissionIds
      .map((pid) => permMap.get(pid))
      .filter((p): p is PrismaPermissionRecord => Boolean(p))
      .map((p) => this.toPermissionEntity(p));
  }

  async assignPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<RolePermissionEntity[]> {
    const existing = await this.rolePermissionModel
      .where((rp: { roleId: { eq: (val: number) => unknown } }) =>
        rp.roleId.eq(roleId),
      )
      .all();

    const existingIds = new Set((existing || []).map((e) => e.permissionId));
    const toAdd = permissionIds.filter((pid) => !existingIds.has(pid));

    const results: RolePermissionEntity[] = (existing || []).map((e) =>
      RolePermissionEntity.reconstitute({
        pubId: e.pubId,
        roleId: e.roleId,
        permissionId: e.permissionId,
        assignedAt: new Date(e.assignedAt),
      }),
    );

    for (const pid of toAdd) {
      const now = new Date().toISOString();
      const created = await this.rolePermissionModel.create({
        pubId: generatePubId('rp'),
        roleId,
        permissionId: pid,
        assignedAt: now,
      });
      results.push(
        RolePermissionEntity.reconstitute({
          pubId: created.pubId,
          roleId: created.roleId,
          permissionId: created.permissionId,
          assignedAt: new Date(created.assignedAt),
        }),
      );
    }

    return results;
  }

  async removePermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<boolean> {
    const existing = await this.rolePermissionModel
      .where((rp: { roleId: { eq: (val: number) => unknown } }) =>
        rp.roleId.eq(roleId),
      )
      .all();

    const toRemove = new Set(permissionIds);
    for (const item of existing || []) {
      if (toRemove.has(item.permissionId)) {
        await this.rolePermissionModel
          .where({ roleId, permissionId: item.permissionId })
          .delete();
      }
    }

    return true;
  }

  async syncPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<PermissionEntity[]> {
    const existing = await this.rolePermissionModel
      .where((rp: { roleId: { eq: (val: number) => unknown } }) =>
        rp.roleId.eq(roleId),
      )
      .all();

    const targetSet = new Set(permissionIds);
    const currentIds = new Set((existing || []).map((e) => e.permissionId));

    // Remove obsolete
    for (const item of existing || []) {
      if (!targetSet.has(item.permissionId)) {
        await this.rolePermissionModel
          .where({ roleId, permissionId: item.permissionId })
          .delete();
      }
    }

    // Add new
    for (const pid of permissionIds) {
      if (!currentIds.has(pid)) {
        const now = new Date().toISOString();
        await this.rolePermissionModel.create({
          pubId: generatePubId('rp'),
          roleId,
          permissionId: pid,
          assignedAt: now,
        });
      }
    }

    return this.getRolePermissions(roleId);
  }

  async getMemberRoles(organizationMemberId: number): Promise<RoleEntity[]> {
    const memberRoles = await this.memberRoleModel
      .where(
        (mr: {
          organizationMemberId: { eq: (val: number) => unknown };
        }) => mr.organizationMemberId.eq(organizationMemberId),
      )
      .all();

    if (!memberRoles || memberRoles.length === 0) return [];

    const roleIds = memberRoles.map((mr) => mr.roleId);
    const results: RoleEntity[] = [];

    for (const rId of roleIds) {
      const role = await this.findById(rId);
      if (role) {
        results.push(role);
      }
    }

    return results;
  }

  async assignRoleToMember(
    organizationMemberId: number,
    roleId: number,
  ): Promise<OrganizationMemberRoleEntity> {
    const existing = await this.memberRoleModel
      .where(
        (mr: {
          organizationMemberId: { eq: (val: number) => unknown };
          roleId: { eq: (val: number) => unknown };
        }) => mr.organizationMemberId.eq(organizationMemberId),
      )
      .all();

    const found = (existing || []).find(
      (mr) =>
        mr.organizationMemberId === organizationMemberId &&
        mr.roleId === roleId,
    );

    if (found) {
      return OrganizationMemberRoleEntity.reconstitute({
        pubId: found.pubId,
        organizationMemberId: found.organizationMemberId,
        roleId: found.roleId,
        assignedAt: new Date(found.assignedAt),
      });
    }

    const now = new Date().toISOString();
    const created = await this.memberRoleModel.create({
      pubId: generatePubId('omr'),
      organizationMemberId,
      roleId,
      assignedAt: now,
    });

    return OrganizationMemberRoleEntity.reconstitute({
      pubId: created.pubId,
      organizationMemberId: created.organizationMemberId,
      roleId: created.roleId,
      assignedAt: new Date(created.assignedAt),
    });
  }

  async removeRoleFromMember(
    organizationMemberId: number,
    roleId: number,
  ): Promise<boolean> {
    await this.memberRoleModel
      .where({ organizationMemberId, roleId })
      .delete();
    return true;
  }
}
