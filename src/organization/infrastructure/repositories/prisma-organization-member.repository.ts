import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { OrganizationMemberEntity } from '../../domain/entities/organization-member.entity.js';
import { UserEntity } from '../../../user/domain/entities/user.entity.js';
import { OrganizationRole } from '../../domain/enums/organization-role.enum.js';
import type {
  CreateOrganizationMemberData,
  IOrganizationMemberRepository,
  MemberWithUser,
} from '../../domain/repositories/organization-member-repository.interface.js';

interface PrismaOrgMemberRecord {
  id: number;
  organizationId: number;
  userId: number;
  role: string;
  joinedAt: string | Date;
}

interface PrismaUserRecord {
  id: number;
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  refreshTokenHash?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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
export class PrismaOrganizationMemberRepository implements IOrganizationMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get memberModel(): PrismaOrmModel<PrismaOrgMemberRecord> {
    const orm = this.prisma.db.orm as unknown as Record<
      string,
      PrismaOrmModel<PrismaOrgMemberRecord>
    >;
    return (
      orm['OrganizationMember'] ||
      (
        orm['public'] as unknown as Record<
          string,
          PrismaOrmModel<PrismaOrgMemberRecord>
        >
      )?.['OrganizationMember'] ||
      orm['organizationMember']!
    );
  }

  private get userModel(): PrismaOrmModel<PrismaUserRecord> {
    const orm = this.prisma.db.orm as unknown as Record<
      string,
      PrismaOrmModel<PrismaUserRecord>
    >;
    return (
      orm['User'] ||
      (
        orm['public'] as unknown as Record<
          string,
          PrismaOrmModel<PrismaUserRecord>
        >
      )?.['User'] ||
      orm['user']!
    );
  }

  private toEntity(record: PrismaOrgMemberRecord): OrganizationMemberEntity {
    return OrganizationMemberEntity.reconstitute({
      id: record.id,
      organizationId: record.organizationId,
      userId: record.userId,
      role: record.role as OrganizationRole,
      joinedAt: new Date(record.joinedAt),
    });
  }

  private toUserEntity(record: PrismaUserRecord): UserEntity {
    return UserEntity.reconstitute({
      id: record.id,
      email: record.email,
      passwordHash: record.password,
      firstName: record.firstName ?? null,
      lastName: record.lastName ?? null,
      refreshTokenHash: record.refreshTokenHash ?? null,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  async findById(id: number): Promise<OrganizationMemberEntity | null> {
    const record = await this.memberModel.first({ id });
    return record ? this.toEntity(record) : null;
  }

  async findByOrgAndUser(
    organizationId: number,
    userId: number,
  ): Promise<OrganizationMemberEntity | null> {
    const record = await this.memberModel
      .where(
        (m: {
          organizationId: { eq: (val: number) => unknown };
          userId: { eq: (val: number) => unknown };
        }) => m.organizationId.eq(organizationId),
      )
      .all();

    const matched = record.find(
      (m) => m.userId === userId && m.organizationId === organizationId,
    );
    return matched ? this.toEntity(matched) : null;
  }

  async findMembersWithUsers(
    organizationId: number,
  ): Promise<MemberWithUser[]> {
    const records = await this.memberModel
      .where((m: { organizationId: { eq: (val: number) => unknown } }) =>
        m.organizationId.eq(organizationId),
      )
      .all();

    const results: MemberWithUser[] = [];
    for (const record of records) {
      const userRecord = await this.userModel.first({ id: record.userId });
      if (userRecord) {
        results.push({
          member: this.toEntity(record),
          user: this.toUserEntity(userRecord),
        });
      }
    }

    return results;
  }

  async findUserMemberships(
    userId: number,
  ): Promise<OrganizationMemberEntity[]> {
    const records = await this.memberModel
      .where((m: { userId: { eq: (val: number) => unknown } }) =>
        m.userId.eq(userId),
      )
      .all();

    return (records || []).map((r) => this.toEntity(r));
  }

  async create(
    data: CreateOrganizationMemberData,
  ): Promise<OrganizationMemberEntity> {
    const now = new Date().toISOString();
    const record = await this.memberModel.create({
      organizationId: data.organizationId,
      userId: data.userId,
      role: data.role ?? OrganizationRole.MEMBER,
      joinedAt: now,
    });

    return this.toEntity(record);
  }

  async updateRole(
    id: number,
    role: OrganizationRole,
  ): Promise<OrganizationMemberEntity> {
    await this.memberModel.where({ id }).update({ role });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `Organization member with ID ${id} not found after update`,
      );
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    await this.memberModel.where({ id }).delete();
    return true;
  }

  async deleteByOrgAndUser(
    organizationId: number,
    userId: number,
  ): Promise<boolean> {
    const member = await this.findByOrgAndUser(organizationId, userId);
    if (!member) {
      return false;
    }
    await this.delete(member.id);
    return true;
  }

  async countByOrg(organizationId: number): Promise<number> {
    const records = await this.memberModel
      .where((m: { organizationId: { eq: (val: number) => unknown } }) =>
        m.organizationId.eq(organizationId),
      )
      .all();
    return records ? records.length : 0;
  }

  async countOwnersByOrg(organizationId: number): Promise<number> {
    const records = await this.memberModel
      .where((m: { organizationId: { eq: (val: number) => unknown } }) =>
        m.organizationId.eq(organizationId),
      )
      .all();
    return (records || []).filter((m) => m.role === OrganizationRole.OWNER)
      .length;
  }
}
