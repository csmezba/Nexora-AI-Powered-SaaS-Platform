import { generatePubId } from '../../common/utils/unique-id.util.js';
import { getOrmModel, logger } from './common.js';
import { seedUsers, type SeededUserRecord } from './user.seed.js';

export interface SeedOAuthData {
  userEmail: string;
  provider: 'GOOGLE' | 'GITHUB' | 'GITLAB' | 'MICROSOFT';
  providerAccountId: string;
}

export const SEED_OAUTH_ACCOUNTS: SeedOAuthData[] = [
  {
    userEmail: 'admin@nexora.app',
    provider: 'GITHUB',
    providerAccountId: 'gh_admin_1001',
  },
  {
    userEmail: 'admin@nexora.app',
    provider: 'GOOGLE',
    providerAccountId: 'google_admin_2001',
  },
  {
    userEmail: 'dev@nexora.app',
    provider: 'GITHUB',
    providerAccountId: 'gh_dev_1002',
  },
];

export interface SeededAuthResult {
  sessions: any[];
  oauthAccounts: any[];
}

export async function seedAuth(): Promise<SeededAuthResult> {
  logger.info('Seeding auth sessions & OAuth accounts...');
  const userModel = getOrmModel('User');
  const sessionModel = getOrmModel('UserSession');
  const oauthModel = getOrmModel('OAuthAccount');

  if (!userModel || !sessionModel || !oauthModel) {
    throw new Error('Required models not found in Prisma ORM');
  }

  // Ensure users exist
  let users: SeededUserRecord[] = (await userModel.all()) || [];
  if (users.length === 0) {
    users = await seedUsers();
  }

  const userMap = new Map<string, SeededUserRecord>();
  for (const u of users) {
    userMap.set(u.email.toLowerCase().trim(), u);
  }

  const existingSessions: any[] = (await sessionModel.all()) || [];
  const existingOAuth: any[] = (await oauthModel.all()) || [];

  const oauthMap = new Set<string>();
  for (const oa of existingOAuth) {
    oauthMap.add(`${oa.provider}:${oa.providerAccountId}`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const seededSessions: any[] = [...existingSessions];
  const seededOAuth: any[] = [...existingOAuth];

  // Seed sample active sessions for primary users if none exist for that user
  for (const user of users.slice(0, 2)) {
    const hasSession = existingSessions.some((s) => s.userId === user.id);
    if (!hasSession) {
      const session = await sessionModel.create({
        pubId: generatePubId('ses'),
        userId: user.id,
        refreshToken: `seed_refresh_token_${user.id}_${Date.now()}`,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ipAddress: '127.0.0.1',
        expiresAt,
        createdAt: now.toISOString(),
      });
      seededSessions.push(session);
      logger.success(`Created active session for ${user.email}`);
    }
  }

  // Seed OAuth accounts
  for (const oa of SEED_OAUTH_ACCOUNTS) {
    const user = userMap.get(oa.userEmail.toLowerCase().trim());
    if (!user) continue;

    const key = `${oa.provider}:${oa.providerAccountId}`;
    if (!oauthMap.has(key)) {
      const account = await oauthModel.create({
        pubId: generatePubId('oa'),
        userId: user.id,
        provider: oa.provider,
        providerAccountId: oa.providerAccountId,
        accessToken: `seed_access_token_${oa.provider.toLowerCase()}_${user.id}`,
        refreshToken: `seed_oauth_refresh_token_${user.id}`,
        expiresAt,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      oauthMap.add(key);
      seededOAuth.push(account);
      logger.success(
        `Linked ${oa.provider} account (${oa.providerAccountId}) to ${oa.userEmail}`,
      );
    }
  }

  logger.success(
    `Auth seeding complete. Sessions: ${seededSessions.length}, OAuth Accounts: ${seededOAuth.length}`,
  );

  return { sessions: seededSessions, oauthAccounts: seededOAuth };
}

// Allow direct execution
if (
  process.argv[1] &&
  (process.argv[1].endsWith('auth.seed.ts') ||
    process.argv[1].endsWith('auth.seed.js'))
) {
  seedAuth()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Auth seeding failed: ${err.message}`);
      process.exit(1);
    });
}
