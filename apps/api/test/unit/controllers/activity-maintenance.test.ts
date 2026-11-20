import { describe, expect, it } from 'vitest';
import { drainJobs, publishedScenario } from '../../helpers/published.js';
import { onboardedAdmin } from '../../helpers/scenario.js';
import { createTestApp } from '../../helpers/app.js';
import { SEED_CATEGORIES } from '../../helpers/memory-repositories.js';

const totalKg = async (agent: Awaited<ReturnType<typeof publishedScenario>>['agent']) =>
  (await agent.get('/api/emissions/summary').expect(200)).body.co2eKg.total as number;

describe('delete activities + recalculate', () => {
  it('deletes selected activities (and their emissions) and recalculates the definition', async () => {
    const { t, agent, ad } = await publishedScenario();
    const page = (await agent.get(`/api/activity-definitions/${ad.id}/activities?limit=500`).expect(200)).body;
    const before = await totalKg(agent);
    const victim = page.items[0];

    const res = await agent
      .post(`/api/activity-definitions/${ad.id}/activities/bulk-delete`)
      .send({ activityIds: [victim.id] })
      .expect(200);
    expect(res.body).toEqual({ deleted: 1 });
    const after = (await agent.get(`/api/activity-definitions/${ad.id}/activities?limit=500`).expect(200)).body;
    expect(after.total).toBe(page.total - 1);
    expect(after.items.find((a: { id: string }) => a.id === victim.id)).toBeUndefined();
    expect(await totalKg(agent)).toBeLessThanOrEqual(before);

    const recalc = await agent.post(`/api/activity-definitions/${ad.id}/recalculate`).send({}).expect(202);
    expect(recalc.body).toMatchObject({ id: ad.id, status: 'published', activityCount: page.total - 1 });
    expect(t.jobs.enqueued.map((j) => j.name)).toContain('calculation.run');
    await drainJobs(t);
    const emissions = (await agent.get('/api/emissions?limit=500').expect(200)).body;
    expect(emissions.total).toBe(page.total - 1);
  });

  it('ignores ids from another definition and 404s for unknown definitions', async () => {
    const { agent, ad } = await publishedScenario();
    const res = await agent
      .post(`/api/activity-definitions/${ad.id}/activities/bulk-delete`)
      .send({ activityIds: ['00000000-0000-4000-8000-000000000000'] })
      .expect(200);
    expect(res.body.deleted).toBe(0);
    await agent.post('/api/activity-definitions/00000000-0000-4000-8000-000000000000/recalculate').send({}).expect(404);
    await agent.post(`/api/activity-definitions/${ad.id}/activities/bulk-delete`).send({ activityIds: [] }).expect(400);
  });

  it('keeps overrides on recalculate unless resetOverrides is set', async () => {
    const { t, agent, ad } = await publishedScenario();
    const rows = (await agent.get('/api/emissions?limit=50')).body.items as Array<{
      activityId: string;
      description: string;
    }>;
    const diesel = rows.find((r) => r.description.startsWith('Diesel'))!;
    await agent
      .post(`/api/emissions/${diesel.activityId}/override`)
      .send({ type: 'custom_result', value: 1, reason: 'Metered by supplier' })
      .expect(200);
    const statusOf = async () =>
      ((await agent.get('/api/emissions?limit=50')).body.items as Array<{ activityId: string; status: string }>).find(
        (r) => r.activityId === diesel.activityId,
      )!.status;

    await agent.post(`/api/activity-definitions/${ad.id}/recalculate`).send({}).expect(202);
    await drainJobs(t);
    expect(await statusOf()).toBe('overridden');

    await agent.post(`/api/activity-definitions/${ad.id}/recalculate`).send({ resetOverrides: true }).expect(202);
    await drainJobs(t);
    expect(await statusOf()).not.toBe('overridden');
  });

  it('422 when recalculating a draft', async () => {
    const t = createTestApp();
    const { agent } = await onboardedAdmin(t);
    const ad = (
      await agent.post('/api/activity-definitions').send({
        name: 'Draft',
        scope: 1,
        categoryId: SEED_CATEGORIES[0]!.id,
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
      })
    ).body;
    const res = await agent.post(`/api/activity-definitions/${ad.id}/recalculate`).expect(422);
    expect(res.body.code).toBe('NOT_PUBLISHED');
  });
});
