import { randomBytes } from 'node:crypto';

// URL-safe characters: numbers + lowercase letters (avoid ambiguous chars if needed, standard base36/base62 alphabet)
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a cryptographically secure random string ID of specified length.
 * Default length is 12 characters.
 */
export function generateRandomId(length = 12): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return result;
}

/**
 * Generate a strongly typed public identifier with a specific prefix.
 * e.g. org_9k2m8x7q4b1z, usr_3f8n2v1x9y4p, mem_5a7d9k3j2m1n
 */
export function generatePubId(prefix?: 'usr' | 'org' | 'mem' | string, length = 12): string {
  const randomPart = generateRandomId(length);
  return prefix ? `${prefix}_${randomPart}` : randomPart;
}
