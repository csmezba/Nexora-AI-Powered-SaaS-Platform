import { describe, expect, it } from 'vitest';
import { UserEntity } from '../../../../src/domain/entities/user.entity.js';

describe('UserEntity (Domain Entity)', () => {
  const baseProps = {
    id: 1,
    email: 'Test.User@Example.com ',
    passwordHash: '$2a$10$hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    refreshTokenHash: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  it('should instantiate and normalize email', () => {
    const user = new UserEntity(baseProps);

    expect(user.id).toBe(1);
    expect(user.email).toBe('test.user@example.com');
    expect(user.fullName).toBe('John Doe');
  });

  it('should format fullName correctly when names are missing', () => {
    const user = new UserEntity({
      ...baseProps,
      firstName: null,
      lastName: null,
    });

    expect(user.fullName).toBe('test.user@example.com');
  });

  it('should update profile and update timestamp', () => {
    const user = new UserEntity(baseProps);
    const beforeUpdate = user.updatedAt;

    user.updateProfile({ firstName: 'Johnny', lastName: 'Silverhand' });

    expect(user.firstName).toBe('Johnny');
    expect(user.lastName).toBe('Silverhand');
    expect(user.fullName).toBe('Johnny Silverhand');
    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeUpdate.getTime(),
    );
  });

  it('should update password with validation', () => {
    const user = new UserEntity(baseProps);

    user.updatePassword('$2a$10$newhash');
    expect(user.passwordHash).toBe('$2a$10$newhash');

    expect(() => user.updatePassword('')).toThrowError(
      'Password hash cannot be empty',
    );
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
    expect(
      (sanitized as unknown as Record<string, unknown>)['passwordHash'],
    ).toBeUndefined();
    expect(
      (sanitized as unknown as Record<string, unknown>)['refreshTokenHash'],
    ).toBeUndefined();
  });
});
