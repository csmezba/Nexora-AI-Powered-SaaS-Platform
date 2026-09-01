import { describe, expect, it } from 'vitest';
import { BcryptPasswordHasher } from '../../../../../src/auth/infrastructure/services/bcrypt-password.hasher.js';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('should hash a password and verify successfully', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hasher.hash(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isMatch = await hasher.compare(rawPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('should return false for mismatched password', async () => {
    const rawPassword = 'CorrectPassword123';
    const hash = await hasher.hash(rawPassword);

    const isMatch = await hasher.compare('WrongPassword456', hash);
    expect(isMatch).toBe(false);
  });

  it('should throw error when hashing empty string', async () => {
    await expect(hasher.hash('')).rejects.toThrowError(
      'Password to hash cannot be empty',
    );
  });

  it('should return false when comparing empty values', async () => {
    expect(await hasher.compare('', 'somehash')).toBe(false);
    expect(await hasher.compare('pass', '')).toBe(false);
  });
});
