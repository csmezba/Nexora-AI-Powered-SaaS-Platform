import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

@InputType('RegisterInput', {
  description: 'Input payload for user registration',
})
export class RegisterDto {
  @Field(() => String, { description: 'Email address of the user' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @Field(() => String, { description: 'Password (minimum 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @Field(() => String, { nullable: true, description: 'User first name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @Field(() => String, { nullable: true, description: 'User last name' })
  @IsString()
  @IsOptional()
  lastName?: string;
}

@InputType('LoginInput', { description: 'Input payload for user login' })
export class LoginDto {
  @Field(() => String, { description: 'Registered email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @Field(() => String, { description: 'Account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}

@InputType('RefreshTokenInput', {
  description: 'Input payload for refreshing access token',
})
export class RefreshTokenDto {
  @Field(() => String, { description: 'Valid refresh token string' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

@ObjectType('User', { description: 'Sanitized user profile information' })
export class UserResponseDto {
  // id!: number;

  @Field(() => String, { description: 'Public unique user identifier' })
  pubId!: string;

  @Field(() => String, { description: 'User email address' })
  email!: string;

  @Field(() => String, { nullable: true, description: 'User first name' })
  firstName!: string | null;

  @Field(() => String, { nullable: true, description: 'User last name' })
  lastName!: string | null;

  @Field(() => String, { description: 'Full formatted user name' })
  fullName!: string;

  @Field(() => Date, { description: 'Account creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Account last updated timestamp' })
  updatedAt!: Date;
}

@ObjectType('AuthResponse', {
  description:
    'Authentication response payload containing tokens and user data',
})
export class AuthResponseDto {
  @Field(() => UserResponseDto, { description: 'Authenticated user profile' })
  user!: UserResponseDto;

  @Field(() => String, { description: 'JWT Access Token' })
  accessToken!: string;

  @Field(() => String, { description: 'JWT Refresh Token' })
  refreshToken!: string;

  @Field(() => String, { description: 'Token authorization type' })
  tokenType!: 'Bearer';

  @Field(() => Int, { description: 'Access token expiration in seconds' })
  expiresIn!: number;
}

@ObjectType('LogoutResponse', { description: 'Logout status response' })
export class LogoutResponseDto {
  @Field(() => Boolean, {
    description: 'Indicates whether the logout was successful',
  })
  success!: boolean;
}

@ObjectType('MessageResponse', {
  description: 'Generic message response with user context',
})
export class MessageResponseDto {
  @Field(() => String, { description: 'Response status message' })
  message!: string;

  @Field(() => UserResponseDto, {
    nullable: true,
    description: 'Associated user profile',
  })
  user?: UserResponseDto;
}
