import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../domain/repositories/user-repository.interface.js';
import {
  PASSWORD_HASHER,
  type IPasswordHasher,
} from '../domain/services/password-hasher.interface.js';
import {
  TOKEN_SERVICE,
  type ITokenService,
  type TokenPayload,
} from '../domain/services/token-service.interface.js';
import {
  type AuthResponseDto,
  type LoginDto,
  type RefreshTokenDto,
  type RegisterDto,
} from './dto/auth.dto.js';
import type { SanitizedUser } from '../domain/entities/user.entity.js';
import { UserRole } from '../domain/enums/user-role.enum.js';
import { UserStatus } from '../domain/enums/user-status.enum.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role ?? UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const tokens = await this.tokenService.generateTokens(tokenPayload);
    const refreshTokenHash = await this.passwordHasher.hash(tokens.refreshToken);
    await this.userRepository.update(user.id, { refreshTokenHash });

    return {
      user: user.sanitize(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.passwordHasher.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('User account is inactive or suspended');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const tokens = await this.tokenService.generateTokens(tokenPayload);
    const refreshTokenHash = await this.passwordHasher.hash(tokens.refreshToken);
    await this.userRepository.update(user.id, { refreshTokenHash });

    return {
      user: user.sanitize(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token session');
    }

    const isRefreshMatch = await this.passwordHasher.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshMatch) {
      throw new UnauthorizedException('Refresh token has been revoked or invalidated');
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('User account is inactive or suspended');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const tokens = await this.tokenService.generateTokens(tokenPayload);
    const newRefreshTokenHash = await this.passwordHasher.hash(tokens.refreshToken);
    await this.userRepository.update(user.id, { refreshTokenHash: newRefreshTokenHash });

    return {
      user: user.sanitize(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
    };
  }

  async logout(userId: number): Promise<boolean> {
    await this.userRepository.update(userId, { refreshTokenHash: null });
    return true;
  }

  async getProfile(userId: number): Promise<SanitizedUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user.sanitize();
  }
}
