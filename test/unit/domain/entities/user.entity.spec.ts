import { describe, expect, it } from 'vitest';
import { UserEntity } from '../../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../../src/domain/enums/user-role.enum.js';
import { UserStatus } from '../../../../src/domain/enums/user-status.enum.js';

describe('UserEntity (Domain Entity)', () => {
  const baseProps = {
    id: 1,
    email: 'Test.User@Example.com ',
    passwordHash: '$2a$10$hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    refreshTokenHash: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  it('should instantiate and normalize email', () => {
    const user = new UserEntity(baseProps);

    expect(user.id).toBe(1);
    expect(user.email).toBe('test.user@example.com');
    expect(user.fullName).toBe('John Doe');
    expect(user.role).toBe(UserRole.USER);
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.isActive()).toBe(true);
    expect(user.isSuspended()).toBe(false);
  });

  it('should format fullName correctly when names are missing', () => {
    const user = new UserEntity({
      ...baseProps,
      firstName: null,
      lastName: null,
    });

    expect(user.fullName).toBe('test.user@example.com');
  });

  it('should check single role and multiple roles correctly', () => {
    const user = new UserEntity({
      ...baseProps,
      role: UserRole.MANAGER,
    });

    expect(user.hasRole(UserRole.MANAGER)).toBe(true);
    expect(user.hasRole(UserRole.ADMIN)).toBe(false);
    expect(user.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])).toBe(true);
    expect(user.hasAnyRole([UserRole.ADMIN, UserRole.USER])).toBe(false);
  });

  it('should update profile and update timestamp', () => {
    const user = new UserEntity(baseProps);
    const beforeUpdate = user.updatedAt;

    user.updateProfile({ firstName: 'Johnny', lastName: 'Silverhand' });

    expect(user.firstName).toBe('Johnny');
    expect(user.lastName).toBe('Silverhand');
    expect(user.fullName).toBe('Johnny Silverhand');
    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should update password with validation', () => {
    const user = new UserEntity(baseProps);

    user.updatePassword('$2a$10$newhash');
    expect(user.passwordHash).toBe('$2a$10$newhash');

    expect(() => user.updatePassword('')).toThrowError('Password hash cannot be empty');
  });

  it('should change status and role', () => {
    const user = new UserEntity(baseProps);

    user.changeRole(UserRole.ADMIN);
    expect(user.role).toBe(UserRole.ADMIN);

    user.changeStatus(UserStatus.SUSPENDED);
    expect(user.status).toBe(UserStatus.SUSPENDED);
    expect(user.isActive()).toBe(false);
    expect(user.isSuspended()).toBe(true);
  });

  it('should set and clear refresh token hash', () => {
    const user = new UserEntity(baseProps);

    user.setRefreshTokenHash('$2a$10$refreshhash');
    expect(user.refreshTokenHash).toBe('$2a$10$refreshhash');

    user.setRefreshTokenHash(null);
    expect(user.refreshTokenHash).toBeNull();
  });

  it('should sanitize user entity without exposing sensitive hash fields', () => {
    const user = new UserEntity({
      ...baseProps,
      refreshTokenHash: '$2a$10$refreshhash',
    });

    const sanitized = user.sanitize();

    expect(sanitized.id).toBe(1);
    expect(sanitized.email).toBe('test.user@example.com');
    expect(sanitized.fullName).toBe('John Doe');
    expect(sanitized.role).toBe(UserRole.USER);
    expect(sanitized.status).toBe(UserStatus.ACTIVE);
    expect((sanitized as unknown as Record<string, unknown>)['passwordHash']).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>)['refreshTokenHash']).toBeUndefined();
  });
});
