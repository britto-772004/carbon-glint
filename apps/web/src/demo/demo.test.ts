import { afterEach, describe, expect, it } from 'vitest';
import type { EmissionSummary, Heatmap, EmissionPage } from '@carbon-glint/sdk';
import { handleDemoRequest, resetDemoStore } from './handler';

const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await handleDemoRequest(new Request(`http://localhost/api${path}`, init));
  return (await res.json()) as T;
};

afterEach(() => resetDemoStore());

describe('demo API', () => {
  it('has substantial data under every scope', async () => {
    const sum = await call<EmissionSummary>('/emissions/summary');
    expect(sum.activityCount).toBeGreaterThan(800);
    for (const k of ['1', '2', '3'] as const) expect(sum.co2eKg[k]).toBeGreaterThan(1_000_000);
    expect(sum.needsReview).toBeGreaterThan(5);
    expect(sum.overridden).toBe(4);
    const cats = await call<Heatmap>('/emissions/heatmap?groupBy=category&bucket=month');
    expect(cats.rows.length).toBeGreaterThanOrEqual(15);
    expect(cats.columns).toHaveLength(10);
  });

  it('traces a row and supports override then revert', async () => {
    const page = await call<EmissionPage>('/emissions?scope=1&limit=1&status=matched');
    const id = page.items[0]!.activityId;
    const before = page.items[0]!.co2eKg;
    const t = await call<{ row: { co2eKg: number; status: string } }>(`/emissions/${id}/override`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'custom_result', value: 5, reason: 'test' }),
    });
    expect(t.row.status).toBe('overridden');
    expect(t.row.co2eKg).toBe(5);
    const reverted = await call<{ row: { co2eKg: number; status: string } }>(`/emissions/${id}/override`, {
      method: 'DELETE',
    });
    expect(reverted.row.status).not.toBe('overridden');
    expect(reverted.row.co2eKg).toBeCloseTo(before, 3);
  });

  it('answers unknown routes with 404', async () => {
    const res = await handleDemoRequest(new Request('http://localhost/api/nope'));
    expect(res.status).toBe(404);
  });
});
