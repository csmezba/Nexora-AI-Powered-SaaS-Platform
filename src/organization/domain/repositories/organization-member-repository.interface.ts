import { OrganizationMemberEntity } from '../entities/organization-member.entity.js';
import { UserEntity } from '../../../user/domain/entities/user.entity.js';
import { OrganizationRole } from '../enums/organization-role.enum.js';

export const ORGANIZATION_MEMBER_REPOSITORY = Symbol(
  'IOrganizationMemberRepository',
);

export interface CreateOrganizationMemberData {
  pubId?: string;
  organizationId: number;
  userId: number;
  role?: OrganizationRole;
}

export interface MemberWithUser {
  member: OrganizationMemberEntity;
  user: UserEntity;
}

export interface IOrganizationMemberRepository {
  findById(id: number): Promise<OrganizationMemberEntity | null>;
  findByPubId(pubId: string): Promise<OrganizationMemberEntity | null>;
  findByOrgAndUser(
    organizationId: number,
    userId: number,
  ): Promise<OrganizationMemberEntity | null>;
  findMembersWithUsers(organizationId: number): Promise<MemberWithUser[]>;
  findUserMemberships(userId: number): Promise<OrganizationMemberEntity[]>;
  create(data: CreateOrganizationMemberData): Promise<OrganizationMemberEntity>;
  updateRole(
    id: number,
    role: OrganizationRole,
  ): Promise<OrganizationMemberEntity>;
  delete(id: number): Promise<boolean>;
  deleteByOrgAndUser(organizationId: number, userId: number): Promise<boolean>;
  countByOrg(organizationId: number): Promise<number>;
  countOwnersByOrg(organizationId: number): Promise<number>;
}
