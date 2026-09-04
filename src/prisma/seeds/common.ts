import bcrypt from 'bcryptjs';
import { db } from '../db.js';

export interface SeedLogger {
  info(msg: string): void;
  success(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export const logger: SeedLogger = {
  info: (msg: string) => console.log(`\x1b[34mℹ [SEED]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m✔ [SEED]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m⚠ [SEED]\x1b[0m ${msg}`),
  error: (msg: string) => console.log(`\x1b[31m✖ [SEED]\x1b[0m ${msg}`),
};

export const DEFAULT_SEED_PASSWORD = 'Password123!';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Access any Prisma 8 ORM model dynamically
 */
export function getOrmModel(modelName: string): any {
  const orm = db.orm as unknown as Record<string, any>;
  return (
    orm[modelName] ||
    (orm['public'] as unknown as Record<string, any>)?.[modelName] ||
    orm[modelName.toLowerCase()] ||
    orm[modelName.charAt(0).toLowerCase() + modelName.slice(1)]
  );
}
