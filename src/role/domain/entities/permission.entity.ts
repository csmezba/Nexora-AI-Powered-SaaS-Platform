export interface PermissionEntityProps {
  id: number;
  pubId: string;
  resource: string;
  action: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedPermission {
  id: number;
  pubId: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PermissionEntity {
  private readonly _id: number;
  private readonly _pubId: string;
  private _resource: string;
  private _action: string;
  private _description: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PermissionEntityProps) {
    this._id = props.id;
    this._pubId = props.pubId;
    this._resource = props.resource.toLowerCase().trim();
    this._action = props.action.toLowerCase().trim();
    this._description = props.description ?? null;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): number {
    return this._id;
  }

  public get pubId(): string {
    return this._pubId;
  }

  public get resource(): string {
    return this._resource;
  }

  public get action(): string {
    return this._action;
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
    resource?: string;
    action?: string;
    description?: string | null;
  }): void {
    if (params.resource !== undefined) {
      this._resource = params.resource.toLowerCase().trim();
    }
    if (params.action !== undefined) {
      this._action = params.action.toLowerCase().trim();
    }
    if (params.description !== undefined) {
      this._description = params.description;
    }
    this._updatedAt = new Date();
  }

  public sanitize(): SanitizedPermission {
    return {
      id: this._id,
      pubId: this._pubId,
      resource: this._resource,
      action: this._action,
      description: this._description,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  public static reconstitute(props: PermissionEntityProps): PermissionEntity {
    return new PermissionEntity(props);
  }
}
