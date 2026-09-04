import { generatePubId } from '../../common/utils/unique-id.util.js';
import { getOrmModel, logger } from './common.js';
import { seedPermissions, type SeededPermissionRecord } from './permission.seed.js';
import { seedOrganizations, type SeededOrganizationResult } from './organization.seed.js';

export interface SeedRoleDefinition {
  name: string;
  description: string;
  permissionMatcher: (resource: string, action: string) => boolean;
  memberAssignments?: {
    userEmail: string;
  }[];
}

export const SEED_ROLES: SeedRoleDefinition[] = [
  {
    name: 'Administrator',
    description:
      'Full administrative access across organization resources, members, and settings.',
    permissionMatcher: () => true, // All permissions
    memberAssignments: [
      { userEmail: 'admin@nexora.app' },
      { userEmail: 'owner@nexora.app' },
    ],
  },
  {
    name: 'Tech Lead',
    description:
      'Technical leader with broad permissions to manage projects, architectures, and tasks.',
    permissionMatcher: (res, _act) =>
      ['project', 'task', 'ticket', 'ai', 'user', 'role', 'organization'].includes(
        res,
      ),
    memberAssignments: [{ userEmail: 'lead.dev@nexora.app' }],
  },
  {
    name: 'Software Engineer',
    description:
      'Core developer with permissions to manage tasks, collaborate on tickets, and use AI tooling.',
    permissionMatcher: (res, act) => {
      if (res === 'task' || res === 'ticket' || res === 'ai') return true;
      if (res === 'project' && act === 'read') return true;
      if (res === 'user' && act === 'read') return true;
      if (res === 'organization' && act === 'read') return true;
      return false;
    },
    memberAssignments: [{ userEmail: 'dev@nexora.app' }],
  },
  {
    name: 'QA Engineer',
    description:
      'Quality assurance specialist with permissions to manage tickets, test tasks, and inspect logs.',
    permissionMatcher: (res, act) => {
      if (res === 'ticket') return true;
      if (res === 'task' && ['read', 'update', 'comment'].includes(act)) return true;
      if (res === 'project' && act === 'read') return true;
      if (res === 'ai' && act === 'use') return true;
      return false;
    },
    memberAssignments: [{ userEmail: 'qa@nexora.app' }],
  },
  {
    name: 'Viewer',
    description:
      'Read-only access for external clients and stakeholders to inspect dashboards and project progress.',
    permissionMatcher: (_res, act) => act === 'read',
    memberAssignments: [{ userEmail: 'viewer@nexora.app' }],
  },
];

export interface SeededRoleResult {
  roles: any[];
  rolePermissionsCount: number;
  memberRolesCount: number;
}

export async function seedRoles(): Promise<SeededRoleResult> {
  logger.info('Seeding roles, role-permissions, and member-roles...');
  const roleModel = getOrmModel('Role');
  const rolePermModel = getOrmModel('RolePermission');
  const memberRoleModel = getOrmModel('OrganizationMemberRole');
  const permModel = getOrmModel('Permission');
  const orgModel = getOrmModel('Organization');
  const memberModel = getOrmModel('OrganizationMember');
  const userModel = getOrmModel('User');

  if (
    !roleModel ||
    !rolePermModel ||
    !memberRoleModel ||
    !permModel ||
    !orgModel ||
    !memberModel ||
    !userModel
  ) {
    throw new Error('Required models not found in Prisma ORM');
  }

  // Ensure permissions exist
  let permissions: SeededPermissionRecord[] = (await permModel.all()) || [];
  if (permissions.length === 0) {
    permissions = await seedPermissions();
  }

  // Ensure organizations exist
  let orgs: any[] = (await orgModel.all()) || [];
  if (orgs.length === 0) {
    const orgSeedResult: SeededOrganizationResult = await seedOrganizations();
    orgs = orgSeedResult.organizations;
  }

  const users: any[] = (await userModel.all()) || [];
  const userMap = new Map<string, any>();
  for (const u of users) {
    userMap.set(u.email.toLowerCase().trim(), u);
  }

  const members: any[] = (await memberModel.all()) || [];
  const memberMap = new Map<string, any>();
  for (const m of members) {
    memberMap.set(`${m.organizationId}:${m.userId}`, m);
  }

  const existingRoles: any[] = (await roleModel.all()) || [];
  const roleMap = new Map<string, any>();
  for (const r of existingRoles) {
    roleMap.set(`${r.organizationId}:${r.name.toLowerCase().trim()}`, r);
  }

  const existingRolePerms: any[] = (await rolePermModel.all()) || [];
  const rolePermMap = new Set<string>();
  for (const rp of existingRolePerms) {
    rolePermMap.add(`${rp.roleId}:${rp.permissionId}`);
  }

  const existingMemberRoles: any[] = (await memberRoleModel.all()) || [];
  const memberRoleMap = new Set<string>();
  for (const mr of existingMemberRoles) {
    memberRoleMap.add(`${mr.organizationMemberId}:${mr.roleId}`);
  }

  const now = new Date().toISOString();
  const seededRoles: any[] = [];
  let rolePermissionsCreated = 0;
  let memberRolesCreated = 0;

  for (const org of orgs) {
    for (const roleDef of SEED_ROLES) {
      const roleKey = `${org.id}:${roleDef.name.toLowerCase().trim()}`;
      let role = roleMap.get(roleKey);

      if (role) {
        seededRoles.push(role);
      } else {
        role = await roleModel.create({
          pubId: generatePubId('role'),
          name: roleDef.name,
          description: roleDef.description,
          organizationId: org.id,
          createdAt: now,
          updatedAt: now,
        });
        roleMap.set(roleKey, role);
        seededRoles.push(role);
        logger.success(`Created role "${roleDef.name}" for org "${org.name || org.slug}"`);
      }

      // Assign matching permissions to role
      for (const perm of permissions) {
        if (roleDef.permissionMatcher(perm.resource, perm.action)) {
          const rpKey = `${role.id}:${perm.id}`;
          if (!rolePermMap.has(rpKey)) {
            await rolePermModel.create({
              pubId: generatePubId('rp'),
              roleId: role.id,
              permissionId: perm.id,
              assignedAt: now,
            });
            rolePermMap.add(rpKey);
            rolePermissionsCreated++;
          }
        }
      }

      // Assign role to member if specified
      if (roleDef.memberAssignments) {
        for (const assignment of roleDef.memberAssignments) {
          const user = userMap.get(assignment.userEmail.toLowerCase().trim());
          if (!user) continue;

          const memberKey = `${org.id}:${user.id}`;
          const member = memberMap.get(memberKey);
          if (!member) continue;

          const mrKey = `${member.id}:${role.id}`;
          if (!memberRoleMap.has(mrKey)) {
            await memberRoleModel.create({
              pubId: generatePubId('mr'),
              organizationMemberId: member.id,
              roleId: role.id,
              assignedAt: now,
            });
            memberRoleMap.add(mrKey);
            memberRolesCreated++;
            logger.success(
              `Assigned role "${roleDef.name}" to member ${assignment.userEmail} in org "${org.name || org.slug}"`,
            );
          }
        }
      }
    }
  }

  logger.success(
    `Roles seeding complete. Roles: ${seededRoles.length}, New Role-Permissions: ${rolePermissionsCreated}, New Member-Roles: ${memberRolesCreated}`,
  );

  return {
    roles: seededRoles,
    rolePermissionsCount: rolePermMap.size,
    memberRolesCount: memberRoleMap.size,
  };
}

// Allow direct execution
if (
  process.argv[1] &&
  (process.argv[1].endsWith('role.seed.ts') ||
    process.argv[1].endsWith('role.seed.js'))
) {
  seedRoles()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Role seeding failed: ${err.message}`);
      process.exit(1);
    });
}
