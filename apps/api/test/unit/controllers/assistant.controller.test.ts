import { describe, expect, it } from 'vitest';
import { sanitizeChart } from '../../../src/services/assistant.service.js';
import { fakeAi } from '../../helpers/fakes.js';
import { publishedScenario } from '../../helpers/published.js';
import { onboardedAdmin } from '../../helpers/scenario.js';

/** A fake Gemini that calls real tools, then answers from their results. */
const scriptedAi = () => {
  const ai = fakeAi('ok', {});
  ai.runAgent.mockImplementation(async (opts: unknown) => {
    const { execute } = opts as { execute: (n: string, a: Record<string, unknown>) => Promise<unknown> };
    const calls = [];
    for (const [name, args] of [
      ['get_emissions_summary', { businessUnit: 'PUN' }],
      ['get_emissions_breakdown', { groupBy: 'scope', bucket: 'month' }],
      ['search_company_knowledge', { query: 'PUN branch' }],
    ] as const) {
      calls.push({ name, args, result: await execute(name, args) });
    }
    return { text: 'draft', toolCalls: calls };
  });
  ai.generateJson.mockImplementation(async (prompt = '') => {
    const pun = /"get_emissions_summary".*?"total":([\d.]+)/.exec(prompt)?.[1];
    return {
      answer: `Pune emitted **${pun} kg CO2e**.`,
      chart: {
        type: 'bar',
        title: 'By month',
        unit: 'kg CO2e',
        categories: ['Jan', 'Feb'],
        series: [{ name: 'Scope 1', data: [1, 2, 3] }],
      },
      sources: ['Emissions summary', 'BU: PUN'],
      suggestions: ['Compare with Dubai?'],
    };
  });
  return ai;
};

describe('AI assistant API', () => {
  it('requires Gemini to be configured', async () => {
    const { agent } = await publishedScenario();
    const res = await agent.post('/api/assistant/chat').send({ message: 'Total emissions?' }).expect(422);
    expect(res.body.code).toBe('AI_NOT_CONFIGURED');
  });

  it('answers with numbers from tenant-scoped tools, a sanitized chart, and saves the conversation', async () => {
    const ai = scriptedAi();
    const { t, agent } = await publishedScenario(ai);
    await t.services.assistant.index((await agent.get('/api/me')).body.tenant.id);

    const tree = (await agent.get('/api/emissions/org-tree')).body as Array<{
      code: string;
      orgUnitId: string;
      rollup: { total: number };
    }>;
    const pun = tree.find((n) => n.code === 'PUN')!;

    const res = (await agent.post('/api/assistant/chat').send({ message: 'How much did Pune emit?' }).expect(200)).body;
    expect(res.message.content).toBe(`Pune emitted **${pun.rollup.total} kg CO2e**.`);
    expect(res.message.chart).toEqual({
      type: 'bar',
      title: 'By month',
      unit: 'kg CO2e',
      categories: ['Jan', 'Feb'],
      series: [{ name: 'Scope 1', data: [1, 2] }],
    });
    expect(res.suggestions).toEqual(['Compare with Dubai?']);

    // RAG retrieved the PUN business unit for the knowledge query
    const agentCall = ai.runAgent.mock.calls[0]![0] as { tools: Array<{ name: string }> };
    expect(agentCall.tools.map((x) => x.name)).toContain('search_company_knowledge');
    const knowledgeResult = ai.runAgent.mock.results[0]!.value as Promise<{
      toolCalls: Array<{ name: string; result: Array<{ text: string }> }>;
    }>;
    const kr = (await knowledgeResult).toolCalls.find((c) => c.name === 'search_company_knowledge')!.result;
    expect(kr[0]!.text).toMatch(/Business unit PUN/);

    const convs = (await agent.get('/api/assistant/conversations').expect(200)).body;
    expect(convs[0].title).toBe('How much did Pune emit?');
    const msgs = (await agent.get(`/api/assistant/conversations/${res.conversationId}/messages`).expect(200)).body;
    expect(msgs.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant']);

    // follow-up keeps the conversation and passes history
    await agent
      .post('/api/assistant/chat')
      .send({ message: 'And Dubai?', conversationId: res.conversationId })
      .expect(200);
    expect((ai.runAgent.mock.calls[1]![0] as { history: unknown[] }).history).toHaveLength(2);

    // other tenants can't read it
    const other = await onboardedAdmin(t, 'hank@globex.com');
    await other.agent.get(`/api/assistant/conversations/${res.conversationId}/messages`).expect(404);
  });

  it('reports upstream AI failures as 502', async () => {
    const ai = fakeAi('ok', {});
    ai.runAgent.mockRejectedValue(new Error('quota'));
    const { agent } = await publishedScenario(ai);
    expect((await agent.post('/api/assistant/chat').send({ message: 'hi' }).expect(502)).body.code).toBe(
      'UPSTREAM_ERROR',
    );
  });
});

describe('sanitizeChart', () => {
  it('aligns series to categories and rejects junk', () => {
    expect(
      sanitizeChart({ type: 'pie', title: 't', unit: 'u', categories: ['a', 'b'], series: [{ name: 's', data: [1] }] }),
    ).toEqual({
      type: 'pie',
      title: 't',
      unit: 'u',
      categories: ['a', 'b'],
      series: [{ name: 's', data: [1, 0] }],
    });
    expect(sanitizeChart({ type: 'radar', categories: ['a'], series: [] })).toBeNull();
    expect(sanitizeChart('nope')).toBeNull();
    expect(sanitizeChart(null)).toBeNull();
  });
});
