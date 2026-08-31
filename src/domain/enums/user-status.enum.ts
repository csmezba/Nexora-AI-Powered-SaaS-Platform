import { registerEnumType } from '@nestjs/graphql';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

registerEnumType(UserStatus, {
  name: 'UserStatus',
  description: 'User status states in the application',
});

