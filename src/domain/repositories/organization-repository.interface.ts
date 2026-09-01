import { OrganizationEntity } from '../entities/organization.entity.js';

export const ORGANIZATION_REPOSITORY = Symbol('IOrganizationRepository');

export interface CreateOrganizationData {
  name?: string | null;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
}

export interface UpdateOrganizationData {
  name?: string | null;
  slug?: string;
  logoUrl?: string | null;
  description?: string | null;
}

export interface IOrganizationRepository {
  findById(id: number): Promise<OrganizationEntity | null>;
  findBySlug(slug: string): Promise<OrganizationEntity | null>;
  findAllByUserId(userId: number): Promise<OrganizationEntity[]>;
  create(data: CreateOrganizationData): Promise<OrganizationEntity>;
  update(id: number, data: UpdateOrganizationData): Promise<OrganizationEntity>;
  delete(id: number): Promise<boolean>;
}
