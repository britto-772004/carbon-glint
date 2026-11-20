import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../helpers/app.js';
import { tokenFromEmail } from '../../helpers/fakes.js';
import { PASSWORD, signedInAdmin } from '../../helpers/scenario.js';

describe('team (users + invitations) HTTP API', () => {
  it('invite → lookup → accept signs the colleague in as an active admin of the same tenant', async () => {
    const t = createTestApp();
    const { agent, me } = await signedInAdmin(t);

    const inv = await agent.post('/api/invitations').send({ email: 'Ben@acme.com' }).expect(201);
    expect(inv.body).toMatchObject({ email: 'ben@acme.com', status: 'pending' });
    const mail = t.jobs.sent('email.send').at(-1)!;
    expect(mail).toMatchObject({ to: 'ben@acme.com', subject: expect.stringContaining('invited you') });
    const token = tokenFromEmail(mail.text);

    const preview = await t.api.post('/api/invitations/lookup').send({ token }).expect(200);
    expect(preview.body).toEqual({ email: 'ben@acme.com', tenantName: 'Acme' });

    const ben = t.agent();
    const accepted = await ben
      .post('/api/invitations/accept')
      .send({ token, name: 'Ben', password: PASSWORD })
      .expect(200);
    expect(accepted.body).toMatchObject({
      user: { status: 'active', emailVerified: true },
      tenant: { id: me.tenant.id },
    });
    await ben.get('/api/me').expect(200);

    // link is single-use
    await t.api.post('/api/invitations/accept').send({ token, name: 'X', password: PASSWORD }).expect(404);
    const users = await agent.get('/api/users').expect(200);
    expect(users.body).toHaveLength(2);
  });

  it('only allows inviting the tenant domain, and not existing users', async () => {
    const t = createTestApp();
    const { agent } = await signedInAdmin(t);
    expect((await agent.post('/api/invitations').send({ email: 'x@other.com' }).expect(422)).body.code).toBe(
      'INVITE_DOMAIN_MISMATCH',
    );
    expect((await agent.post('/api/invitations').send({ email: 'asha@acme.com' }).expect(409)).body.code).toBe(
      'USER_EXISTS',
    );
  });

  it('revoke and resend invitations', async () => {
    const t = createTestApp();
    const { agent } = await signedInAdmin(t);
    const inv = (await agent.post('/api/invitations').send({ email: 'ben@acme.com' }).expect(201)).body;
    const firstToken = tokenFromEmail(t.jobs.sent('email.send').at(-1)!.text);

    await agent.post(`/api/invitations/${inv.id}/resend`).expect(200);
    const secondToken = tokenFromEmail(t.jobs.sent('email.send').at(-1)!.text);
    expect(secondToken).not.toBe(firstToken);
    await t.api.post('/api/invitations/lookup').send({ token: firstToken }).expect(404);

    await agent.delete(`/api/invitations/${inv.id}`).expect(204);
    await t.api.post('/api/invitations/lookup').send({ token: secondToken }).expect(404);
    expect((await agent.get('/api/invitations').expect(200)).body[0].status).toBe('revoked');
  });

  it('disable a colleague kills their sessions; you cannot disable yourself', async () => {
    const t = createTestApp();
    const { agent, me } = await signedInAdmin(t);
    await agent.post('/api/invitations').send({ email: 'ben@acme.com' }).expect(201);
    const token = tokenFromEmail(t.jobs.sent('email.send').at(-1)!.text);
    const ben = t.agent();
    const benMe = (await ben.post('/api/invitations/accept').send({ token, name: 'Ben', password: PASSWORD })).body;

    await agent.patch(`/api/users/${benMe.user.id}`).send({ status: 'disabled' }).expect(200);
    await ben.get('/api/me').expect(401);
    expect((await agent.patch(`/api/users/${me.user.id}`).send({ status: 'disabled' }).expect(422)).body.code).toBe(
      'CANNOT_CHANGE_SELF',
    );
  });

  it('tenant isolation: admins never see or touch another company', async () => {
    const t = createTestApp();
    const acme = await signedInAdmin(t, 'asha@acme.com');
    const globex = await signedInAdmin(t, 'hank@globex.com', 'Hank');

    const acmeUsers = (await acme.agent.get('/api/users').expect(200)).body;
    expect(acmeUsers.map((u: { email: string }) => u.email)).toEqual(['asha@acme.com']);
    await globex.agent.patch(`/api/users/${acme.me.user.id}`).send({ status: 'disabled' }).expect(404);
    await acme.agent.get('/api/me').expect(200);
  });
});
