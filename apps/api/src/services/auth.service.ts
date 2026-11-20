import type { Schemas } from '@carbon-glint/api-spec';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../errors/domain-errors.js';
import { generatePassword, hashToken, randomToken } from '../lib/crypto.js';
import { newPasswordEmail, verificationEmail } from '../lib/email-templates.js';
import { hashPassword, isStrongPassword, verifyAgainstDummy, verifyPassword } from '../lib/password.js';
import { companyNameFromDomain, emailDomain, isWorkEmail, normalizeEmail } from '../lib/work-email.js';
import type { UserModel } from '../models/index.js';
import type { Repositories } from '../repositories/index.js';
import type { ServiceDeps } from './index.js';
import { toTenantDto, toUserDto } from './mappers.js';
import { SESSION_ABSOLUTE_SECONDS, SESSION_IDLE_SECONDS, startSession } from './session.js';
import type { Actor, RequestContext } from './types.js';

type Me = Schemas['Me'];
export interface SignedIn {
  me: Me;
  sessionToken: string;
}

export const VERIFY_TTL_MS = 24 * 3600 * 1000;

export interface AuthService {
  signUp(input: Schemas['SignUpRequest'], ctx: RequestContext): Promise<void>;
  verifyEmail(token: string): Promise<SignedIn>;
  resendVerification(email: string, ctx: RequestContext): Promise<void>;
  logIn(input: Schemas['LogInRequest'], ctx: RequestContext): Promise<SignedIn>;
  logOut(actor: Actor): Promise<void>;
  forgotPassword(email: string, ctx: RequestContext): Promise<void>;
  changePassword(actor: Actor, input: Schemas['ChangePasswordRequest']): Promise<void>;
  getMe(actor: Actor): Promise<Me>;
  /** Resolve a session cookie to an actor (null = not signed in / revoked / disabled). */
  authenticate(sessionToken: string | undefined): Promise<Actor | null>;
  /** Shared with the platform console. */
  sendVerification(user: UserModel): Promise<void>;
}

export const createAuthService = ({ repositories: repos, jobs, config }: ServiceDeps): AuthService => {
  const limit = async (bucket: string, max: number, windowSeconds: number) => {
    const r = await repos.rateLimits.hit(bucket, max, windowSeconds);
    if (!r.allowed) {
      throw new TooManyRequestsError(`Too many attempts. Try again in ${Math.ceil(r.retryAfterSeconds / 60)} min.`);
    }
  };

  const buildMe = async (user: UserModel): Promise<Me> => {
    const t = user.tenantId ? await repos.tenants.findById(user.tenantId) : null;
    return { user: toUserDto(user), tenant: t ? toTenantDto(t.tenant, t.industry) : null };
  };

  const sendVerification = async (user: UserModel, r: Repositories = repos) => {
    const token = randomToken();
    await r.authTokens.deleteForUser(user.id, 'verify_email');
    await r.authTokens.create({
      userId: user.id,
      purpose: 'verify_email',
      tokenHash: hashToken(token, config.SESSION_SECRET),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    });
    const link = `${config.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await jobs.enqueue('email.send', verificationEmail(user.email, user.name, link));
  };

  const assertCanSignIn = async (user: UserModel) => {
    if (user.status === 'pending') {
      throw new ForbiddenError('Please verify your email first. Check your inbox for the link.', {
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    if (user.status === 'disabled') {
      throw new ForbiddenError('This account has been disabled.', { code: 'ACCOUNT_DISABLED' });
    }
    if (user.tenantId) {
      const t = await repos.tenants.findById(user.tenantId);
      if (t?.tenant.status === 'disabled') {
        throw new ForbiddenError('Your company account has been disabled.', { code: 'TENANT_DISABLED' });
      }
    }
  };

  return {
    sendVerification: (user) => sendVerification(user),

    async signUp(input, ctx) {
      const email = normalizeEmail(input.email);
      if (!isWorkEmail(email)) {
        throw new BusinessRuleError('Please use your work email address. Personal email providers are not allowed.', {
          code: 'WORK_EMAIL_REQUIRED',
        });
      }
      if (!isStrongPassword(input.password)) {
        throw new BusinessRuleError('Password needs at least 10 characters, including a letter and a number.', {
          code: 'WEAK_PASSWORD',
        });
      }
      await limit(`signup:ip:${ctx.ip}`, 10, 3600);

      const existing = await repos.users.findByEmail(email);
      if (existing) {
        if (existing.status === 'pending') return sendVerification(existing); // re-send instead of failing
        throw new ConflictError('An account with this email already exists. Sign in instead.', {
          code: 'EMAIL_IN_USE',
        });
      }

      const domain = emailDomain(email);
      const passwordHash = await hashPassword(input.password);

      await repos.transaction(async (tx) => {
        let tenant = await tx.tenants.findByDomain(domain);
        if (tenant && (await tx.users.countActive(tenant.id)) > 0) {
          throw new ConflictError('Your company is already on Carbon Glint. Ask your admin for an invite.', {
            code: 'COMPANY_EXISTS',
          });
        }
        tenant ??= await tx.tenants.create({ name: companyNameFromDomain(domain), emailDomain: domain });
        const user = await tx.users.create({
          tenantId: tenant.id,
          email,
          name: input.name.trim(),
          passwordHash,
          role: 'admin',
          status: 'pending',
        });
        await sendVerification(user, tx);
      });
    },

    async verifyEmail(token) {
      const tokenHash = hashToken(token, config.SESSION_SECRET);
      const user = await repos.transaction(async (tx) => {
        const record = await tx.authTokens.findValid('verify_email', tokenHash);
        if (!record) {
          throw new BusinessRuleError('This verification link is invalid or has expired. Request a new one.', {
            code: 'INVALID_TOKEN',
          });
        }
        await tx.authTokens.markUsed(record.id);
        const u = await tx.users.findById(record.userId);
        if (!u) throw new BusinessRuleError('This verification link is invalid.', { code: 'INVALID_TOKEN' });
        if (u.status !== 'pending') return u;
        return (await tx.users.update(u.id, {
          status: 'active',
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        }))!;
      });
      await assertCanSignIn(user);
      return { me: await buildMe(user), sessionToken: await startSession(repos, config, user) };
    },

    async resendVerification(email, ctx) {
      const normalized = normalizeEmail(email);
      await limit(`verify:ip:${ctx.ip}`, 10, 3600);
      const allowed = await repos.rateLimits.hit(`verify:email:${normalized}`, 3, 3600);
      if (!allowed.allowed) return; // silently drop: don't reveal whether the account exists
      const user = await repos.users.findByEmail(normalized);
      if (user?.status === 'pending') await sendVerification(user);
    },

    async logIn(input, ctx) {
      const email = normalizeEmail(input.email);
      await limit(`login:${email}:${ctx.ip}`, 5, 15 * 60);

      const user = await repos.users.findByEmail(email);
      const ok = user
        ? await verifyPassword(user.passwordHash, input.password)
        : await verifyAgainstDummy(input.password);
      if (!user || !ok) throw new UnauthorizedError('Invalid email or password.', { code: 'INVALID_CREDENTIALS' });

      await assertCanSignIn(user);
      await repos.rateLimits.reset(`login:${email}:${ctx.ip}`);
      const updated = (await repos.users.update(user.id, { lastLoginAt: new Date() })) ?? user;
      return { me: await buildMe(updated), sessionToken: await startSession(repos, config, updated) };
    },

    logOut: (actor) => repos.sessions.destroy(actor.sessionHash),

    async forgotPassword(email, ctx) {
      const normalized = normalizeEmail(email);
      await limit(`forgot:ip:${ctx.ip}`, 10, 3600);
      const perEmail = await repos.rateLimits.hit(`forgot:email:${normalized}`, 3, 3600);
      if (!perEmail.allowed) return;

      const user = await repos.users.findByEmail(normalized);
      if (!user || user.status !== 'active') return; // same response either way

      const password = generatePassword();
      await repos.users.update(user.id, { passwordHash: await hashPassword(password), passwordIsTemporary: true });
      await repos.sessions.destroyAllForUser(user.id);
      await jobs.enqueue('email.send', newPasswordEmail(user.email, user.name, password, `${config.APP_URL}/login`));
    },

    async changePassword(actor, input) {
      const user = await repos.users.findById(actor.userId);
      if (!user) throw new UnauthorizedError('Not signed in.');
      if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
        throw new BusinessRuleError('Your current password is incorrect.', { code: 'INVALID_CURRENT_PASSWORD' });
      }
      if (!isStrongPassword(input.newPassword)) {
        throw new BusinessRuleError('Password needs at least 10 characters, including a letter and a number.', {
          code: 'WEAK_PASSWORD',
        });
      }
      await repos.users.update(user.id, {
        passwordHash: await hashPassword(input.newPassword),
        passwordIsTemporary: false,
      });
      await repos.sessions.destroyAllForUser(user.id, actor.sessionHash); // sign out other devices
    },

    async getMe(actor) {
      const user = await repos.users.findById(actor.userId);
      if (!user) throw new UnauthorizedError('Not signed in.');
      return buildMe(user);
    },

    async authenticate(sessionToken) {
      if (!sessionToken) return null;
      const sessionHash = hashToken(sessionToken, config.SESSION_SECRET);
      const session = await repos.sessions.touch(sessionHash, SESSION_IDLE_SECONDS, SESSION_ABSOLUTE_SECONDS);
      if (!session) return null;

      const user = await repos.users.findById(session.userId);
      let usable = user?.status === 'active';
      if (usable && user!.tenantId) {
        usable = (await repos.tenants.findById(user!.tenantId))?.tenant.status === 'active';
      }
      if (!usable) {
        await repos.sessions.destroy(sessionHash);
        return null;
      }
      return { userId: user!.id, role: user!.role, tenantId: user!.tenantId, sessionHash };
    },
  };
};
