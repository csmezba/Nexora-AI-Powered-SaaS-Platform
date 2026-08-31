import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../../domain/enums/user-role.enum.js';
import { UserStatus } from '../../domain/enums/user-status.enum.js';

describe('RolesGuard', () => {
  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const createMockContext = (user?: unknown): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  const guard = new RolesGuard(mockReflector as unknown as Reflector);

  it('should allow access if no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny access if user is not authenticated', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrowError(ForbiddenException);
  });

  it('should allow access if user has the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext({
      id: 1,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if user has one of several allowed roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);
    const context = createMockContext({
      id: 2,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user does not possess required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext({
      id: 3,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    expect(() => guard.canActivate(context)).toThrowError(ForbiddenException);
  });
});
