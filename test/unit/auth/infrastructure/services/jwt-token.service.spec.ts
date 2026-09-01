import { describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from '../../../../../src/auth/infrastructure/services/jwt-token.service.js';
import { TokenPayload } from '../../../../../src/auth/domain/services/token-service.interface.js';

describe('JwtTokenService', () => {
  const jwtService = new JwtService({});
  const tokenService = new JwtTokenService(jwtService);

  const payload: TokenPayload = {
    sub: 42,
    email: 'test@nexora.ai',
  };

  it('should generate access and refresh token pair', async () => {
    const tokens = await tokenService.generateTokens(payload);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.expiresIn).toBeGreaterThan(0);
  });

  it('should verify and decode valid access token', async () => {
    const accessToken = await tokenService.generateAccessToken(payload);
    const decoded = await tokenService.verifyAccessToken(accessToken);

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
  });

  it('should verify and decode valid refresh token', async () => {
    const refreshToken = await tokenService.generateRefreshToken(payload);
    const decoded = await tokenService.verifyRefreshToken(refreshToken);

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
  });

  it('should reject invalid or tampered tokens', async () => {
    await expect(
      tokenService.verifyAccessToken('invalid.jwt.token'),
    ).rejects.toThrowError('Invalid or expired access token');

    await expect(
      tokenService.verifyRefreshToken('invalid.jwt.token'),
    ).rejects.toThrowError('Invalid or expired refresh token');
  });
});
