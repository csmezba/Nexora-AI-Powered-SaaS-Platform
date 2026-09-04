import { generatePubId } from '../../common/utils/unique-id.util.js';
import {
  DEFAULT_SEED_PASSWORD,
  getOrmModel,
  hashPassword,
  logger,
} from './common.js';

export interface SeedUserData {
  email: string;
  firstName: string;
  lastName: string;
  roleHint: string;
}

export const SEED_USERS: SeedUserData[] = [
  {
    email: 'admin@nexora.app',
    firstName: 'Alex',
    lastName: 'Rivers',
    roleHint: 'Super Administrator',
  },
  {
    email: 'owner@nexora.app',
    firstName: 'Sarah',
    lastName: 'Chen',
    roleHint: 'Organization Owner',
  },
  {
    email: 'lead.dev@nexora.app',
    firstName: 'Marcus',
    lastName: 'Vance',
    roleHint: 'Tech Lead / Staff Engineer',
  },
  {
    email: 'dev@nexora.app',
    firstName: 'Elena',
    lastName: 'Rostova',
    roleHint: 'Senior Fullstack Engineer',
  },
  {
    email: 'qa@nexora.app',
    firstName: 'David',
    lastName: 'Kim',
    roleHint: 'Lead QA Engineer',
  },
  {
    email: 'member@nexora.app',
    firstName: 'Jordan',
    lastName: 'Taylor',
    roleHint: 'Product Designer / Member',
  },
  {
    email: 'viewer@nexora.app',
    firstName: 'Morgan',
    lastName: 'Lee',
    roleHint: 'External Stakeholder / Viewer',
  },
];

export interface SeededUserRecord {
  id: number;
  pubId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export async function seedUsers(): Promise<SeededUserRecord[]> {
  logger.info('Seeding users...');
  const userModel = getOrmModel('User');
  if (!userModel) {
    throw new Error('User model not found in Prisma ORM');
  }

  const hashedPassword = await hashPassword(DEFAULT_SEED_PASSWORD);
  const now = new Date().toISOString();
  const seededUsers: SeededUserRecord[] = [];

  for (const item of SEED_USERS) {
    const normalizedEmail = item.email.toLowerCase().trim();

    // Check if user already exists
    let existing: SeededUserRecord | null = null;
    try {
      if (typeof userModel.where === 'function') {
        const query = userModel.where((u: any) =>
          u?.email?.eq
            ? u.email.eq(normalizedEmail)
            : { email: normalizedEmail },
        );
        existing = (await query.first()) || null;
      }
    } catch {
      // Fallback
    }

    if (!existing) {
      const allRecords: SeededUserRecord[] = (await userModel.all()) || [];
      existing =
        allRecords.find(
          (u) => u.email.toLowerCase() === normalizedEmail,
        ) || null;
    }

    if (existing) {
      logger.warn(`User already exists: ${normalizedEmail} (ID: ${existing.id})`);
      seededUsers.push(existing);
    } else {
      const newUser = await userModel.create({
        pubId: generatePubId('usr'),
        email: normalizedEmail,
        password: hashedPassword,
        firstName: item.firstName,
        lastName: item.lastName,
        refreshTokenHash: null,
        createdAt: now,
        updatedAt: now,
      });

      logger.success(`Created user: ${normalizedEmail} (${item.roleHint})`);
      seededUsers.push(newUser);
    }
  }

  logger.success(`Users seeding complete. Total: ${seededUsers.length}`);
  return seededUsers;
}

// Allow direct execution
if (
  process.argv[1] &&
  (process.argv[1].endsWith('user.seed.ts') ||
    process.argv[1].endsWith('user.seed.js'))
) {
  seedUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`User seeding failed: ${err.message}`);
      process.exit(1);
    });
}
