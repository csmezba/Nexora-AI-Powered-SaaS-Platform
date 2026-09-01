import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard.js';
import { UserEntity } from '../../../../src/domain/entities/user.entity.js';

describe('JwtAuthGuard', () => {
  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const mockTokenService = {
    verifyAccessToken: vi.fn(),
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    generateTokens: vi.fn(),
    verifyRefreshToken: vi.fn(),
  };

  const mockUserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const guard = new JwtAuthGuard(
    mockReflector as unknown as Reflector,
    mockTokenService,
    mockUserRepository,
  );

  const createMockContext = (authHeader?: string): { context: ExecutionContext; req: Record<string, unknown> } => {
    const req: Record<string, unknown> = {
      headers: {
        authorization: authHeader,
      },
    };
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
    return { context, req };
  };

  it('should allow access immediately if route is marked as Public', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const { context } = createMockContext();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { context } = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrowError(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should authenticate valid token and attach sanitized user to request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { context, req } = createMockContext('Bearer valid-jwt-token');

    mockTokenService.verifyAccessToken.mockResolvedValue({
      sub: 1,
      email: 'user@nexora.ai',
    });

    const userEntity = UserEntity.reconstitute({
      id: 1,
      email: 'user@nexora.ai',
      passwordHash: 'hash',
      firstName: 'Alice',
      lastName: 'Smith',
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUserRepository.findById.mockResolvedValue(userEntity);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req['user']).toEqual(userEntity.sanitize());
  });

  it('should reject if user no longer exists', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { context } = createMockContext('Bearer valid-jwt-token');

    mockTokenService.verifyAccessToken.mockResolvedValue({ sub: 999 });
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrowError(
      'User no longer exists',
    );
  });

  it('should reject if token verification fails', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { context } = createMockContext('Bearer bad-token');

    mockTokenService.verifyAccessToken.mockRejectedValue(new Error('Invalid signature'));

    await expect(guard.canActivate(context)).rejects.toThrowError(
      'Invalid or expired authentication token',
    );
  });

  it('should authenticate correctly with GraphQL execution context', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);

    const req: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer gql-token',
      },
    };

    const gqlContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      getType: () => 'graphql',
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
      getArgs: () => [{}, {}, { req }, {}],
      getArgByIndex: (index: number) => (index === 2 ? { req } : {}),
    } as unknown as ExecutionContext;

    mockTokenService.verifyAccessToken.mockResolvedValue({
      sub: 1,
      email: 'gql@nexora.ai',
    });

    const userEntity = UserEntity.reconstitute({
      id: 1,
      email: 'gql@nexora.ai',
      passwordHash: 'hash',
      firstName: 'GraphQL',
      lastName: 'User',
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUserRepository.findById.mockResolvedValue(userEntity);

    const result = await guard.canActivate(gqlContext);
    expect(result).toBe(true);
    expect(req['user']).toEqual(userEntity.sanitize());
  });
});
