import { OrganizationRole } from '../enums/organization-role.enum.js';

export interface OrganizationMemberEntityProps {
  id: number;
  organizationId: number;
  userId: number;
  role: OrganizationRole;
  joinedAt: Date;
}

export interface SanitizedOrganizationMember {
  id: number;
  organizationId: number;
  userId: number;
  role: OrganizationRole;
  joinedAt: Date;
}

export class OrganizationMemberEntity {
  private readonly _id: number;
  private readonly _organizationId: number;
  private readonly _userId: number;
  private _role: OrganizationRole;
  private readonly _joinedAt: Date;

  constructor(props: OrganizationMemberEntityProps) {
    this._id = props.id;
    this._organizationId = props.organizationId;
    this._userId = props.userId;
    this._role = props.role;
    this._joinedAt = props.joinedAt;
  }

  public get id(): number {
    return this._id;
  }

  public get organizationId(): number {
    return this._organizationId;
  }

  public get userId(): number {
    return this._userId;
  }

  public get role(): OrganizationRole {
    return this._role;
  }

  public get joinedAt(): Date {
    return this._joinedAt;
  }

  public updateRole(newRole: OrganizationRole): void {
    this._role = newRole;
  }

  public isOwner(): boolean {
    return this._role === OrganizationRole.OWNER;
  }

  public isAdmin(): boolean {
    return (
      this._role === OrganizationRole.ADMIN ||
      this._role === OrganizationRole.OWNER
    );
  }

  public sanitize(): SanitizedOrganizationMember {
    return {
      id: this._id,
      organizationId: this._organizationId,
      userId: this._userId,
      role: this._role,
      joinedAt: this._joinedAt,
    };
  }

  public static reconstitute(
    props: OrganizationMemberEntityProps,
  ): OrganizationMemberEntity {
    return new OrganizationMemberEntity(props);
  }
}
