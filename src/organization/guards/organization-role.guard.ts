import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ORG_ROLES_KEY } from '../decorators/require-org-role.decorator.js';
import { OrganizationRole } from '../../domain/enums/organization-role.enum.js';
import {
  ORGANIZATION_MEMBER_REPOSITORY,
  type IOrganizationMemberRepository,
} from '../../domain/repositories/organization-member-repository.interface.js';

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext<{ req: { user?: { id: number } } }>();
    const args = gqlContext.getArgs<{
      organizationId?: number;
      id?: number;
      input?: { organizationId?: number };
    }>();

    const userId = req?.user?.id;
    if (!userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    const orgId = args.organizationId ?? args.id ?? args.input?.organizationId;
    if (!orgId) {
      return true;
    }

    const member = await this.memberRepository.findByOrgAndUser(orgId, userId);
    if (!member) {
      throw new NotFoundException('You are not a member of this organization');
    }

    const hasRole = requiredRoles.includes(member.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}. Your role: ${member.role}`,
      );
    }

    return true;
  }
}
