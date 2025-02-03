import baseX from 'base-x';
import { v7 } from 'uuid';

const base62 = baseX(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
);

export const uuid62 = () => {
  const buf = new Uint8Array(16);
  v7({}, buf);
  return base62.encode(buf);
};
