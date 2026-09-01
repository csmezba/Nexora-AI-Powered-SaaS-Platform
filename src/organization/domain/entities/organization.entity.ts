export interface OrganizationEntityProps {
  id: number;
  name?: string | null;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedOrganization {
  id: number;
  name: string | null;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationEntity {
  private readonly _id: number;
  private _name: string | null;
  private _slug: string;
  private _logoUrl: string | null;
  private _description: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: OrganizationEntityProps) {
    this._id = props.id;
    this._name = props.name ?? null;
    this._slug = props.slug.toLowerCase().trim();
    this._logoUrl = props.logoUrl ?? null;
    this._description = props.description ?? null;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): number {
    return this._id;
  }

  public get name(): string | null {
    return this._name;
  }

  public get slug(): string {
    return this._slug;
  }

  public get logoUrl(): string | null {
    return this._logoUrl;
  }

  public get description(): string | null {
    return this._description;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public updateDetails(params: {
    name?: string | null;
    slug?: string;
    logoUrl?: string | null;
    description?: string | null;
  }): void {
    if (params.name !== undefined) {
      this._name = params.name;
    }
    if (params.slug !== undefined) {
      if (!params.slug.trim()) {
        throw new Error('Organization slug cannot be empty');
      }
      this._slug = params.slug.toLowerCase().trim();
    }
    if (params.logoUrl !== undefined) {
      this._logoUrl = params.logoUrl;
    }
    if (params.description !== undefined) {
      this._description = params.description;
    }
    this._updatedAt = new Date();
  }

  public sanitize(): SanitizedOrganization {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug,
      logoUrl: this._logoUrl,
      description: this._description,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  public static reconstitute(
    props: OrganizationEntityProps,
  ): OrganizationEntity {
    return new OrganizationEntity(props);
  }
}
