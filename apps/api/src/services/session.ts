import type { Config } from '../config.js';
import { hashToken, randomToken } from '../lib/crypto.js';
import type { UserModel } from '../models/index.js';
import type { Repositories } from '../repositories/index.js';

export const SESSION_IDLE_SECONDS = 8 * 3600;
export const SESSION_ABSOLUTE_SECONDS = 7 * 24 * 3600;

/** Creates a server-side session and returns the opaque token for the cookie (only its hash is stored). */
export async function startSession(repos: Repositories, config: Config, user: UserModel): Promise<string> {
  const token = randomToken();
  await repos.sessions.create(
    hashToken(token, config.SESSION_SECRET),
    { userId: user.id, role: user.role, tenantId: user.tenantId, createdAt: Date.now() },
    SESSION_IDLE_SECONDS,
  );
  return token;
}
