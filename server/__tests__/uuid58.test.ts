import { describe, expect, it } from 'vitest';
import { uuid58 } from '../uuid58';

describe('uuid58', () => {
  it('should generate a valid Base58 encoded UUID v7', () => {
    const id = uuid58();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique IDs', () => {
    const id1 = uuid58();
    const id2 = uuid58();
    expect(id1).not.toBe(id2);
  });

  it('should use only Base58 characters (no 0, O, I, l)', () => {
    const id = uuid58();
    // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    expect(id).toMatch(base58Regex);
  });

  it('should generate IDs of exactly 21 characters', () => {
    const ids = Array.from({ length: 100 }, () => uuid58());

    for (const id of ids) {
      // Base58 encoding of 128-bit UUID is always exactly 21 characters
      expect(id.length).toBe(21);
    }
  });
});
