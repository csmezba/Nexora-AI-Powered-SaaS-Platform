import type { PermissionEntity } from '../entities/permission.entity.js';

export interface CreatePermissionData {
  pubId?: string;
  resource: string;
  action: string;
  description?: string | null;
}

export interface UpdatePermissionData {
  resource?: string;
  action?: string;
  description?: string | null;
}

export interface IPermissionRepository {
  findById(id: number): Promise<PermissionEntity | null>;
  findByPubId(pubId: string): Promise<PermissionEntity | null>;
  findByResourceAndAction(
    resource: string,
    action: string,
  ): Promise<PermissionEntity | null>;
  findAll(): Promise<PermissionEntity[]>;
  findByIds(ids: number[]): Promise<PermissionEntity[]>;
  findByPubIds(pubIds: string[]): Promise<PermissionEntity[]>;
  create(data: CreatePermissionData): Promise<PermissionEntity>;
  update(id: number, data: UpdatePermissionData): Promise<PermissionEntity>;
  delete(id: number): Promise<boolean>;
}

export const PERMISSION_REPOSITORY = Symbol('IPermissionRepository');
