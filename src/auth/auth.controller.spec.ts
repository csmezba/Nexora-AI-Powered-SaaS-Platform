import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserRole } from '../domain/enums/user-role.enum.js';
import { UserStatus } from '../domain/enums/user-status.enum.js';
import { SanitizedUser } from '../domain/entities/user.entity.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: AuthService;

  const mockSanitizedUser: SanitizedUser = {
    id: 1,
    email: 'admin@nexora.ai',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    fullName: 'Admin User',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockAuthResponse = {
    user: mockSanitizedUser,
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    tokenType: 'Bearer' as const,
    expiresIn: 3600,
  };

  beforeEach(() => {
    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      getProfile: vi.fn(),
    } as unknown as AuthService;

    controller = new AuthController(mockAuthService);
  });

  it('should delegate register call to authService', async () => {
    vi.mocked(mockAuthService.register).mockResolvedValue(mockAuthResponse);

    const dto = { email: 'admin@nexora.ai', password: 'Password123!' };
    const result = await controller.register(dto);

    expect(result).toEqual(mockAuthResponse);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('should delegate login call to authService', async () => {
    vi.mocked(mockAuthService.login).mockResolvedValue(mockAuthResponse);

    const dto = { email: 'admin@nexora.ai', password: 'Password123!' };
    const result = await controller.login(dto);

    expect(result).toEqual(mockAuthResponse);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
  });

  it('should delegate refresh token call to authService', async () => {
    vi.mocked(mockAuthService.refreshToken).mockResolvedValue(mockAuthResponse);

    const dto = { refreshToken: 'mock.refresh.token' };
    const result = await controller.refresh(dto);

    expect(result).toEqual(mockAuthResponse);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith(dto);
  });

  it('should delegate logout call to authService', async () => {
    vi.mocked(mockAuthService.logout).mockResolvedValue(true);

    const result = await controller.logout(1);
    expect(result).toEqual({ success: true });
    expect(mockAuthService.logout).toHaveBeenCalledWith(1);
  });

  it('should return profile on getProfile', async () => {
    const profile = await controller.getProfile(mockSanitizedUser);
    expect(profile).toEqual(mockSanitizedUser);
  });

  it('should return admin greeting on adminOnly', async () => {
    const result = await controller.adminOnly(mockSanitizedUser);
    expect(result.message).toContain('Welcome Admin');
    expect(result.user).toEqual(mockSanitizedUser);
  });

  it('should return manager greeting on managerOnly', async () => {
    const result = await controller.managerOnly(mockSanitizedUser);
    expect(result.message).toContain('Welcome Manager');
    expect(result.user).toEqual(mockSanitizedUser);
  });
});
