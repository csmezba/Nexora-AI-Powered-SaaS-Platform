import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { USER_REPOSITORY } from './domain/repositories/user-repository.interface.js';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    PrismaUserRepository,
  ],
  exports: [USER_REPOSITORY, PrismaUserRepository],
})
export class UserModule {}
