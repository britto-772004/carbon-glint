import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REPORT_FORMATS } from '../../../src/reports/formats.js';
import { drainJobs, publishedScenario } from '../../helpers/published.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- supertest's parser types
const binary = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('reports API', () => {
  it('lists the seven country/framework formats', async () => {
    const { agent } = await publishedScenario();
    const formats = (await agent.get('/api/reports/formats').expect(200)).body;
    expect(formats.map((f: { code: string }) => f.code)).toEqual([
      'IN_BRSR',
      'IN_NIRF',
      'US_GHGP',
      'AE_CLIMATE_LAW',
      'SA_TADAWUL',
      'AU_AASB_S2',
      'SG_SGX',
    ]);
  });

  it.each(REPORT_FORMATS.map((f) => f.code))(
    'generates a %s PDF for a business unit',
    async (format) => {
      const { t, agent, hqId } = await publishedScenario();
      const created = (
        await agent
          .post('/api/reports')
          .send({ orgUnitId: hqId, format, periodStart: '2026-01-01', periodEnd: '2026-03-31' })
          .expect(202)
      ).body;
      expect(created.status).toBe('queued');
      await agent.get(`/api/reports/${created.id}/download`).expect(409);

      await drainJobs(t);
      const ready = (await agent.get(`/api/reports/${created.id}`).expect(200)).body;
      expect(ready).toMatchObject({ status: 'ready', orgUnitName: 'Acme HQ', error: null });

      const pdf = await agent.get(`/api/reports/${created.id}/download`).buffer(true).parse(binary).expect(200);
      expect(pdf.headers['content-type']).toBe('application/pdf');
      expect(pdf.headers['content-disposition']).toContain(`carbon-glint-${format}-HQ-2026-01-01_2026-03-31.pdf`);
      const body = pdf.body as Buffer;
      expect(body.subarray(0, 5).toString()).toBe('%PDF-');
      expect((body.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
      if (format === 'IN_BRSR' && process.env.SAVE_REPORT_PDF) writeFileSync(process.env.SAVE_REPORT_PDF, body);
    },
    30_000,
  );

  it('validates input and deletes reports with their files', async () => {
    const { t, agent, hqId } = await publishedScenario();
    expect(
      (
        await agent
          .post('/api/reports')
          .send({ orgUnitId: hqId, format: 'XX', periodStart: '2026-01-01', periodEnd: '2026-03-31' })
          .expect(422)
      ).body.code,
    ).toBe('UNKNOWN_FORMAT');
    const r = (
      await agent
        .post('/api/reports')
        .send({ orgUnitId: hqId, format: 'SG_SGX', periodStart: '2026-01-01', periodEnd: '2026-03-31' })
    ).body;
    await drainJobs(t);
    const before = t.files.data.size;
    await agent.delete(`/api/reports/${r.id}`).expect(204);
    expect(t.files.data.size).toBe(before - 1);
    expect((await agent.get('/api/reports').expect(200)).body).toHaveLength(0);
  }, 30_000);
});
