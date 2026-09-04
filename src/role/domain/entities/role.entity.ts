import type { SanitizedPermission } from './permission.entity.js';

export interface RoleEntityProps {
  id: number;
  pubId: string;
  name: string;
  description?: string | null;
  organizationId: number;
  permissions?: SanitizedPermission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedRole {
  id: number;
  pubId: string;
  name: string;
  description: string | null;
  organizationId: number;
  permissions?: SanitizedPermission[];
  createdAt: Date;
  updatedAt: Date;
}

export class RoleEntity {
  private readonly _id: number;
  private readonly _pubId: string;
  private _name: string;
  private _description: string | null;
  private readonly _organizationId: number;
  private _permissions: SanitizedPermission[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: RoleEntityProps) {
    this._id = props.id;
    this._pubId = props.pubId;
    this._name = props.name.trim();
    this._description = props.description ?? null;
    this._organizationId = props.organizationId;
    this._permissions = props.permissions ? [...props.permissions] : [];
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): number {
    return this._id;
  }

  public get pubId(): string {
    return this._pubId;
  }

  public get name(): string {
    return this._name;
  }

  public get description(): string | null {
    return this._description;
  }

  public get organizationId(): number {
    return this._organizationId;
  }

  public get permissions(): SanitizedPermission[] {
    return this._permissions;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public updateDetails(params: {
    name?: string;
    description?: string | null;
  }): void {
    if (params.name !== undefined) {
      if (!params.name.trim()) {
        throw new Error('Role name cannot be empty');
      }
      this._name = params.name.trim();
    }
    if (params.description !== undefined) {
      this._description = params.description;
    }
    this._updatedAt = new Date();
  }

  public setPermissions(permissions: SanitizedPermission[]): void {
    this._permissions = [...permissions];
    this._updatedAt = new Date();
  }

  public sanitize(): SanitizedRole {
    return {
      id: this._id,
      pubId: this._pubId,
      name: this._name,
      description: this._description,
      organizationId: this._organizationId,
      permissions: this._permissions,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  public static reconstitute(props: RoleEntityProps): RoleEntity {
    return new RoleEntity(props);
  }
}
