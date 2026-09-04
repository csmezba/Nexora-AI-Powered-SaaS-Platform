export interface OrganizationMemberRoleEntityProps {
  pubId: string;
  organizationMemberId: number;
  roleId: number;
  assignedAt: Date;
}

export interface SanitizedOrganizationMemberRole {
  pubId: string;
  organizationMemberId: number;
  roleId: number;
  assignedAt: Date;
}

export class OrganizationMemberRoleEntity {
  private readonly _pubId: string;
  private readonly _organizationMemberId: number;
  private readonly _roleId: number;
  private readonly _assignedAt: Date;

  constructor(props: OrganizationMemberRoleEntityProps) {
    this._pubId = props.pubId;
    this._organizationMemberId = props.organizationMemberId;
    this._roleId = props.roleId;
    this._assignedAt = props.assignedAt;
  }

  public get pubId(): string {
    return this._pubId;
  }

  public get organizationMemberId(): number {
    return this._organizationMemberId;
  }

  public get roleId(): number {
    return this._roleId;
  }

  public get assignedAt(): Date {
    return this._assignedAt;
  }

  public sanitize(): SanitizedOrganizationMemberRole {
    return {
      pubId: this._pubId,
      organizationMemberId: this._organizationMemberId,
      roleId: this._roleId,
      assignedAt: this._assignedAt,
    };
  }

  public static reconstitute(
    props: OrganizationMemberRoleEntityProps,
  ): OrganizationMemberRoleEntity {
    return new OrganizationMemberRoleEntity(props);
  }
}
