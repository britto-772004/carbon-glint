import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import type {
  CalculationModel,
  ChatConversationModel,
  ChatMessageModel,
  EmbeddingModel,
  ReportModel,
  EfOverrideModel,
  EfSourceModel,
  EfSyncRunModel,
  EmissionFactorModel,
  ActivityDefinitionModel,
  ActivityModel,
  AuthTokenModel,
  DataSourceModel,
  GhgCategoryModel,
  IndustryModel,
  InvitationModel,
  NewOrgUnitModel,
  NewTenantModel,
  OrgUnitModel,
  NewUserModel,
  TenantModel,
  UserModel,
} from '../../src/models/index.js';
import type { Repositories } from '../../src/repositories/index.js';
import type { SessionRecord } from '../../src/repositories/session.repository.js';

/**
 * In-memory implementations of every repository — same contracts as the Postgres/Redis versions,
 * so service and controller tests run fast without infrastructure. Exposes `store` for seeding/assertions.
 */
export interface MemoryStore {
  industries: IndustryModel[];
  tenants: TenantModel[];
  users: UserModel[];
  authTokens: AuthTokenModel[];
  invitations: InvitationModel[];
  orgUnits: OrgUnitModel[];
  ghgCategories: GhgCategoryModel[];
  industryCategories: Array<{ industryId: string; categoryId: string; rank: number }>;
  activityDefinitions: ActivityDefinitionModel[];
  dataSources: DataSourceModel[];
  activities: ActivityModel[];
  efSources: EfSourceModel[];
  efSyncRuns: EfSyncRunModel[];
  emissionFactors: EmissionFactorModel[];
  calculations: CalculationModel[];
  efOverrides: EfOverrideModel[];
  reports: ReportModel[];
  embeddings: EmbeddingModel[];
  conversations: ChatConversationModel[];
  messages: ChatMessageModel[];
  sessions: Map<string, { record: SessionRecord; expiresAt: number }>;
  rateCounters: Map<string, { count: number; resetAt: number }>;
}

export const SEED_INDUSTRIES: IndustryModel[] = [
  { id: '11111111-1111-4111-8111-111111111111', code: 'it_software', name: 'IT & software services' },
  { id: '22222222-2222-4222-8222-222222222222', code: 'manufacturing', name: 'Manufacturing' },
];

const cat = (id: string, scope: number, code: string, name: string, sortOrder: number): GhgCategoryModel => ({
  id,
  tenantId: null,
  scope,
  code,
  name,
  description: '',
  sortOrder,
  createdAt: new Date('2026-01-01'),
});
/** A trimmed copy of the seeded GHG taxonomy. */
export const SEED_CATEGORIES: GhgCategoryModel[] = [
  cat('c1000000-0000-4000-8000-000000000001', 1, 'S1_STATIONARY', 'Stationary combustion', 0),
  cat('c1000000-0000-4000-8000-000000000002', 1, 'S1_MOBILE', 'Mobile combustion', 1),
  cat('c1000000-0000-4000-8000-000000000003', 1, 'S1_FUGITIVE', 'Fugitive emissions', 3),
  cat('c2000000-0000-4000-8000-000000000001', 2, 'S2_ELECTRICITY', 'Purchased electricity', 4),
  cat('c3000000-0000-4000-8000-000000000006', 3, 'S3_C6', '6. Business travel', 12),
  cat('c3000000-0000-4000-8000-000000000007', 3, 'S3_C7', '7. Employee commuting', 13),
];

export function createMemoryStore(): MemoryStore {
  return {
    industries: structuredClone(SEED_INDUSTRIES),
    tenants: [],
    users: [],
    authTokens: [],
    invitations: [],
    orgUnits: [],
    ghgCategories: structuredClone(SEED_CATEGORIES),
    // IT & software: electricity, travel, commuting recommended
    industryCategories: [
      { industryId: SEED_INDUSTRIES[0]!.id, categoryId: SEED_CATEGORIES[3]!.id, rank: 0 },
      { industryId: SEED_INDUSTRIES[0]!.id, categoryId: SEED_CATEGORIES[4]!.id, rank: 1 },
      { industryId: SEED_INDUSTRIES[0]!.id, categoryId: SEED_CATEGORIES[5]!.id, rank: 2 },
    ],
    activityDefinitions: [],
    dataSources: [],
    activities: [],
    efSources: [],
    efSyncRuns: [],
    emissionFactors: [],
    calculations: [],
    efOverrides: [],
    reports: [],
    embeddings: [],
    conversations: [],
    messages: [],
    sessions: new Map(),
    rateCounters: new Map(),
  };
}

const now = () => new Date();

export function createMemoryRepositories(store: MemoryStore = createMemoryStore()): Repositories & {
  store: MemoryStore;
} {
  const calcRow = (r: Parameters<Repositories['calculations']['upsert']>[0]): CalculationModel =>
    ({
      id: randomUUID(),
      orgUnitId: null,
      factorId: null,
      confidence: null,
      normalizedQuantity: null,
      conversionFactor: null,
      co2eKg: 0,
      trace: '{}',
      calculatedAt: now(),
      ...r,
    }) as CalculationModel;

  const defRow = (definition: ActivityDefinitionModel) => ({
    definition,
    category: store.ghgCategories.find((c) => c.id === definition.categoryId)!,
    dataSourceCount: store.dataSources.filter((x) => x.activityDefinitionId === definition.id).length,
    activityCount: store.activities.filter((x) => x.activityDefinitionId === definition.id).length,
  });

  const repos: Repositories & { store: MemoryStore } = {
    store,
    system: { pingDatabase: vi.fn(async () => true), pingRedis: vi.fn(async () => true) },

    industries: {
      list: async () => [...store.industries].sort((a, b) => a.name.localeCompare(b.name)),
      findById: async (id) => store.industries.find((i) => i.id === id) ?? null,
    },

    tenants: {
      async findById(id) {
        const tenant = store.tenants.find((t) => t.id === id);
        if (!tenant) return null;
        return { tenant, industry: store.industries.find((i) => i.id === tenant.industryId) ?? null };
      },
      findByDomain: async (domain) => store.tenants.find((t) => t.emailDomain === domain) ?? null,
      async create(data: NewTenantModel) {
        if (store.tenants.some((t) => t.emailDomain === data.emailDomain)) throw new Error('unique violation');
        const row: TenantModel = {
          id: randomUUID(),
          status: 'active',
          industryId: null,
          employeeBand: null,
          businessUnitCount: null,
          website: null,
          linkedinUrl: null,
          onboardedAt: null,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        } as TenantModel;
        store.tenants.push(row);
        return row;
      },
      async update(id, data) {
        const row = store.tenants.find((t) => t.id === id);
        if (!row) return null;
        Object.assign(row, data, { updatedAt: now() });
        return row;
      },
      async listSummaries({ q, status }) {
        return store.tenants
          .filter((t) => !status || t.status === status)
          .filter((t) => !q || `${t.name} ${t.emailDomain}`.toLowerCase().includes(q.toLowerCase()))
          .map((tenant) => ({
            tenant,
            industry: store.industries.find((i) => i.id === tenant.industryId) ?? null,
            userCount: store.users.filter((u) => u.tenantId === tenant.id).length,
          }));
      },
    },

    users: {
      findById: async (id) => store.users.find((u) => u.id === id) ?? null,
      findByEmail: async (email) => store.users.find((u) => u.email === email) ?? null,
      async create(data: NewUserModel) {
        if (store.users.some((u) => u.email === data.email)) throw new Error('unique violation');
        const row: UserModel = {
          id: randomUUID(),
          tenantId: null,
          role: 'admin',
          status: 'pending',
          emailVerifiedAt: null,
          passwordIsTemporary: false,
          lastLoginAt: null,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        } as UserModel;
        store.users.push(row);
        return row;
      },
      async update(id, data) {
        const row = store.users.find((u) => u.id === id);
        if (!row) return null;
        Object.assign(row, data, { updatedAt: now() });
        return row;
      },
      listByTenant: async (tenantId) => store.users.filter((u) => u.tenantId === tenantId),
      countActive: async (tenantId, excludeUserId) =>
        store.users.filter((u) => u.tenantId === tenantId && u.status === 'active' && u.id !== excludeUserId).length,
    },

    authTokens: {
      async create(data) {
        const row: AuthTokenModel = { id: randomUUID(), usedAt: null, createdAt: now(), ...data };
        store.authTokens.push(row);
        return row;
      },
      findValid: async (purpose, tokenHash, at = now()) =>
        store.authTokens.find(
          (t) => t.purpose === purpose && t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > at,
        ) ?? null,
      async markUsed(id) {
        const t = store.authTokens.find((x) => x.id === id);
        if (t) t.usedAt = now();
      },
      async deleteForUser(userId, purpose) {
        store.authTokens = store.authTokens.filter((t) => !(t.userId === userId && t.purpose === purpose));
      },
    },

    invitations: {
      async create(data) {
        const row: InvitationModel = { id: randomUUID(), acceptedAt: null, revokedAt: null, createdAt: now(), ...data };
        store.invitations.push(row);
        return row;
      },
      findById: async (tenantId, id) => store.invitations.find((i) => i.tenantId === tenantId && i.id === id) ?? null,
      async findOpenByTokenHash(tokenHash) {
        const invitation = store.invitations.find((i) => i.tokenHash === tokenHash && !i.acceptedAt && !i.revokedAt);
        const tenant = invitation && store.tenants.find((t) => t.id === invitation.tenantId);
        return invitation && tenant ? { invitation, tenant } : null;
      },
      findOpenByEmail: async (tenantId, email) =>
        store.invitations.find((i) => i.tenantId === tenantId && i.email === email && !i.acceptedAt && !i.revokedAt) ??
        null,
      listByTenant: async (tenantId) => store.invitations.filter((i) => i.tenantId === tenantId).reverse(),
      async update(id, data) {
        const row = store.invitations.find((i) => i.id === id);
        if (!row) return null;
        Object.assign(row, data);
        return row;
      },
    },

    orgUnits: {
      listByTenant: async (tenantId) => store.orgUnits.filter((o) => o.tenantId === tenantId),
      findById: async (tenantId, id) => store.orgUnits.find((o) => o.tenantId === tenantId && o.id === id) ?? null,
      findByCode: async (tenantId, code) =>
        store.orgUnits.find((o) => o.tenantId === tenantId && o.code === code) ?? null,
      async create(data: NewOrgUnitModel) {
        const row: OrgUnitModel = {
          id: randomUUID(),
          parentId: null,
          type: 'branch',
          country: null,
          city: null,
          address: null,
          active: true,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        } as OrgUnitModel;
        store.orgUnits.push(row);
        return row;
      },
      async update(tenantId, id, data) {
        const row = store.orgUnits.find((o) => o.tenantId === tenantId && o.id === id);
        if (!row) return null;
        Object.assign(row, data, { updatedAt: now() });
        return row;
      },
      async delete(tenantId, id) {
        const before = store.orgUnits.length;
        store.orgUnits = store.orgUnits.filter((o) => !(o.tenantId === tenantId && o.id === id));
        return store.orgUnits.length < before;
      },
      countChildren: async (tenantId, id) =>
        store.orgUnits.filter((o) => o.tenantId === tenantId && o.parentId === id).length,
    },

    ghgCategories: {
      async listForTenant(tenantId, industryId, scope) {
        return store.ghgCategories
          .filter((c) => (c.tenantId === null || c.tenantId === tenantId) && (!scope || c.scope === scope))
          .map((category) => ({
            category,
            rank:
              store.industryCategories.find((ic) => ic.categoryId === category.id && ic.industryId === industryId)
                ?.rank ?? null,
          }));
      },
      findVisible: async (tenantId, id) =>
        store.ghgCategories.find((c) => c.id === id && (c.tenantId === null || c.tenantId === tenantId)) ?? null,
      findByCode: async (tenantId, code) =>
        store.ghgCategories.find((c) => c.code === code && c.tenantId === tenantId) ?? null,
      async create(data) {
        const row = {
          id: randomUUID(),
          description: '',
          sortOrder: 0,
          createdAt: now(),
          tenantId: null,
          ...data,
        } as GhgCategoryModel;
        store.ghgCategories.push(row);
        return row;
      },
    },

    activityDefinitions: {
      async list(tenantId, { scope, status }) {
        return store.activityDefinitions
          .filter((d) => d.tenantId === tenantId && (!scope || d.scope === scope) && (!status || d.status === status))
          .reverse()
          .map(defRow);
      },
      async findById(tenantId, id) {
        const d = store.activityDefinitions.find((x) => x.tenantId === tenantId && x.id === id);
        return d ? defRow(d) : null;
      },
      async create(data) {
        const row = {
          id: randomUUID(),
          description: '',
          defaultOrgUnitId: null,
          status: 'draft',
          publishedAt: null,
          createdBy: null,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        } as ActivityDefinitionModel;
        store.activityDefinitions.push(row);
        return row;
      },
      async update(tenantId, id, data) {
        const row = store.activityDefinitions.find((x) => x.tenantId === tenantId && x.id === id);
        if (!row) return null;
        Object.assign(row, data, { updatedAt: now() });
        return row;
      },
      async delete(tenantId, id) {
        const before = store.activityDefinitions.length;
        store.activityDefinitions = store.activityDefinitions.filter((x) => !(x.tenantId === tenantId && x.id === id));
        store.dataSources = store.dataSources.filter((x) => x.activityDefinitionId !== id);
        store.activities = store.activities.filter((x) => x.activityDefinitionId !== id);
        return store.activityDefinitions.length < before;
      },
    },

    dataSources: {
      listByDefinition: async (tenantId, adId) =>
        store.dataSources.filter((x) => x.tenantId === tenantId && x.activityDefinitionId === adId),
      findById: async (tenantId, id) => store.dataSources.find((x) => x.tenantId === tenantId && x.id === id) ?? null,
      findForJob: async (id) => store.dataSources.find((x) => x.id === id) ?? null,
      async create(data) {
        const row = {
          sheets: [],
          sheetName: null,
          headerRow: 1,
          columns: [],
          preview: [],
          rowCount: 0,
          mapping: null,
          mappingMode: null,
          status: 'uploaded',
          importedCount: 0,
          errorCount: 0,
          errors: [],
          importedAt: null,
          createdAt: now(),
          updatedAt: now(),
          id: randomUUID(),
          ...data,
        } as DataSourceModel;
        store.dataSources.push(row);
        return row;
      },
      async update(id, data) {
        const row = store.dataSources.find((x) => x.id === id);
        if (!row) return null;
        Object.assign(row, data, { updatedAt: now() });
        return row;
      },
      async delete(tenantId, id) {
        const before = store.dataSources.length;
        store.dataSources = store.dataSources.filter((x) => !(x.tenantId === tenantId && x.id === id));
        store.activities = store.activities.filter((x) => x.dataSourceId !== id);
        return store.dataSources.length < before;
      },
    },

    activities: {
      async replaceForDataSource(dataSourceId, rows) {
        store.activities = store.activities.filter((a) => a.dataSourceId !== dataSourceId);
        for (const r of rows) {
          store.activities.push({
            id: randomUUID(),
            createdAt: now(),
            location: null,
            orgUnitId: null,
            spend: null,
            currency: null,
            extra: {},
            ...r,
          } as ActivityModel);
        }
        return rows.length;
      },
      async listByDefinition(tenantId, adId, { limit, offset }) {
        const all = store.activities.filter((a) => a.tenantId === tenantId && a.activityDefinitionId === adId);
        return { items: all.slice(offset, offset + limit), total: all.length };
      },
      allByDefinition: async (tenantId, adId) =>
        store.activities.filter((a) => a.tenantId === tenantId && a.activityDefinitionId === adId),
      countByOrgUnit: async (tenantId, orgUnitId) =>
        store.activities.filter((a) => a.tenantId === tenantId && a.orgUnitId === orgUnitId).length,
      findById: async (tenantId, id) => store.activities.find((a) => a.tenantId === tenantId && a.id === id) ?? null,
      async deleteMany(tenantId, adId, ids) {
        const gone = new Set(
          store.activities
            .filter((a) => a.tenantId === tenantId && a.activityDefinitionId === adId && ids.includes(a.id))
            .map((a) => a.id),
        );
        store.activities = store.activities.filter((a) => !gone.has(a.id));
        store.calculations = store.calculations.filter((c) => !gone.has(c.activityId));
        store.efOverrides = store.efOverrides.filter((o) => !gone.has(o.activityId));
        return gone.size;
      },
    },

    emissionFactors: {
      async recordSyncRun(run) {
        const row: EfSyncRunModel = {
          id: randomUUID(),
          startedAt: now(),
          finishedAt: null,
          imported: [],
          message: '',
          ...run,
        };
        store.efSyncRuns.push(row);
        return row;
      },
      async lastSyncRun() {
        // newest start time wins; later inserts win ties
        return store.efSyncRuns.reduce<EfSyncRunModel | null>(
          (best, r) => (!best || r.startedAt >= best.startedAt ? r : best),
          null,
        );
      },
      async importDataset({ source, factors }) {
        const old = store.efSources.find((x) => x.code === source.code);
        if (old) {
          store.efSources = store.efSources.filter((x) => x !== old);
          store.emissionFactors = store.emissionFactors.filter((f) => f.sourceId !== old.id);
        }
        const src: EfSourceModel = { id: randomUUID(), factorCount: factors.length, importedAt: now(), ...source };
        store.efSources.push(src);
        for (const f of factors) {
          store.emissionFactors.push({
            id: randomUUID(),
            sourceId: src.id,
            year: source.year,
            citationUrl: source.url,
            search: '',
            ...f,
          });
        }
        return factors.length;
      },
      listSources: async () => store.efSources,
      async findById(id) {
        const factor = store.emissionFactors.find((f) => f.id === id);
        const source = factor && store.efSources.find((x) => x.id === factor.sourceId);
        return factor && source ? { factor, source } : null;
      },
      async findManyByIds(ids) {
        return store.emissionFactors
          .filter((f) => ids.includes(f.id))
          .map((factor) => ({ factor, source: store.efSources.find((x) => x.id === factor.sourceId)! }));
      },
      async search({ query, primary, units, scopeHint, limit = 20 }) {
        const words = (primary || query)
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length > 2);
        return store.emissionFactors
          .filter(
            (f) => f.unit && (!units?.length || units.includes(f.unit)) && (!scopeHint || f.scopeHint === scopeHint),
          )
          .map((factor) => {
            const hay = `${factor.name} ${factor.category}`.toLowerCase();
            const score = words.filter((w) => hay.includes(w)).length / Math.max(1, words.length);
            return { factor, source: store.efSources.find((x) => x.id === factor.sourceId)!, score };
          })
          .filter((h) => h.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      },
    },

    calculations: {
      listByDefinition: async (tenantId, adId) =>
        store.calculations.filter((c) => c.tenantId === tenantId && c.activityDefinitionId === adId),
      findByActivity: async (tenantId, activityId) =>
        store.calculations.find((c) => c.tenantId === tenantId && c.activityId === activityId) ?? null,
      async replaceForDefinition(tenantId, adId, rows) {
        store.calculations = store.calculations.filter(
          (c) => !(c.tenantId === tenantId && c.activityDefinitionId === adId && c.status !== 'overridden'),
        );
        for (const r of rows) {
          if (store.calculations.some((c) => c.activityId === r.activityId)) continue;
          store.calculations.push(calcRow(r));
        }
      },
      async upsert(row) {
        store.calculations = store.calculations.filter((c) => c.activityId !== row.activityId);
        const saved = calcRow(row);
        store.calculations.push(saved);
        return saved;
      },
      async listFacts(tenantId, activityId) {
        return store.calculations
          .filter((c) => c.tenantId === tenantId && (!activityId || c.activityId === activityId))
          .map((c) => {
            const a = store.activities.find((x) => x.id === c.activityId)!;
            const ad = store.activityDefinitions.find((x) => x.id === c.activityDefinitionId)!;
            const cat = store.ghgCategories.find((x) => x.id === c.categoryId)!;
            const ou = store.orgUnits.find((x) => x.id === c.orgUnitId);
            const f = store.emissionFactors.find((x) => x.id === c.factorId);
            const src = f && store.efSources.find((x) => x.id === f.sourceId);
            return {
              activityId: c.activityId,
              activityDefinitionId: c.activityDefinitionId,
              activityDefinitionName: ad.name,
              scope: c.scope as 1 | 2 | 3,
              categoryId: c.categoryId,
              categoryName: cat.name,
              orgUnitId: c.orgUnitId,
              orgUnitName: ou?.name ?? null,
              description: a.description,
              measure: a.measure,
              unit: a.unit,
              periodStart: a.periodStart,
              periodEnd: a.periodEnd,
              status: c.status,
              method: c.method,
              confidence: c.confidence,
              co2eKg: c.co2eKg,
              factor: f
                ? {
                    id: f.id,
                    name: f.name,
                    sourceCode: src?.code ?? '',
                    unit: f.unit,
                    co2ePerUnit: f.co2ePerUnit,
                    region: f.region,
                  }
                : null,
            };
          });
      },
      async createOverride(row) {
        const saved = {
          id: randomUUID(),
          factorId: null,
          value: null,
          unit: null,
          citation: null,
          previousCo2eKg: null,
          createdAt: now(),
          revertedAt: null,
          ...row,
        } as EfOverrideModel;
        store.efOverrides.push(saved);
        return saved;
      },
      listOverrides: async (tenantId, activityId) =>
        store.efOverrides.filter((o) => o.tenantId === tenantId && o.activityId === activityId),
      async revertOverrides(tenantId, activityId) {
        const open = store.efOverrides.filter(
          (o) => o.tenantId === tenantId && o.activityId === activityId && !o.revertedAt,
        );
        for (const o of open) o.revertedAt = now();
        return open.length;
      },
      async resetOverridesForDefinition(tenantId, adId) {
        const ids = new Set(
          store.activities.filter((a) => a.tenantId === tenantId && a.activityDefinitionId === adId).map((a) => a.id),
        );
        const open = store.efOverrides.filter((o) => o.tenantId === tenantId && ids.has(o.activityId) && !o.revertedAt);
        for (const o of open) o.revertedAt = now();
        store.calculations = store.calculations.filter(
          (c) => !(c.tenantId === tenantId && c.activityDefinitionId === adId && c.status === 'overridden'),
        );
        return open.length;
      },
      listByTenant: async (tenantId, filter) =>
        store.calculations.filter(
          (c) =>
            c.tenantId === tenantId &&
            (!filter?.activityDefinitionIds?.length || filter.activityDefinitionIds.includes(c.activityDefinitionId)),
        ),
    },

    reports: {
      list: async (tenantId) => store.reports.filter((r) => r.tenantId === tenantId).reverse(),
      findById: async (tenantId, id) => store.reports.find((r) => r.tenantId === tenantId && r.id === id) ?? null,
      findForJob: async (id) => store.reports.find((r) => r.id === id) ?? null,
      async create(data) {
        const r = {
          id: randomUUID(),
          status: 'queued',
          fileKey: null,
          error: null,
          createdAt: now(),
          generatedAt: null,
          ...data,
        } as ReportModel;
        store.reports.push(r);
        return r;
      },
      async update(id, data) {
        const r = store.reports.find((x) => x.id === id);
        if (!r) return null;
        Object.assign(r, data);
        return r;
      },
      async delete(tenantId, id) {
        const before = store.reports.length;
        store.reports = store.reports.filter((r) => !(r.tenantId === tenantId && r.id === id));
        return store.reports.length < before;
      },
    },

    assistant: {
      async replaceEmbeddings(tenantId, rows) {
        store.embeddings = store.embeddings.filter((e) => e.tenantId !== tenantId);
        for (const r of rows)
          store.embeddings.push({ id: randomUUID(), updatedAt: now(), ...r, tenantId } as EmbeddingModel);
        return rows.length;
      },
      async searchEmbeddings(tenantId, vector, k) {
        const cos = (a: number[], b: number[]) => {
          let dot = 0,
            na = 0,
            nb = 0;
          for (let i = 0; i < a.length; i++) {
            dot += a[i]! * (b[i] ?? 0);
            na += a[i]! ** 2;
            nb += (b[i] ?? 0) ** 2;
          }
          return na && nb ? 1 - dot / Math.sqrt(na * nb) : 1;
        };
        return store.embeddings
          .filter((e) => e.tenantId === tenantId)
          .map((e) => ({
            sourceType: e.sourceType,
            sourceId: e.sourceId,
            content: e.content,
            distance: cos(vector, e.embedding),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, k);
      },
      async createConversation(tenantId, userId, title) {
        const c = { id: randomUUID(), tenantId, userId, title, createdAt: now(), updatedAt: now() };
        store.conversations.push(c);
        return c;
      },
      findConversation: async (tenantId, userId, id) =>
        store.conversations.find((c) => c.tenantId === tenantId && c.userId === userId && c.id === id) ?? null,
      listConversations: async (tenantId, userId) =>
        store.conversations.filter((c) => c.tenantId === tenantId && c.userId === userId).reverse(),
      async touchConversation(id) {
        const c = store.conversations.find((x) => x.id === id);
        if (c) c.updatedAt = now();
      },
      async addMessage(row) {
        const m = {
          id: randomUUID(),
          chart: null,
          sources: [],
          toolCalls: [],
          tokens: null,
          createdAt: now(),
          ...row,
        } as ChatMessageModel;
        store.messages.push(m);
        return m;
      },
      listMessages: async (conversationId) => store.messages.filter((m) => m.conversationId === conversationId),
    },

    sessions: {
      async create(tokenHash, record, idleSeconds) {
        store.sessions.set(tokenHash, { record, expiresAt: Date.now() + idleSeconds * 1000 });
      },
      async touch(tokenHash, idleSeconds, absoluteSeconds, at = Date.now()) {
        const s = store.sessions.get(tokenHash);
        if (!s || s.expiresAt < at || at - s.record.createdAt > absoluteSeconds * 1000) {
          store.sessions.delete(tokenHash);
          return null;
        }
        s.expiresAt = at + idleSeconds * 1000;
        return s.record;
      },
      async destroy(tokenHash) {
        store.sessions.delete(tokenHash);
      },
      async destroyAllForUser(userId, except) {
        for (const [h, s] of store.sessions) if (s.record.userId === userId && h !== except) store.sessions.delete(h);
      },
    },

    rateLimits: {
      async hit(bucket, limit, windowSeconds) {
        const t = Date.now();
        let c = store.rateCounters.get(bucket);
        if (!c || c.resetAt <= t) {
          c = { count: 0, resetAt: t + windowSeconds * 1000 };
          store.rateCounters.set(bucket, c);
        }
        c.count += 1;
        return { allowed: c.count <= limit, retryAfterSeconds: Math.ceil((c.resetAt - t) / 1000) };
      },
      async reset(bucket) {
        store.rateCounters.delete(bucket);
      },
    },

    // No real atomicity in memory; good enough for unit tests (Postgres transactions are covered by integration tests).
    transaction: (fn) => fn(repos),
  };
  return repos;
}
