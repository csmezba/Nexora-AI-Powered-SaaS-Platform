import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserModule } from '../user/user.module.js';
import { AuthResolver } from './auth.resolver.js';
import { AuthService } from './auth.service.js';
import { PASSWORD_HASHER } from './domain/services/password-hasher.interface.js';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password.hasher.js';
import { TOKEN_SERVICE } from './domain/services/token-service.interface.js';
import { JwtTokenService } from './infrastructure/services/jwt-token.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    JwtModule.register({
      global: false,
    }),
  ],
  controllers: [],
  providers: [
    AuthService,
    AuthResolver,
    JwtAuthGuard,
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
    PASSWORD_HASHER,
    TOKEN_SERVICE,
  ],
})
export class AuthModule {}
