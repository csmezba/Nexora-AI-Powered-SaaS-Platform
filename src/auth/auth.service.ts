import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../user/domain/repositories/user-repository.interface.js';
import {
  PASSWORD_HASHER,
  type IPasswordHasher,
} from './domain/services/password-hasher.interface.js';
import {
  TOKEN_SERVICE,
  type ITokenService,
  type TokenPayload,
} from './domain/services/token-service.interface.js';
import {
  type AuthResponseDto,
  type LoginDto,
  type RefreshTokenDto,
  type RegisterDto,
} from './dto/auth.dto.js';
import type { SanitizedUser } from '../user/domain/entities/user.entity.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const existing = await this.userRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException(
          `User with email "${dto.email}" already exists`,
        );
      }

      const passwordHash = await this.passwordHasher.hash(dto.password);
      const user = await this.userRepository.create({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });

      const tokenPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
      };

      const tokens = await this.tokenService.generateTokens(tokenPayload);
      const refreshTokenHash = await this.passwordHasher.hash(
        tokens.refreshToken,
      );
      await this.userRepository.update(user.id, { refreshTokenHash });

      return {
        user: user.sanitize(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in register: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred during registration',
      );
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    try {
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

      const tokenPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
      };

      const tokens = await this.tokenService.generateTokens(tokenPayload);
      const refreshTokenHash = await this.passwordHasher.hash(
        tokens.refreshToken,
      );
      await this.userRepository.update(user.id, { refreshTokenHash });

      return {
        user: user.sanitize(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in login: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred during login',
      );
    }
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(
        dto.refreshToken,
      );
      const user = await this.userRepository.findById(payload.sub);

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token session');
      }

      const isRefreshMatch = await this.passwordHasher.compare(
        dto.refreshToken,
        user.refreshTokenHash,
      );

      if (!isRefreshMatch) {
        throw new UnauthorizedException(
          'Refresh token has been revoked or invalidated',
        );
      }

      const tokenPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
      };

      const tokens = await this.tokenService.generateTokens(tokenPayload);
      const newRefreshTokenHash = await this.passwordHasher.hash(
        tokens.refreshToken,
      );
      await this.userRepository.update(user.id, {
        refreshTokenHash: newRefreshTokenHash,
      });

      return {
        user: user.sanitize(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in refreshToken: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred during token refresh',
      );
    }
  }

  async logout(userId: number): Promise<boolean> {
    try {
      await this.userRepository.update(userId, { refreshTokenHash: null });
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in logout: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred during logout',
      );
    }
  }

  async getProfile(userId: number): Promise<SanitizedUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      return user.sanitize();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in getProfile: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An error occurred while fetching user profile',
      );
    }
  }
}
