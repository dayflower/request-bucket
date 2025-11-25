import baseX from 'base-x';
import { v7 } from 'uuid';

// Lexicographically ordered Base58 alphabet for proper string sorting
// Ordered so that encoded values maintain sort order: digits < uppercase < lowercase
// Excludes confusing characters: 0 (zero), O, I, l (lowercase L)
const base58 = baseX(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
);

export const uuid58 = () => {
  const buf = new Uint8Array(16);
  v7({}, buf);
  return base58.encode(buf);
};
