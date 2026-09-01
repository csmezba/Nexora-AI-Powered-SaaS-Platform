import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { OrganizationService } from './organization.service.js';
import { OrganizationResolver } from './organization.resolver.js';
import { OrganizationRoleGuard } from './guards/organization-role.guard.js';
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization-repository.interface.js';
import { PrismaOrganizationRepository } from './infrastructure/repositories/prisma-organization.repository.js';
import { ORGANIZATION_MEMBER_REPOSITORY } from './domain/repositories/organization-member-repository.interface.js';
import { PrismaOrganizationMemberRepository } from './infrastructure/repositories/prisma-organization-member.repository.js';

@Module({
  imports: [PrismaModule, AuthModule, UserModule],
  providers: [
    OrganizationService,
    OrganizationResolver,
    OrganizationRoleGuard,
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: PrismaOrganizationRepository,
    },
    {
      provide: ORGANIZATION_MEMBER_REPOSITORY,
      useClass: PrismaOrganizationMemberRepository,
    },
  ],
  exports: [
    OrganizationService,
    ORGANIZATION_REPOSITORY,
    ORGANIZATION_MEMBER_REPOSITORY,
  ],
})
export class OrganizationModule {}
