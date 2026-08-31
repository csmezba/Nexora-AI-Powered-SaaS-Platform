import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SanitizedUser } from '../../domain/entities/user.entity.js';

export const CurrentUser = createParamDecorator(
  (data: keyof SanitizedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as SanitizedUser | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
