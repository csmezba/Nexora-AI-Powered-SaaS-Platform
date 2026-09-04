import { generatePubId } from '../../common/utils/unique-id.util.js';
import { getOrmModel, logger } from './common.js';

export interface SeedPermissionData {
  resource: string;
  action: string;
  description: string;
}

export const SEED_PERMISSIONS: SeedPermissionData[] = [
  // User permissions
  { resource: 'user', action: 'create', description: 'Create new users' },
  { resource: 'user', action: 'read', description: 'View user profiles and details' },
  { resource: 'user', action: 'update', description: 'Update user information' },
  { resource: 'user', action: 'delete', description: 'Delete or deactivate user accounts' },
  { resource: 'user', action: 'manage', description: 'Full administrative control over users' },

  // Auth & Session permissions
  { resource: 'auth', action: 'manage_sessions', description: 'Manage and revoke user active sessions' },
  { resource: 'auth', action: 'link_oauth', description: 'Connect third-party OAuth providers' },

  // Organization permissions
  { resource: 'organization', action: 'create', description: 'Create organizations' },
  { resource: 'organization', action: 'read', description: 'View organization details' },
  { resource: 'organization', action: 'update', description: 'Update organization settings and profile' },
  { resource: 'organization', action: 'delete', description: 'Delete organization workspace' },
  { resource: 'organization', action: 'invite_member', description: 'Invite new members to the organization' },
  { resource: 'organization', action: 'remove_member', description: 'Remove members from the organization' },
  { resource: 'organization', action: 'change_member_role', description: 'Modify member organizational roles' },
  { resource: 'organization', action: 'manage', description: 'Full administrative control over organization' },

  // Role permissions
  { resource: 'role', action: 'create', description: 'Create custom roles' },
  { resource: 'role', action: 'read', description: 'View roles and their permission assignments' },
  { resource: 'role', action: 'update', description: 'Modify role details and assigned permissions' },
  { resource: 'role', action: 'delete', description: 'Delete custom roles' },
  { resource: 'role', action: 'assign', description: 'Assign roles to organization members' },

  // Permission permissions
  { resource: 'permission', action: 'read', description: 'View all system permissions' },
  { resource: 'permission', action: 'assign', description: 'Grant or revoke permissions on roles' },

  // Project permissions
  { resource: 'project', action: 'create', description: 'Create projects' },
  { resource: 'project', action: 'read', description: 'View project boards and details' },
  { resource: 'project', action: 'update', description: 'Update project settings' },
  { resource: 'project', action: 'delete', description: 'Delete projects' },
  { resource: 'project', action: 'manage', description: 'Full project administration' },

  // Task permissions
  { resource: 'task', action: 'create', description: 'Create new tasks' },
  { resource: 'task', action: 'read', description: 'View tasks and subtasks' },
  { resource: 'task', action: 'update', description: 'Update task details and status' },
  { resource: 'task', action: 'delete', description: 'Delete tasks' },
  { resource: 'task', action: 'assign', description: 'Assign tasks to team members' },
  { resource: 'task', action: 'comment', description: 'Add comments to tasks' },

  // Ticket & Support permissions
  { resource: 'ticket', action: 'create', description: 'Create support tickets' },
  { resource: 'ticket', action: 'read', description: 'View tickets' },
  { resource: 'ticket', action: 'update', description: 'Update ticket resolution and status' },
  { resource: 'ticket', action: 'delete', description: 'Delete tickets' },

  // Billing permissions
  { resource: 'billing', action: 'read', description: 'View invoices and subscriptions' },
  { resource: 'billing', action: 'manage', description: 'Update payment methods and subscription plans' },

  // AI & Assistant permissions
  { resource: 'ai', action: 'use', description: 'Access AI assistants and generation features' },
  { resource: 'ai', action: 'configure', description: 'Configure AI knowledge base and models' },

  // Audit Log permissions
  { resource: 'audit_log', action: 'read', description: 'View system and security audit logs' },
];

export interface SeededPermissionRecord {
  id: number;
  pubId: string;
  resource: string;
  action: string;
  description?: string | null;
}

export async function seedPermissions(): Promise<SeededPermissionRecord[]> {
  logger.info('Seeding permissions...');
  const permissionModel = getOrmModel('Permission');
  if (!permissionModel) {
    throw new Error('Permission model not found in Prisma ORM');
  }

  const now = new Date().toISOString();
  const allExisting: SeededPermissionRecord[] =
    (await permissionModel.all()) || [];

  const existingMap = new Map<string, SeededPermissionRecord>();
  for (const p of allExisting) {
    existingMap.set(
      `${p.resource.toLowerCase().trim()}:${p.action.toLowerCase().trim()}`,
      p,
    );
  }

  const seededPermissions: SeededPermissionRecord[] = [];

  for (const item of SEED_PERMISSIONS) {
    const key = `${item.resource.toLowerCase().trim()}:${item.action.toLowerCase().trim()}`;
    const existing = existingMap.get(key);

    if (existing) {
      seededPermissions.push(existing);
    } else {
      const newPerm = await permissionModel.create({
        pubId: generatePubId('perm'),
        resource: item.resource.toLowerCase().trim(),
        action: item.action.toLowerCase().trim(),
        description: item.description,
        createdAt: now,
        updatedAt: now,
      });

      existingMap.set(key, newPerm);
      seededPermissions.push(newPerm);
      logger.success(`Created permission: ${key}`);
    }
  }

  logger.success(
    `Permissions seeding complete. Total: ${seededPermissions.length} (Existing: ${allExisting.length})`,
  );
  return seededPermissions;
}

// Allow direct execution
if (
  process.argv[1] &&
  (process.argv[1].endsWith('permission.seed.ts') ||
    process.argv[1].endsWith('permission.seed.js'))
) {
  seedPermissions()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Permission seeding failed: ${err.message}`);
      process.exit(1);
    });
}
