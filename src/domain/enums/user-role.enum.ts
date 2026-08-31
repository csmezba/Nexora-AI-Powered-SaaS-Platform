import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role permissions in the application',
});

