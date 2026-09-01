import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthResolver } from './auth.resolver.js';
import { AuthService } from './auth.service.js';
import { USER_REPOSITORY } from '../domain/repositories/user-repository.interface.js';
import { PrismaUserRepository } from '../infrastructure/repositories/prisma-user.repository.js';
import { PASSWORD_HASHER } from '../domain/services/password-hasher.interface.js';
import { BcryptPasswordHasher } from '../infrastructure/services/bcrypt-password.hasher.js';
import { TOKEN_SERVICE } from '../domain/services/token-service.interface.js';
import { JwtTokenService } from '../infrastructure/services/jwt-token.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: false,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthResolver,
    JwtAuthGuard,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
  ],
  exports: [
    AuthService,
    AuthResolver,
    JwtAuthGuard,
    USER_REPOSITORY,
    PASSWORD_HASHER,
    TOKEN_SERVICE,
  ],
})
export class AuthModule {}
