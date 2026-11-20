import { hash, verify } from '@node-rs/argon2';

// argon2id with OWASP-recommended parameters (19 MiB, t=2) — fine for a 1 GB VM.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string): Promise<string> => hash(password, OPTIONS);

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Same policy as the spec's `Password` schema, plus character classes. */
export const isStrongPassword = (password: string): boolean =>
  password.length >= 10 && /[a-z]/i.test(password) && /\d/.test(password);

let dummyHash: Promise<string> | undefined;
/** Verifies against a real hash when the account doesn't exist, so response timing doesn't reveal accounts. */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword('carbon-glint-dummy-password-0');
  await verifyPassword(await dummyHash, password);
  return false;
}
