import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../helpers/app.js';
import { tokenFromEmail } from '../../helpers/fakes.js';
import { PASSWORD, signedInAdmin } from '../../helpers/scenario.js';

describe('auth HTTP API', () => {
  it('sign up → verify sets an httpOnly session cookie → /me works → logout clears it', async () => {
    const t = createTestApp();
    const agent = t.agent();
    await agent.post('/api/auth/signup').send({ name: 'Asha', email: 'asha@acme.com', password: PASSWORD }).expect(202);

    const token = tokenFromEmail(t.jobs.sent('email.send')[0]!.text);
    const verified = await agent.post('/api/auth/verify-email').send({ token }).expect(200);
    const cookie = verified.headers['set-cookie']![0]!;
    expect(cookie).toMatch(/^cg_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await agent.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ user: { email: 'asha@acme.com' }, tenant: { onboarded: false } });

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/me').expect(401);
  });

  it('401 on protected routes without a session', async () => {
    const res = await createTestApp().api.get('/api/me').expect(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('spec validation: 400 on malformed email / short password', async () => {
    const { api } = createTestApp();
    const res = await api.post('/api/auth/signup').send({ name: 'A', email: 'nope', password: 'short' }).expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.length).toBeGreaterThanOrEqual(2);
  });

  it('422 with WORK_EMAIL_REQUIRED for personal email', async () => {
    const res = await createTestApp()
      .api.post('/api/auth/signup')
      .send({ name: 'A', email: 'a@gmail.com', password: PASSWORD })
      .expect(422);
    expect(res.body.code).toBe('WORK_EMAIL_REQUIRED');
  });

  it('403 EMAIL_NOT_VERIFIED when signing in before verifying', async () => {
    const t = createTestApp();
    await t.api.post('/api/auth/signup').send({ name: 'A', email: 'a@acme.com', password: PASSWORD }).expect(202);
    const res = await t.api.post('/api/auth/login').send({ email: 'a@acme.com', password: PASSWORD }).expect(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('forgot password always answers 202 (no account enumeration)', async () => {
    const t = createTestApp();
    const a = await t.api.post('/api/auth/forgot-password').send({ email: 'ghost@acme.com' }).expect(202);
    await signedInAdmin(t);
    const b = await t.api.post('/api/auth/forgot-password').send({ email: 'asha@acme.com' }).expect(202);
    expect(a.body).toEqual(b.body);
  });

  it('blocks cross-origin state-changing requests (CSRF)', async () => {
    const res = await createTestApp()
      .api.post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'a@acme.com', password: PASSWORD })
      .expect(403);
    expect(res.body.message).toMatch(/Cross-origin/);
  });

  it('allows same-origin requests', async () => {
    await createTestApp()
      .api.post('/api/auth/login')
      .set('Origin', 'http://app.test')
      .send({ email: 'a@acme.com', password: PASSWORD })
      .expect(401);
  });
});
