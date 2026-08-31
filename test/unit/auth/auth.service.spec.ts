import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service.js';
import { UserEntity } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/enums/user-role.enum.js';
import { UserStatus } from '../../../src/domain/enums/user-status.enum.js';
import { IUserRepository } from '../../../src/domain/repositories/user-repository.interface.js';
import { IPasswordHasher } from '../../../src/domain/services/password-hasher.interface.js';
import { ITokenService } from '../../../src/domain/services/token-service.interface.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: IUserRepository;
  let mockPasswordHasher: IPasswordHasher;
  let mockTokenService: ITokenService;

  const mockUserEntity = UserEntity.reconstitute({
    id: 1,
    email: 'user@example.com',
    passwordHash: '$2a$10$hashedpw',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    refreshTokenHash: '$2a$10$hashedrefresh',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockPasswordHasher = {
      hash: vi.fn(),
      compare: vi.fn(),
    };

    mockTokenService = {
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      generateTokens: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    };

    authService = new AuthService(
      mockUserRepository,
      mockPasswordHasher,
      mockTokenService,
    );
  });

  describe('register', () => {
    it('should register a new user successfully and return tokens', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockImplementation(async (val) => `hashed_${val}`);
      vi.mocked(mockUserRepository.create).mockResolvedValue(mockUserEntity);
      vi.mocked(mockTokenService.generateTokens).mockResolvedValue({
        accessToken: 'access.jwt.token',
        refreshToken: 'refresh.jwt.token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
      vi.mocked(mockUserRepository.update).mockResolvedValue(mockUserEntity);

      const result = await authService.register({
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.accessToken).toBe('access.jwt.token');
      expect(result.refreshToken).toBe('refresh.jwt.token');
      expect(result.user.email).toBe('user@example.com');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'user@example.com',
        passwordHash: 'hashed_Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
    });

    it('should throw ConflictException if email is already taken', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUserEntity);

      await expect(
        authService.register({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrowError(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUserEntity);
      vi.mocked(mockPasswordHasher.compare).mockResolvedValue(true);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('hashed_refresh');
      vi.mocked(mockTokenService.generateTokens).mockResolvedValue({
        accessToken: 'access.jwt.token',
        refreshToken: 'refresh.jwt.token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
      vi.mocked(mockUserRepository.update).mockResolvedValue(mockUserEntity);

      const result = await authService.login({
        email: 'user@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('access.jwt.token');
      expect(result.refreshToken).toBe('refresh.jwt.token');
      expect(result.user.id).toBe(1);
    });

    it('should throw UnauthorizedException if email does not exist', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrowError(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUserEntity);
      vi.mocked(mockPasswordHasher.compare).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrowError(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = UserEntity.reconstitute({
        id: 1,
        email: 'user@example.com',
        passwordHash: '$2a$10$hashedpw',
        role: UserRole.USER,
        status: UserStatus.INACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(inactiveUser);
      vi.mocked(mockPasswordHasher.compare).mockResolvedValue(true);

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrowError('User account is inactive or suspended');
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens when valid refresh token is supplied', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockResolvedValue({
        sub: 1,
        email: 'user@example.com',
        role: UserRole.USER,
      });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUserEntity);
      vi.mocked(mockPasswordHasher.compare).mockResolvedValue(true);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('new_hash');
      vi.mocked(mockTokenService.generateTokens).mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });

      const result = await authService.refreshToken({
        refreshToken: 'valid.refresh.token',
      });

      expect(result.accessToken).toBe('new.access.token');
      expect(result.refreshToken).toBe('new.refresh.token');
    });

    it('should reject when refresh token hash does not match stored session', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockResolvedValue({
        sub: 1,
        email: 'user@example.com',
        role: UserRole.USER,
      });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUserEntity);
      vi.mocked(mockPasswordHasher.compare).mockResolvedValue(false);

      await expect(
        authService.refreshToken({
          refreshToken: 'revoked.refresh.token',
        }),
      ).rejects.toThrowError('Refresh token has been revoked or invalidated');
    });
  });

  describe('logout', () => {
    it('should clear refresh token hash on logout', async () => {
      vi.mocked(mockUserRepository.update).mockResolvedValue(mockUserEntity);

      const result = await authService.logout(1);
      expect(result).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, { refreshTokenHash: null });
    });
  });

  describe('getProfile', () => {
    it('should return sanitized user profile', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUserEntity);

      const profile = await authService.getProfile(1);
      expect(profile.id).toBe(1);
      expect(profile.email).toBe('user@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(authService.getProfile(99)).rejects.toThrowError(NotFoundException);
    });
  });
});
