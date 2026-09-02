import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      formatError: (formattedError, error: any) => {
        const originalError = error?.extensions?.originalError || error;
        let statusCode =
          error?.extensions?.statusCode ??
          error?.extensions?.statuscode ??
          originalError?.statusCode ??
          originalError?.status ??
          500;
        let errorMsg = formattedError.message;

        if (Array.isArray(originalError?.message)) {
          errorMsg = originalError.message.join(', ');
        } else if (typeof originalError?.message === 'string') {
          errorMsg = originalError.message;
        } else if (typeof originalError?.error === 'string') {
          errorMsg = originalError.error;
        }

        return {
          message: errorMsg,
          success: false,
          statusCode,
          error: errorMsg,
        } as any;
      },
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    OrganizationModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
