import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { PermissionEntity } from '../../domain/entities/permission.entity.js';
import { generatePubId } from '../../../common/utils/unique-id.util.js';
import type {
  CreatePermissionData,
  IPermissionRepository,
  UpdatePermissionData,
} from '../../domain/repositories/permission-repository.interface.js';

interface PrismaPermissionRecord {
  id: number;
  pubId: string;
  resource: string;
  action: string;
  description?: string | null;
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
export class PrismaPermissionRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  private toEntity(record: PrismaPermissionRecord): PermissionEntity {
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

  async findById(id: number): Promise<PermissionEntity | null> {
    const record = await this.permissionModel.first({ id });
    return record ? this.toEntity(record) : null;
  }

  async findByPubId(pubId: string): Promise<PermissionEntity | null> {
    const record = await this.permissionModel
      .where((p: { pubId: { eq: (val: string) => unknown } }) =>
        p.pubId.eq(pubId),
      )
      .first();
    return record ? this.toEntity(record) : null;
  }

  async findByResourceAndAction(
    resource: string,
    action: string,
  ): Promise<PermissionEntity | null> {
    const res = resource.toLowerCase().trim();
    const act = action.toLowerCase().trim();
    const records = await this.permissionModel
      .where((p: { resource: { eq: (val: string) => unknown } }) =>
        p.resource.eq(res),
      )
      .all();

    const matched = (records || []).find(
      (p) =>
        p.resource.toLowerCase() === res && p.action.toLowerCase() === act,
    );
    return matched ? this.toEntity(matched) : null;
  }

  async findAll(): Promise<PermissionEntity[]> {
    const records = await this.permissionModel.all();
    return (records || []).map((r) => this.toEntity(r));
  }

  async findByIds(ids: number[]): Promise<PermissionEntity[]> {
    if (ids.length === 0) return [];
    const allRecords = await this.permissionModel.all();
    const set = new Set(ids);
    return (allRecords || [])
      .filter((r) => set.has(r.id))
      .map((r) => this.toEntity(r));
  }

  async findByPubIds(pubIds: string[]): Promise<PermissionEntity[]> {
    if (pubIds.length === 0) return [];
    const allRecords = await this.permissionModel.all();
    const set = new Set(pubIds);
    return (allRecords || [])
      .filter((r) => set.has(r.pubId))
      .map((r) => this.toEntity(r));
  }

  async create(data: CreatePermissionData): Promise<PermissionEntity> {
    const now = new Date().toISOString();
    const record = await this.permissionModel.create({
      pubId: data.pubId ?? generatePubId('perm'),
      resource: data.resource.toLowerCase().trim(),
      action: data.action.toLowerCase().trim(),
      description: data.description ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return this.toEntity(record);
  }

  async update(
    id: number,
    data: UpdatePermissionData,
  ): Promise<PermissionEntity> {
    const updatePayload: Record<string, unknown> = {};

    if (data.resource !== undefined) {
      updatePayload['resource'] = data.resource.toLowerCase().trim();
    }
    if (data.action !== undefined) {
      updatePayload['action'] = data.action.toLowerCase().trim();
    }
    if (data.description !== undefined) {
      updatePayload['description'] = data.description;
    }
    updatePayload['updatedAt'] = new Date().toISOString();

    await this.permissionModel.where({ id }).update(updatePayload);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Permission with ID ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    await this.permissionModel.where({ id }).delete();
    return true;
  }
}
