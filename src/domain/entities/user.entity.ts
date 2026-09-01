export interface UserEntityProps {
  id: number;
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  refreshTokenHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  private readonly _id: number;
  private readonly _email: string;
  private _passwordHash: string;
  private _firstName: string | null;
  private _lastName: string | null;
  private _refreshTokenHash: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserEntityProps) {
    this._id = props.id;
    this._email = props.email.toLowerCase().trim();
    this._passwordHash = props.passwordHash;
    this._firstName = props.firstName ?? null;
    this._lastName = props.lastName ?? null;
    this._refreshTokenHash = props.refreshTokenHash ?? null;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): number {
    return this._id;
  }

  public get email(): string {
    return this._email;
  }

  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get firstName(): string | null {
    return this._firstName;
  }

  public get lastName(): string | null {
    return this._lastName;
  }

  public get refreshTokenHash(): string | null {
    return this._refreshTokenHash;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get fullName(): string {
    const parts = [this._firstName, this._lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : this._email;
  }

  public updatePassword(newPasswordHash: string): void {
    if (!newPasswordHash) {
      throw new Error('Password hash cannot be empty');
    }
    this._passwordHash = newPasswordHash;
    this._updatedAt = new Date();
  }

  public updateProfile(params: {
    firstName?: string | null;
    lastName?: string | null;
  }): void {
    if (params.firstName !== undefined) {
      this._firstName = params.firstName;
    }
    if (params.lastName !== undefined) {
      this._lastName = params.lastName;
    }
    this._updatedAt = new Date();
  }

  public setRefreshTokenHash(hash: string | null): void {
    this._refreshTokenHash = hash;
    this._updatedAt = new Date();
  }

  public sanitize(): SanitizedUser {
    return {
      id: this._id,
      email: this._email,
      firstName: this._firstName,
      lastName: this._lastName,
      fullName: this.fullName,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  public static reconstitute(props: UserEntityProps): UserEntity {
    return new UserEntity(props);
  }
}
