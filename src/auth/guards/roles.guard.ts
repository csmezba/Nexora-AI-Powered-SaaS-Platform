import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { UserRole } from '../../domain/enums/user-role.enum.js';
import { SanitizedUser } from '../../domain/entities/user.entity.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = this.getRequest(context);
    const user = request?.user as SanitizedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Access denied: User is not authenticated');
    }

    const hasPermission = requiredRoles.includes(user.role);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: Required roles [${requiredRoles.join(', ')}], but user has role [${user.role}]`,
      );
    }

    return true;
  }

  private getRequest(context: ExecutionContext): { user?: unknown } {
    if (context.getType && (context.getType() as string) === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      return gqlCtx.getContext()?.req;
    }
    return context.switchToHttp().getRequest();
  }

}

