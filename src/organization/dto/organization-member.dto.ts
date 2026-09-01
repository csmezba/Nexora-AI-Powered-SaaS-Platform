import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { OrganizationRole } from '../../domain/enums/organization-role.enum.js';
import { UserResponseDto } from '../../auth/dto/auth.dto.js';
import type { SanitizedOrganizationMember } from '../../domain/entities/organization-member.entity.js';

@InputType('AddOrganizationMemberInput', {
  description: 'Input payload for adding a member to an organization',
})
export class AddOrganizationMemberInput {
  @Field(() => Int, { description: 'Organization ID' })
  @IsNumber()
  @IsNotEmpty({ message: 'Organization ID is required' })
  organizationId!: number;

  @Field(() => Int, { nullable: true, description: 'User ID to add' })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @Field(() => String, { nullable: true, description: 'User email to add' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @Field(() => OrganizationRole, {
    nullable: true,
    defaultValue: OrganizationRole.MEMBER,
    description: 'Assigned organization role',
  })
  @IsEnum(OrganizationRole, { message: 'Invalid organization role' })
  @IsOptional()
  role?: OrganizationRole;
}

@InputType('UpdateMemberRoleInput', {
  description: 'Input payload for updating a member role',
})
export class UpdateMemberRoleInput {
  @Field(() => Int, { description: 'Organization ID' })
  @IsNumber()
  @IsNotEmpty({ message: 'Organization ID is required' })
  organizationId!: number;

  @Field(() => Int, { description: 'Target user ID' })
  @IsNumber()
  @IsNotEmpty({ message: 'User ID is required' })
  userId!: number;

  @Field(() => OrganizationRole, {
    description: 'New organization role to assign',
  })
  @IsEnum(OrganizationRole, { message: 'Invalid organization role' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: OrganizationRole;
}

@InputType('RemoveMemberInput', {
  description: 'Input payload for removing a member from an organization',
})
export class RemoveMemberInput {
  @Field(() => Int, { description: 'Organization ID' })
  @IsNumber()
  @IsNotEmpty({ message: 'Organization ID is required' })
  organizationId!: number;

  @Field(() => Int, { description: 'Target user ID to remove' })
  @IsNumber()
  @IsNotEmpty({ message: 'User ID is required' })
  userId!: number;
}

@ObjectType('OrganizationMember', {
  description: 'Organization membership details',
})
export class OrganizationMemberResponseDto implements SanitizedOrganizationMember {
  @Field(() => Int, { description: 'Unique membership identifier' })
  id!: number;

  @Field(() => Int, { description: 'Organization ID' })
  organizationId!: number;

  @Field(() => Int, { description: 'User ID' })
  userId!: number;

  @Field(() => OrganizationRole, {
    description: 'Assigned role in organization',
  })
  role!: OrganizationRole;

  @Field(() => Date, { description: 'Timestamp when member joined' })
  joinedAt!: Date;

  @Field(() => UserResponseDto, {
    nullable: true,
    description: 'User profile of the member',
  })
  user?: UserResponseDto;
}

@ObjectType('MemberActionResponse', {
  description: 'Response payload for member modification operations',
})
export class MemberActionResponseDto {
  @Field(() => Boolean, {
    description: 'Indicates whether the action was successful',
  })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;

  @Field(() => OrganizationMemberResponseDto, {
    nullable: true,
    description: 'Updated member record',
  })
  member?: OrganizationMemberResponseDto;
}
