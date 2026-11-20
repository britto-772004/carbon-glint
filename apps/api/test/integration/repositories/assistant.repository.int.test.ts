import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createRepositories } from '../../../src/repositories/index.js';
import { fakeEmbedding } from '../../helpers/fakes.js';
import { createTestStores, resetDatabase } from '../db.js';

describe('AssistantRepository (pgvector)', () => {
  const stores = createTestStores();
  const repos = createRepositories(stores);
  let tenantId: string;
  let other: string;

  beforeEach(async () => {
    await resetDatabase(stores.database);
    tenantId = (await repos.tenants.create({ name: 'Acme', emailDomain: 'acme.com' })).id;
    other = (await repos.tenants.create({ name: 'Globex', emailDomain: 'globex.com' })).id;
  });
  afterAll(() => stores.close());

  it('returns nearest chunks by cosine distance, scoped to the tenant', async () => {
    const doc = (sourceId: string, content: string) => ({
      sourceType: 'business_unit',
      sourceId,
      content,
      embedding: fakeEmbedding(content),
    });
    await repos.assistant.replaceEmbeddings(tenantId, [
      doc('pun', 'Business unit Pune Plant manufacturing diesel boilers'),
      doc('dxb', 'Business unit Dubai Office sales hotel travel'),
    ]);
    await repos.assistant.replaceEmbeddings(other, [doc('secret', 'Business unit Pune Plant secret competitor')]);

    const hits = await repos.assistant.searchEmbeddings(tenantId, fakeEmbedding('pune plant diesel'), 5);
    expect(hits.map((h) => h.sourceId)).toEqual(['pun', 'dxb']);
    expect(hits[0]!.distance).toBeLessThan(hits[1]!.distance);
  });

  it('stores conversations per user with ordered messages', async () => {
    const user = await repos.users.create({ tenantId, email: 'a@acme.com', name: 'A', passwordHash: 'x' });
    const c = await repos.assistant.createConversation(tenantId, user.id, 'Q');
    await repos.assistant.addMessage({ conversationId: c.id, role: 'user', content: 'hi' });
    await repos.assistant.addMessage({
      conversationId: c.id,
      role: 'assistant',
      content: 'hello',
      chart: { type: 'bar', title: '', unit: '', categories: ['a'], series: [{ name: 's', data: [1] }] },
    });
    expect((await repos.assistant.listMessages(c.id)).map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(await repos.assistant.findConversation(other, user.id, c.id)).toBeNull();
  });
});
