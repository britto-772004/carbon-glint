import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../../src/lib/password.js';
import { createTestServices } from '../../helpers/app.js';
import { fakeJobQueue, fakeRepositories, tokenFromEmail } from '../../helpers/fakes.js';

const ctx = { ip: '203.0.113.7' };
const signup = { name: 'Asha Rao', email: 'Asha@Acme.com', password: 'correct-horse-9' };

describe('AuthService', () => {
  let repositories: ReturnType<typeof fakeRepositories>;
  let jobs: ReturnType<typeof fakeJobQueue>;
  let services: ReturnType<typeof createTestServices>['services'];

  beforeEach(() => {
    repositories = fakeRepositories();
    jobs = fakeJobQueue();
    ({ services } = createTestServices({ repositories, jobs }));
  });

  const verificationToken = () => tokenFromEmail(jobs.sent('email.send').at(-1)!.text);

  describe('signUp', () => {
    it('creates a pending admin + tenant for the domain and emails a verification link', async () => {
      await services.auth.signUp(signup, ctx);
      const [user] = repositories.store.users;
      expect(user).toMatchObject({ email: 'asha@acme.com', status: 'pending', role: 'admin' });
      expect(repositories.store.tenants[0]).toMatchObject({ emailDomain: 'acme.com', name: 'Acme' });
      const [mail] = jobs.sent('email.send');
      expect(mail).toMatchObject({ to: 'asha@acme.com', subject: expect.stringContaining('Verify') });
      expect(mail!.text).toContain('http://app.test/verify-email?token=');
      // only the hash is stored
      expect(repositories.store.authTokens[0]!.tokenHash).not.toBe(verificationToken());
    });

    it.each(['me@gmail.com', 'me@outlook.com', 'x@mailinator.com'])('rejects personal email %s', async (email) => {
      await expect(services.auth.signUp({ ...signup, email }, ctx)).rejects.toMatchObject({
        code: 'WORK_EMAIL_REQUIRED',
      });
    });

    it('rejects weak passwords', async () => {
      await expect(services.auth.signUp({ ...signup, password: 'onlyletters' }, ctx)).rejects.toMatchObject({
        code: 'WEAK_PASSWORD',
      });
    });

    it('re-sends verification for an existing pending signup instead of failing', async () => {
      await services.auth.signUp(signup, ctx);
      await services.auth.signUp(signup, ctx);
      expect(repositories.store.users).toHaveLength(1);
      expect(jobs.sent('email.send')).toHaveLength(2);
      expect(repositories.store.authTokens).toHaveLength(1); // old token replaced
    });

    it('sends a second person from an already-active company to "ask for invite"', async () => {
      await services.auth.signUp(signup, ctx);
      await services.auth.verifyEmail(verificationToken());
      await expect(services.auth.signUp({ ...signup, email: 'ben@acme.com', name: 'Ben' }, ctx)).rejects.toMatchObject({
        code: 'COMPANY_EXISTS',
      });
    });

    it('rate limits sign-ups per IP', async () => {
      for (let i = 0; i < 10; i++) await services.auth.signUp({ ...signup, email: `u${i}@corp${i}.io` }, ctx);
      await expect(services.auth.signUp({ ...signup, email: 'u11@corp11.io' }, ctx)).rejects.toMatchObject({
        code: 'RATE_LIMITED',
      });
    });
  });

  describe('verifyEmail', () => {
    it('activates the user, signs them in, and the link works only once', async () => {
      await services.auth.signUp(signup, ctx);
      const token = verificationToken();
      const { me, sessionToken } = await services.auth.verifyEmail(token);
      expect(me.user).toMatchObject({ status: 'active', emailVerified: true });
      expect(me.tenant).toMatchObject({ emailDomain: 'acme.com', onboarded: false });
      expect(await services.auth.authenticate(sessionToken)).toMatchObject({ role: 'admin' });
      await expect(services.auth.verifyEmail(token)).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
    });

    it('rejects expired links', async () => {
      await services.auth.signUp(signup, ctx);
      repositories.store.authTokens[0]!.expiresAt = new Date(Date.now() - 1000);
      await expect(services.auth.verifyEmail(verificationToken())).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
    });
  });

  describe('logIn', () => {
    const verified = async () => {
      await services.auth.signUp(signup, ctx);
      await services.auth.verifyEmail(verificationToken());
    };

    it('signs in with the right password (case-insensitive email)', async () => {
      await verified();
      const { me } = await services.auth.logIn({ email: 'ASHA@acme.com', password: signup.password }, ctx);
      expect(me.user.email).toBe('asha@acme.com');
      expect(repositories.store.users[0]!.lastLoginAt).not.toBeNull();
    });

    it('rejects wrong passwords and unknown emails identically', async () => {
      await verified();
      await expect(services.auth.logIn({ email: 'asha@acme.com', password: 'nope' }, ctx)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
      await expect(services.auth.logIn({ email: 'ghost@acme.com', password: 'nope' }, ctx)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('blocks unverified, disabled users and disabled tenants', async () => {
      await services.auth.signUp(signup, ctx);
      await expect(services.auth.logIn(signup, ctx)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });

      await services.auth.verifyEmail(verificationToken());
      repositories.store.tenants[0]!.status = 'disabled';
      await expect(services.auth.logIn(signup, ctx)).rejects.toMatchObject({ code: 'TENANT_DISABLED' });

      repositories.store.tenants[0]!.status = 'active';
      repositories.store.users[0]!.status = 'disabled';
      await expect(services.auth.logIn(signup, ctx)).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED' });
    });

    it('locks out after 5 failed attempts per email+IP', async () => {
      await verified();
      for (let i = 0; i < 5; i++) {
        await expect(services.auth.logIn({ ...signup, password: 'wrong' }, ctx)).rejects.toBeTruthy();
      }
      await expect(services.auth.logIn(signup, ctx)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    });
  });

  describe('forgotPassword', () => {
    it('emails a working new password, revokes sessions, and flags it temporary', async () => {
      await services.auth.signUp(signup, ctx);
      const { sessionToken } = await services.auth.verifyEmail(verificationToken());

      await services.auth.forgotPassword('asha@acme.com', ctx);
      const mail = jobs.sent('email.send').at(-1)!;
      const newPassword = mail.text.match(/password: (\S+)/)![1]!;

      expect(await services.auth.authenticate(sessionToken)).toBeNull();
      await expect(services.auth.logIn(signup, ctx)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
      const { me } = await services.auth.logIn({ email: signup.email, password: newPassword }, ctx);
      expect(me.user.passwordIsTemporary).toBe(true);
    });

    it('is silent for unknown accounts', async () => {
      await expect(services.auth.forgotPassword('nobody@acme.com', ctx)).resolves.toBeUndefined();
      expect(jobs.sent('email.send')).toHaveLength(0);
    });
  });

  describe('changePassword', () => {
    it('requires the current password, clears the temporary flag, keeps only this session', async () => {
      await services.auth.signUp(signup, ctx);
      const first = await services.auth.verifyEmail(verificationToken());
      const second = await services.auth.logIn(signup, ctx);
      const actor = (await services.auth.authenticate(second.sessionToken))!;

      await expect(
        services.auth.changePassword(actor, { currentPassword: 'wrong', newPassword: 'another-pass-1' }),
      ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });

      await services.auth.changePassword(actor, { currentPassword: signup.password, newPassword: 'another-pass-1' });
      expect(await verifyPassword(repositories.store.users[0]!.passwordHash, 'another-pass-1')).toBe(true);
      expect(await services.auth.authenticate(first.sessionToken)).toBeNull();
      expect(await services.auth.authenticate(second.sessionToken)).not.toBeNull();
    });
  });

  describe('authenticate', () => {
    it('drops sessions of users who were disabled after signing in', async () => {
      repositories.store.users.push({
        id: '33333333-3333-4333-8333-333333333333',
        tenantId: null,
        email: 'ops@carbon.app',
        name: 'Ops',
        passwordHash: await hashPassword('super-secret-1'),
        role: 'superadmin',
        status: 'active',
        emailVerifiedAt: new Date(),
        passwordIsTemporary: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const { sessionToken, me } = await services.auth.logIn(
        { email: 'ops@carbon.app', password: 'super-secret-1' },
        ctx,
      );
      expect(me.tenant).toBeNull();
      repositories.store.users[0]!.status = 'disabled';
      expect(await services.auth.authenticate(sessionToken)).toBeNull();
      expect(await services.auth.authenticate(undefined)).toBeNull();
      expect(await services.auth.authenticate('garbage')).toBeNull();
    });
  });
});
