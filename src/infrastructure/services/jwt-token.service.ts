import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ITokenService,
  TokenPair,
  TokenPayload,
} from '../../domain/services/token-service.interface.js';

@Injectable()
export class JwtTokenService implements ITokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: number; // in seconds
  private readonly refreshExpiresIn: number; // in seconds

  constructor(private readonly jwtService: JwtService) {
    this.accessSecret = process.env['JWT_SECRET'] || 'default-access-secret-key-replace-in-prod';
    this.refreshSecret = process.env['JWT_REFRESH_SECRET'] || 'default-refresh-secret-key-replace-in-prod';
    this.accessExpiresIn = parseInt(process.env['JWT_EXPIRES_IN'] || '3600', 10); // 1 hour
    this.refreshExpiresIn = parseInt(process.env['JWT_REFRESH_EXPIRES_IN'] || '604800', 10); // 7 days
  }

  async generateAccessToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn,
    });
  }

  async generateRefreshToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(
      { sub: payload.sub, email: payload.email },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      },
    );
  }

  async generateTokens(payload: TokenPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessExpiresIn,
    };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.accessSecret,
      });
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.refreshSecret,
      });
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
