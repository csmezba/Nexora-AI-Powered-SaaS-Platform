import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  TOKEN_SERVICE,
  type ITokenService,
} from '../../domain/services/token-service.interface.js';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../domain/repositories/user-repository.interface.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = this.getRequest(context);
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      const user = await this.userRepository.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Attach sanitized user to request
      (request as unknown as { user: unknown }).user = user.sanitize();
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private getRequest(context: ExecutionContext): Request {
    if (context.getType && (context.getType() as string) === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      return gqlCtx.getContext()?.req;
    }
    return context.switchToHttp().getRequest<Request>();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request?.headers?.authorization;
    if (!authHeader) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }
}
