import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { DbExecutor } from '../db/client.js';
import { efSources, emissionFactors, type EfSourceModel, type EmissionFactorModel } from '../models/index.js';
import type { ParsedDataset } from '../ef/types.js';

export interface FactorHit {
  factor: EmissionFactorModel;
  source: EfSourceModel;
  score: number;
}

export interface FactorSearch {
  query: string;
  /** Only factors in these catalogue units (unit-compatible with the activity). */
  units?: string[];
  scopeHint?: number;
  limit?: number;
}

export interface EmissionFactorRepository {
  /** Replaces a dataset version atomically (idempotent re-import). Returns factor count. */
  importDataset(dataset: ParsedDataset): Promise<number>;
  listSources(): Promise<EfSourceModel[]>;
  findById(id: string): Promise<{ factor: EmissionFactorModel; source: EfSourceModel } | null>;
  findManyByIds(ids: string[]): Promise<Array<{ factor: EmissionFactorModel; source: EfSourceModel }>>;
  /** Full-text + trigram ranking (ts_rank_cd × 0.6 + similarity × 0.4). */
  search(params: FactorSearch): Promise<FactorHit[]>;
}

const BATCH = 1000;

export const createEmissionFactorRepository = (db: DbExecutor): EmissionFactorRepository => ({
  async importDataset({ source, factors }) {
    return db.transaction(async (tx) => {
      await tx.delete(efSources).where(eq(efSources.code, source.code)); // cascades its factors
      const [src] = await tx
        .insert(efSources)
        .values({ ...source, factorCount: factors.length })
        .returning();
      for (let i = 0; i < factors.length; i += BATCH) {
        await tx
          .insert(emissionFactors)
          .values(
            factors
              .slice(i, i + BATCH)
              .map((f) => ({ ...f, sourceId: src!.id, year: source.year, citationUrl: source.url })),
          );
      }
      return factors.length;
    });
  },

  listSources: () => db.select().from(efSources).orderBy(desc(efSources.year), efSources.code),

  async findById(id) {
    const [row] = await db
      .select({ factor: emissionFactors, source: efSources })
      .from(emissionFactors)
      .innerJoin(efSources, eq(efSources.id, emissionFactors.sourceId))
      .where(eq(emissionFactors.id, id))
      .limit(1);
    return row ?? null;
  },

  async findManyByIds(ids) {
    if (ids.length === 0) return [];
    return db
      .select({ factor: emissionFactors, source: efSources })
      .from(emissionFactors)
      .innerJoin(efSources, eq(efSources.id, emissionFactors.sourceId))
      .where(inArray(emissionFactors.id, ids));
  },

  async search({ query, units, scopeHint, limit = 20 }) {
    const q = query.trim();
    if (!q) return [];
    const tsq = sql`websearch_to_tsquery('english', ${q})`;
    const orTsq = sql`to_tsquery('english', ${
      q
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 1)
        .join(' | ') || 'x'
    })`;
    const score = sql<number>`(0.6 * ts_rank_cd(${emissionFactors.search}, ${orTsq}) + 0.4 * similarity(${emissionFactors.name}, ${q}))`;
    const rows = await db
      .select({ factor: emissionFactors, source: efSources, score })
      .from(emissionFactors)
      .innerJoin(efSources, eq(efSources.id, emissionFactors.sourceId))
      .where(
        and(
          sql`(${emissionFactors.search} @@ ${orTsq} or ${emissionFactors.search} @@ ${tsq} or similarity(${emissionFactors.name}, ${q}) > 0.15)`,
          units?.length ? inArray(emissionFactors.unit, units) : isNotNull(emissionFactors.unit),
          scopeHint ? eq(emissionFactors.scopeHint, scopeHint) : undefined,
        ),
      )
      .orderBy(desc(score), desc(efSources.year))
      .limit(limit);
    return rows.map((r) => ({ ...r, score: Number(r.score) }));
  },
});
