import { and, asc, cosineDistance, desc, eq } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import {
  chatConversations,
  chatMessages,
  embeddings,
  type ChatConversationModel,
  type ChatMessageModel,
  type NewChatMessageModel,
  type NewEmbeddingModel,
} from '../models/index.js';

export interface KnowledgeHit {
  sourceType: string;
  sourceId: string;
  content: string;
  distance: number;
}

export interface AssistantRepository {
  replaceEmbeddings(tenantId: string, rows: Omit<NewEmbeddingModel, 'tenantId'>[]): Promise<number>;
  searchEmbeddings(tenantId: string, vector: number[], k: number): Promise<KnowledgeHit[]>;
  createConversation(tenantId: string, userId: string, title: string): Promise<ChatConversationModel>;
  findConversation(tenantId: string, userId: string, id: string): Promise<ChatConversationModel | null>;
  listConversations(tenantId: string, userId: string): Promise<ChatConversationModel[]>;
  touchConversation(id: string): Promise<void>;
  addMessage(row: NewChatMessageModel): Promise<ChatMessageModel>;
  listMessages(conversationId: string): Promise<ChatMessageModel[]>;
}

export const createAssistantRepository = (db: DbExecutor): AssistantRepository => ({
  async replaceEmbeddings(tenantId, rows) {
    await db.delete(embeddings).where(eq(embeddings.tenantId, tenantId));
    for (let i = 0; i < rows.length; i += 200) {
      await db.insert(embeddings).values(rows.slice(i, i + 200).map((r) => ({ ...r, tenantId })));
    }
    return rows.length;
  },
  async searchEmbeddings(tenantId, vector, k) {
    const distance = cosineDistance(embeddings.embedding, vector);
    const rows = await db
      .select({
        sourceType: embeddings.sourceType,
        sourceId: embeddings.sourceId,
        content: embeddings.content,
        distance,
      })
      .from(embeddings)
      .where(eq(embeddings.tenantId, tenantId))
      .orderBy(distance)
      .limit(k);
    return rows.map((r) => ({ ...r, distance: Number(r.distance) }));
  },
  async createConversation(tenantId, userId, title) {
    const [row] = await db.insert(chatConversations).values({ tenantId, userId, title }).returning();
    return row!;
  },
  async findConversation(tenantId, userId, id) {
    const [row] = await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.tenantId, tenantId),
          eq(chatConversations.userId, userId),
          eq(chatConversations.id, id),
        ),
      )
      .limit(1);
    return row ?? null;
  },
  listConversations: (tenantId, userId) =>
    db
      .select()
      .from(chatConversations)
      .where(and(eq(chatConversations.tenantId, tenantId), eq(chatConversations.userId, userId)))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(50),
  async touchConversation(id) {
    await db.update(chatConversations).set({ updatedAt: new Date() }).where(eq(chatConversations.id, id));
  },
  async addMessage(row) {
    const [saved] = await db.insert(chatMessages).values(row).returning();
    return saved!;
  },
  listMessages: (conversationId) =>
    db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(asc(chatMessages.createdAt)),
});
