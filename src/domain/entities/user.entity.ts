import { UserRole } from '../enums/user-role.enum.js';
import { UserStatus } from '../enums/user-status.enum.js';

export interface UserEntityProps {
  id: number;
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  status: UserStatus;
  refreshTokenHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SanitizedUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: UserStatus;
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
  private _role: UserRole;
  private _status: UserStatus;
  private _refreshTokenHash: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserEntityProps) {
    this._id = props.id;
    this._email = props.email.toLowerCase().trim();
    this._passwordHash = props.passwordHash;
    this._firstName = props.firstName ?? null;
    this._lastName = props.lastName ?? null;
    this._role = props.role;
    this._status = props.status;
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

  public get role(): UserRole {
    return this._role;
  }

  public get status(): UserStatus {
    return this._status;
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

  public hasRole(role: UserRole): boolean {
    return this._role === role;
  }

  public hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this._role);
  }

  public isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  public isSuspended(): boolean {
    return this._status === UserStatus.SUSPENDED;
  }

  public updatePassword(newPasswordHash: string): void {
    if (!newPasswordHash) {
      throw new Error('Password hash cannot be empty');
    }
    this._passwordHash = newPasswordHash;
    this._updatedAt = new Date();
  }

  public updateProfile(params: { firstName?: string | null; lastName?: string | null }): void {
    if (params.firstName !== undefined) {
      this._firstName = params.firstName;
    }
    if (params.lastName !== undefined) {
      this._lastName = params.lastName;
    }
    this._updatedAt = new Date();
  }

  public changeRole(newRole: UserRole): void {
    this._role = newRole;
    this._updatedAt = new Date();
  }

  public changeStatus(newStatus: UserStatus): void {
    this._status = newStatus;
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
      role: this._role,
      status: this._status,
      fullName: this.fullName,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  public static reconstitute(props: UserEntityProps): UserEntity {
    return new UserEntity(props);
  }
}
