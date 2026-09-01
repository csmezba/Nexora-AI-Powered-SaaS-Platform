import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrganizationEntity } from '../../domain/entities/organization.entity.js';
import type {
  CreateOrganizationData,
  IOrganizationRepository,
  UpdateOrganizationData,
} from '../../domain/repositories/organization-repository.interface.js';

interface PrismaOrganizationRecord {
  id: number;
  name?: string | null;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaOrgMemberRecord {
  id: number;
  organizationId: number;
  userId: number;
  role: string;
  joinedAt: string | Date;
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
export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get orgModel(): PrismaOrmModel<PrismaOrganizationRecord> {
    const orm = this.prisma.db.orm as unknown as Record<
      string,
      PrismaOrmModel<PrismaOrganizationRecord>
    >;
    return (
      orm['Organization'] ||
      (
        orm['public'] as unknown as Record<
          string,
          PrismaOrmModel<PrismaOrganizationRecord>
        >
      )?.['Organization'] ||
      orm['organization']!
    );
  }

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

  private toEntity(record: PrismaOrganizationRecord): OrganizationEntity {
    return OrganizationEntity.reconstitute({
      id: record.id,
      name: record.name ?? null,
      slug: record.slug,
      logoUrl: record.logoUrl ?? null,
      description: record.description ?? null,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  async findById(id: number): Promise<OrganizationEntity | null> {
    const record = await this.orgModel.first({ id });
    return record ? this.toEntity(record) : null;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const normalizedSlug = slug.toLowerCase().trim();
    const record = await this.orgModel
      .where((o: { slug: { eq: (val: string) => unknown } }) =>
        o.slug.eq(normalizedSlug),
      )
      .first();
    return record ? this.toEntity(record) : null;
  }

  async findAllByUserId(userId: number): Promise<OrganizationEntity[]> {
    const members = await this.memberModel
      .where((m: { userId: { eq: (val: number) => unknown } }) =>
        m.userId.eq(userId),
      )
      .all();

    if (!members || members.length === 0) {
      return [];
    }

    const orgIds = [...new Set(members.map((m) => m.organizationId))];
    const orgs: OrganizationEntity[] = [];

    for (const orgId of orgIds) {
      const org = await this.findById(orgId);
      if (org) {
        orgs.push(org);
      }
    }

    return orgs;
  }

  async create(data: CreateOrganizationData): Promise<OrganizationEntity> {
    const now = new Date().toISOString();
    const record = await this.orgModel.create({
      name: data.name ?? null,
      slug: data.slug.toLowerCase().trim(),
      logoUrl: data.logoUrl ?? null,
      description: data.description ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return this.toEntity(record);
  }

  async update(
    id: number,
    data: UpdateOrganizationData,
  ): Promise<OrganizationEntity> {
    const updatePayload: Record<string, unknown> = {};

    if (data.name !== undefined) updatePayload['name'] = data.name;
    if (data.slug !== undefined)
      updatePayload['slug'] = data.slug.toLowerCase().trim();
    if (data.logoUrl !== undefined) updatePayload['logoUrl'] = data.logoUrl;
    if (data.description !== undefined)
      updatePayload['description'] = data.description;

    updatePayload['updatedAt'] = new Date().toISOString();

    await this.orgModel.where({ id }).update(updatePayload);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Organization with ID ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    await this.orgModel.where({ id }).delete();
    return true;
  }
}
