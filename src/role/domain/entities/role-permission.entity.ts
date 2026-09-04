export interface RolePermissionEntityProps {
  pubId: string;
  roleId: number;
  permissionId: number;
  assignedAt: Date;
}

export interface SanitizedRolePermission {
  pubId: string;
  roleId: number;
  permissionId: number;
  assignedAt: Date;
}

export class RolePermissionEntity {
  private readonly _pubId: string;
  private readonly _roleId: number;
  private readonly _permissionId: number;
  private readonly _assignedAt: Date;

  constructor(props: RolePermissionEntityProps) {
    this._pubId = props.pubId;
    this._roleId = props.roleId;
    this._permissionId = props.permissionId;
    this._assignedAt = props.assignedAt;
  }

  public get pubId(): string {
    return this._pubId;
  }

  public get roleId(): number {
    return this._roleId;
  }

  public get permissionId(): number {
    return this._permissionId;
  }

  public get assignedAt(): Date {
    return this._assignedAt;
  }

  public sanitize(): SanitizedRolePermission {
    return {
      pubId: this._pubId,
      roleId: this._roleId,
      permissionId: this._permissionId,
      assignedAt: this._assignedAt,
    };
  }

  public static reconstitute(
    props: RolePermissionEntityProps,
  ): RolePermissionEntity {
    return new RolePermissionEntity(props);
  }
}
