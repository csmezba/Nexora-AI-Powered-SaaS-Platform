import { describe, expect, it } from 'vitest';
import {
  generatePubId,
  generateRandomId,
} from '../../../../src/common/utils/unique-id.util.js';

describe('unique-id.util', () => {
  const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?~]/;

  describe('generateRandomId', () => {
    it('should generate an ID that is always exactly 12 characters long', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateRandomId();
        expect(id).toHaveLength(12);
      }
    });

    it('should include at least one special character in every generated ID', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateRandomId();
        expect(id).toMatch(SPECIAL_CHARS_REGEX);
      }
    });

    it('should generate unique IDs across multiple invocations', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRandomId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generatePubId', () => {
    it('should prefix the generated 12-character ID correctly', () => {
      const id = generatePubId('usr');
      expect(id.startsWith('usr_')).toBe(true);
      const randomPart = id.substring(4);
      expect(randomPart).toHaveLength(12);
      expect(randomPart).toMatch(SPECIAL_CHARS_REGEX);
    });

    it('should return a 12-character ID when no prefix is provided', () => {
      const id = generatePubId();
      expect(id).toHaveLength(12);
      expect(id).toMatch(SPECIAL_CHARS_REGEX);
    });
  });
});
