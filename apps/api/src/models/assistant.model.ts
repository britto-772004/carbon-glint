import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core';
import { tenants } from './tenant.model.js';
import { users } from './user.model.js';

export const EMBEDDING_DIMENSIONS = 768;

/** Tenant knowledge chunks for retrieval (RAG). Rebuilt by the `assistant.index` job. */
export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    sourceType: text().notNull(),
    sourceId: text().notNull(),
    content: text().notNull(),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('embeddings_tenant_idx').on(t.tenantId),
    index('embeddings_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
);

export const chatRole = pgEnum('chat_role', ['user', 'assistant']);

export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chat_conversations_user_idx').on(t.tenantId, t.userId)],
);

export interface ChartSpec {
  type: 'bar' | 'stacked-bar' | 'line' | 'pie' | 'table';
  title: string;
  unit: string;
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
}

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid()
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    role: chatRole().notNull(),
    content: text().notNull(),
    chart: jsonb().$type<ChartSpec | null>(),
    sources: jsonb().$type<string[]>().notNull().default([]),
    toolCalls: jsonb().$type<Array<{ name: string; args: unknown }>>().notNull().default([]),
    tokens: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chat_messages_conversation_idx').on(t.conversationId)],
);

export type EmbeddingModel = typeof embeddings.$inferSelect;
export type NewEmbeddingModel = typeof embeddings.$inferInsert;
export type ChatConversationModel = typeof chatConversations.$inferSelect;
export type ChatMessageModel = typeof chatMessages.$inferSelect;
export type NewChatMessageModel = typeof chatMessages.$inferInsert;
