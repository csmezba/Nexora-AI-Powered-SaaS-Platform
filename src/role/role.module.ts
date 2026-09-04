import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { RoleService } from './role.service.js';
import { RoleResolver } from './role.resolver.js';
import { ROLE_REPOSITORY } from './domain/repositories/role-repository.interface.js';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository.js';
import { PERMISSION_REPOSITORY } from './domain/repositories/permission-repository.interface.js';
import { PrismaPermissionRepository } from './infrastructure/repositories/prisma-permission.repository.js';

@Module({
  imports: [PrismaModule, AuthModule, UserModule, OrganizationModule],
  providers: [
    RoleService,
    RoleResolver,
    {
      provide: ROLE_REPOSITORY,
      useClass: PrismaRoleRepository,
    },
    {
      provide: PERMISSION_REPOSITORY,
      useClass: PrismaPermissionRepository,
    },
  ],
  exports: [RoleService, ROLE_REPOSITORY, PERMISSION_REPOSITORY],
})
export class RoleModule {}
