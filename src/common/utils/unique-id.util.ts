import { randomInt } from 'node:crypto';

const NUMBERS = '0123456789';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?~';

const ALL_CHARS = `${NUMBERS}${LOWERCASE}${UPPERCASE}${SPECIAL_CHARS}`;
const REQUIRED_LENGTH = 12;

/**
 * Generate a cryptographically secure random string ID.
 * Always strictly 12 characters long (no less, no more) and includes special characters,
 * numbers, uppercase, and lowercase letters.
 */
export function generateRandomId(_length = REQUIRED_LENGTH): string {
  // Always enforce exactly 12 characters long (no less, no more)
  const targetLength = REQUIRED_LENGTH;

  // Guarantee inclusion of at least one character from each core character set (including special characters)
  const guaranteedChars = [
    NUMBERS[randomInt(NUMBERS.length)]!,
    LOWERCASE[randomInt(LOWERCASE.length)]!,
    UPPERCASE[randomInt(UPPERCASE.length)]!,
    SPECIAL_CHARS[randomInt(SPECIAL_CHARS.length)]!,
  ];

  const chars: string[] = [...guaranteedChars];

  // Fill the remaining length with cryptographically random characters from the combined pool
  while (chars.length < targetLength) {
    chars.push(ALL_CHARS[randomInt(ALL_CHARS.length)]!);
  }

  // Cryptographically secure Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const temp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = temp;
  }

  return chars.slice(0, targetLength).join('');
}

/**
 * Generate a strongly typed public identifier with a specific prefix.
 * e.g. org_9k#m8x7q4b1z, usr_3f$n2v1x9y4p, mem_5a@d9k3j2m1n
 */
export function generatePubId(
  prefix?: 'usr' | 'org' | 'mem' | string,
  _length = REQUIRED_LENGTH,
): string {
  const randomPart = generateRandomId();
  return prefix ? `${prefix}_${randomPart}` : randomPart;
}

