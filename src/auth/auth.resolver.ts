import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service.js';
import {
  AuthResponseDto,
  LoginDto,
  LogoutResponseDto,
  MessageResponseDto,
  RefreshTokenDto,
  RegisterDto,
  UserResponseDto,
} from './dto/auth.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import type { SanitizedUser } from '../domain/entities/user.entity.js';
import { UserRole } from '../domain/enums/user-role.enum.js';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => AuthResponseDto, { description: 'Register a new user account' })
  async register(@Args('input') dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Mutation(() => AuthResponseDto, { description: 'Authenticate user with email and password' })
  async login(@Args('input') dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Mutation(() => AuthResponseDto, { description: 'Refresh JWT access token using refresh token' })
  async refreshToken(@Args('input') dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto);
  }

  @Mutation(() => LogoutResponseDto, { description: 'Log out user by invalidating session' })
  async logout(@CurrentUser('id') userId: number): Promise<LogoutResponseDto> {
    const success = await this.authService.logout(userId);
    return { success };
  }

  @Query(() => UserResponseDto, { description: 'Fetch current logged in user profile' })
  async me(@CurrentUser() user: SanitizedUser): Promise<UserResponseDto> {
    return user;
  }

  @Query(() => MessageResponseDto, { description: 'Admin-only operation' })
  @Roles(UserRole.ADMIN)
  async adminOnly(@CurrentUser() user: SanitizedUser): Promise<MessageResponseDto> {
    return {
      message: 'Welcome Admin. You have access to administrative operations.',
      user,
    };
  }

  @Query(() => MessageResponseDto, { description: 'Manager and Admin operation' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async managerOnly(@CurrentUser() user: SanitizedUser): Promise<MessageResponseDto> {
    return {
      message: 'Welcome Manager. You have access to management operations.',
      user,
    };
  }
}
