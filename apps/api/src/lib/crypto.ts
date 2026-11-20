import { createHmac, randomBytes, randomInt } from 'node:crypto';

/** URL-safe random token (default 32 bytes ≈ 43 chars) for sessions, verification and invite links. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** Keyed hash of a token; only hashes are stored, so a DB/Redis leak doesn't leak usable tokens. */
export const hashToken = (token: string, secret: string): string =>
  createHmac('sha256', secret).update(token).digest('hex');

const ALPHABET = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digit: '23456789',
  symbol: '!@#$%*?-_',
};

/** Random password with every character class (no look-alike characters), used for "forgot password". */
export function generatePassword(length = 16): string {
  const all = Object.values(ALPHABET).join('');
  const chars = Object.values(ALPHABET).map((set) => set[randomInt(set.length)]!);
  while (chars.length < length) chars.push(all[randomInt(all.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}
