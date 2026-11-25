import type { ChatMessage, DataSource, EmissionFactorSource, ReportFormat } from '@carbon-glint/sdk';
import { applyFilters, heatmap, orgTree, summary, type Bucket, type EmissionFilters, type GroupBy } from './aggregates';
import { answer, msg, SUGGESTIONS } from './assistant';
import { hasDemoReportUrl, registerDemoReportUrl } from './blobs';
import {
  applyOverride,
  calculate,
  calculatedActivities,
  calculateDefinition,
  DemoError,
  defOf,
  factsOf,
  nextId,
  revertOverride,
  rowDto,
  traceFor,
} from './engine';
import { FACTORS, factorById } from './factors';
import { rankFactors } from './engine';
import { findFormat, REPORT_FORMATS } from './report/formats';
import { buildReportData, type EmissionFactRow } from './report/report-data';
import { buildState, STD_MAPPING } from './seed';
import { setDemoMode } from './session';
import type { DemoActivity, DemoState } from './types';

let state: DemoState | null = null;
const getState = () => (state ??= buildState());
export const resetDemoStore = () => {
  state = null;
  pending.clear();
};
const pending = new Map<string, Array<Omit<DemoActivity, 'id' | 'definitionId' | 'dataSourceId' | 'rowNumber'>>>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const empty = (status = 204) => new Response(null, { status });
const fail = (status: number, code: string, message: string) => json({ code, message }, status);

const FORMATS: ReportFormat[] = REPORT_FORMATS.map(({ code, name, region, framework, description }) => ({
  code,
  name,
  region,
  framework,
  description,
}));

const sources = (): EmissionFactorSource[] => [
  {
    id: 'demo-src-2026',
    code: 'DEFRA_2026',
    publisher: 'UK DESNZ / DEFRA',
    name: 'Greenhouse gas reporting: conversion factors 2026',
    version: '2026',
    year: 2026,
    licence: 'Open Government Licence v3.0',
    url: 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
    factorCount: FACTORS.length,
    importedAt: '2026-06-20T08:00:00.000Z',
  },
  {
    id: 'demo-src-2025',
    code: 'DEFRA_2025',
    publisher: 'UK DESNZ / DEFRA',
    name: 'Greenhouse gas reporting: conversion factors 2025',
    version: '2025',
    year: 2025,
    licence: 'Open Government Licence v3.0',
    url: 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
    factorCount: 2480,
    importedAt: '2026-01-10T08:00:00.000Z',
  },
];

const CANNED = (bu: string | null) =>
  [
    ['Grid electricity – office', 18450, 'kWh'],
    ['Diesel – DG set backup power', 1200, 'L'],
    ['Petrol – company cars', 640, 'L'],
    ['Natural gas – boiler', 5200, 'm3'],
    ['Flight BLR → DXB return (economy)', 4880, 'passenger.km'],
    ['Hotel stay – Dubai', 3, 'room.night'],
  ].map(([description, measure, unit]) => ({
    description: description as string,
    location: 'Bengaluru, IN',
    measure: measure as number,
    unit: unit as string,
    orgUnitId: bu,
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
  }));

function parseCsv(text: string, bu: string | null) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;
  const split = (l: string) =>
    (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map((c) =>
      c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim(),
    );
  const head = split(lines[0]!).filter((h, i, a) => i < a.length - 1 || h);
  const idx = (n: string) => head.findIndex((h) => h.toLowerCase() === n.toLowerCase());
  const [d = -1, l = -1, m = -1, u = -1, ps = -1, pe = -1] = [
    'Activity Description',
    'Location',
    'Measure',
    'Unit',
    'Period Start',
    'Period End',
  ].map(idx);
  if (d < 0 || m < 0 || u < 0) return null;
  const rows = lines.slice(1).map((line) => {
    const c = split(line);
    return {
      description: c[d] ?? '',
      location: l >= 0 ? c[l] || null : null,
      measure: Number(c[m]),
      unit: c[u] ?? '',
      orgUnitId: bu,
      periodStart: (ps >= 0 && c[ps]) || '2026-10-01',
      periodEnd: (pe >= 0 && c[pe]) || '2026-10-31',
    };
  });
  const valid = rows.filter((r) => r.description && Number.isFinite(r.measure) && r.unit);
  return valid.length ? { head, rows: valid } : null;
}

const filtersOf = (s: DemoState, q: URLSearchParams): EmissionFilters => {
  const f: EmissionFilters = {};
  if (q.get('scope')) f.scope = Number(q.get('scope'));
  if (q.get('categoryId')) f.categoryId = q.get('categoryId')!;
  if (q.get('activityDefinitionId')) f.activityDefinitionId = q.get('activityDefinitionId')!;
  if (q.get('status')) f.status = q.get('status') as EmissionFilters['status'];
  if (q.get('from')) f.from = q.get('from')!;
  if (q.get('to')) f.to = q.get('to')!;
  const bu = q.get('orgUnitId');
  if (bu) {
    const ids = new Set<string>([bu]);
    for (let grew = true; grew;) {
      grew = false;
      for (const u of s.orgUnits)
        if (u.parentId && ids.has(u.parentId) && !ids.has(u.id)) {
          ids.add(u.id);
          grew = true;
        }
    }
    f.orgUnitIds = ids;
  }
  return f;
};

const withCounts = (s: DemoState, id: string) => {
  const d = defOf(s, id);
  return {
    ...d,
    dataSourceCount: s.dataSources.filter((x) => x.activityDefinitionId === id).length,
    activityCount: s.activities.filter((a) => a.definitionId === id).length,
  };
};
const actDto = (a: DemoActivity) => ({
  id: a.id,
  dataSourceId: a.dataSourceId,
  rowNumber: a.rowNumber,
  description: a.description,
  location: a.location,
  measure: a.measure,
  unit: a.unit,
  orgUnitId: a.orgUnitId,
  periodStart: a.periodStart,
  periodEnd: a.periodEnd,
  spend: null,
  currency: null,
});

/** Builds the same designed PDF the real API produces, from the in-browser data. */
async function makeReportBlob(
  s: DemoState,
  r: { format: string; formatName: string; orgUnitId: string; periodStart: string; periodEnd: string },
): Promise<Blob> {
  const fmt = findFormat(r.format)!;
  const subtree = new Set([r.orgUnitId]);
  for (let grew = true; grew;) {
    grew = false;
    for (const u of s.orgUnits)
      if (u.parentId && subtree.has(u.parentId) && !subtree.has(u.id)) {
        subtree.add(u.id);
        grew = true;
      }
  }
  const rows: EmissionFactRow[] = calculatedActivities(s)
    .filter(
      (a) => a.orgUnitId && subtree.has(a.orgUnitId) && a.periodEnd >= r.periodStart && a.periodStart <= r.periodEnd,
    )
    .map((a) => {
      const row = rowDto(s, a);
      return {
        scope: row.scope,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        orgUnitName: row.orgUnitName,
        periodStart: row.periodStart,
        description: row.description,
        measure: row.measure,
        unit: row.unit,
        status: row.status,
        method: row.method,
        co2eKg: row.co2eKg,
        factor: row.factor
          ? { sourceCode: row.factor.sourceCode, co2ePerUnit: row.factor.co2ePerUnit, unit: row.factor.unit }
          : null,
      };
    });
  const depth = (id: string | null): number =>
    id && id !== r.orgUnitId ? 1 + depth(s.orgUnits.find((u) => u.id === id)?.parentId ?? null) : 0;
  const data = buildReportData(rows, {
    companyName: s.tenant.name,
    orgUnitName: s.orgUnits.find((u) => u.id === r.orgUnitId)?.name ?? '',
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    formatName: fmt.name,
    framework: fmt.framework,
    boundary: s.orgUnits.filter((u) => subtree.has(u.id)).map((u) => ({ name: u.name, depth: depth(u.id) })),
  });
  const { renderReportPdf } = await import('./report/report-document');
  return renderReportPdf(data, fmt);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = { s: DemoState; q: URLSearchParams; body: any; m: RegExpMatchArray; req: Request };
type Route = [method: string, pattern: RegExp, fn: (c: Ctx) => Response | Promise<Response>];

const ROUTES: Route[] = [
  [
    'GET',
    /^\/health$/,
    () => json({ status: 'ok', version: 'demo', uptimeSeconds: 0, checks: { database: 'up', redis: 'up' } }),
  ],
  ['POST', /^\/auth\/logout$/, () => (setDemoMode(false), resetDemoStore(), empty())],
  ['GET', /^\/me$/, ({ s }) => json({ user: s.user, tenant: s.tenant })],
  ['GET', /^\/industries$/, ({ s }) => json(s.industries)],
  ['GET', /^\/tenant$/, ({ s }) => json(s.tenant)],
  ['GET', /^\/users$/, ({ s }) => json(s.users)],
  [
    'PATCH',
    /^\/users\/([^/]+)$/,
    ({ s, m, body }) => {
      const u = s.users.find((x) => x.id === m[1]);
      if (!u) return fail(404, 'NOT_FOUND', 'User not found');
      u.status = body.status;
      return json(u);
    },
  ],
  ['GET', /^\/invitations$/, ({ s }) => json(s.invitations)],
  [
    'POST',
    /^\/invitations$/,
    ({ s, body }) => {
      const inv = {
        id: nextId(s, 'demo-inv'),
        email: body.email,
        status: 'pending' as const,
        expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      s.invitations.unshift(inv);
      return json(inv, 201);
    },
  ],
  [
    'DELETE',
    /^\/invitations\/([^/]+)$/,
    ({ s, m }) => ((s.invitations = s.invitations.filter((i) => i.id !== m[1])), empty()),
  ],
  [
    'POST',
    /^\/invitations\/([^/]+)\/resend$/,
    ({ s, m }) => json(s.invitations.find((i) => i.id === m[1]) ?? s.invitations[0]),
  ],

  // org units
  ['GET', /^\/org-units$/, ({ s }) => json(s.orgUnits)],
  [
    'POST',
    /^\/org-units$/,
    ({ s, body }) => {
      const u = {
        id: nextId(s, 'demo-ou'),
        parentId: body.parentId ?? null,
        name: body.name,
        code: body.code,
        type: body.type,
        country: body.country ?? null,
        city: body.city ?? null,
        address: body.address ?? null,
        active: true,
        createdAt: new Date().toISOString(),
      };
      s.orgUnits.push(u);
      return json(u, 201);
    },
  ],
  [
    'PATCH',
    /^\/org-units\/([^/]+)$/,
    ({ s, m, body }) => {
      const u = s.orgUnits.find((x) => x.id === m[1]);
      if (!u) return fail(404, 'NOT_FOUND', 'Business unit not found');
      Object.assign(u, body);
      return json(u);
    },
  ],
  [
    'DELETE',
    /^\/org-units\/([^/]+)$/,
    ({ s, m }) => {
      if (s.orgUnits.some((u) => u.parentId === m[1]))
        return fail(409, 'HAS_CHILDREN', 'Remove or move the sub-units first.');
      s.orgUnits = s.orgUnits.filter((u) => u.id !== m[1]);
      return empty();
    },
  ],

  // categories
  ['GET', /^\/ghg-categories$/, ({ s }) => json(s.categories)],
  [
    'POST',
    /^\/ghg-categories$/,
    ({ s, body }) => {
      const c = {
        id: nextId(s, 'demo-cat'),
        scope: body.scope,
        code: `CUSTOM_${s.seq}`,
        name: body.name,
        description: body.description ?? '',
        custom: true,
        recommended: false,
        rank: null,
      };
      s.categories.push(c);
      return json(c, 201);
    },
  ],

  // activity definitions
  ['GET', /^\/activity-definitions$/, ({ s }) => json(s.definitions.map((d) => withCounts(s, d.id)))],
  [
    'POST',
    /^\/activity-definitions$/,
    ({ s, body }) => {
      const c = s.categories.find((x) => x.id === body.categoryId);
      if (!c) return fail(422, 'UNKNOWN_CATEGORY', 'Unknown category');
      const d = {
        id: nextId(s, 'demo-ad'),
        name: body.name,
        description: body.description ?? '',
        scope: c.scope,
        category: { id: c.id, code: c.code, name: c.name, scope: c.scope },
        defaultOrgUnitId: body.defaultOrgUnitId ?? null,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        status: 'draft' as const,
        publishedAt: null,
        createdAt: new Date().toISOString(),
      };
      s.definitions.push(d);
      return json(withCounts(s, d.id), 201);
    },
  ],
  [
    'GET',
    /^\/activity-definitions\/([^/]+)$/,
    ({ s, m }) => {
      if (!s.definitions.some((d) => d.id === m[1])) return fail(404, 'NOT_FOUND', 'Not found');
      return json({
        definition: withCounts(s, m[1]!),
        dataSources: s.dataSources.filter((x) => x.activityDefinitionId === m[1]),
      });
    },
  ],
  [
    'PATCH',
    /^\/activity-definitions\/([^/]+)$/,
    ({ s, m, body }) => {
      const d = s.definitions.find((x) => x.id === m[1]);
      if (!d) return fail(404, 'NOT_FOUND', 'Not found');
      if (body.name) d.name = body.name;
      return json(withCounts(s, d.id));
    },
  ],
  [
    'DELETE',
    /^\/activity-definitions\/([^/]+)$/,
    ({ s, m }) => {
      const id = m[1]!;
      const acts = s.activities.filter((a) => a.definitionId === id);
      acts.forEach((a) => (s.calcs.delete(a.id), s.overrides.delete(a.id)));
      s.activities = s.activities.filter((a) => a.definitionId !== id);
      s.dataSources = s.dataSources.filter((d) => d.activityDefinitionId !== id);
      s.definitions = s.definitions.filter((d) => d.id !== id);
      return empty();
    },
  ],
  [
    'POST',
    /^\/activity-definitions\/([^/]+)\/publish$/,
    ({ s, m }) => {
      const d = s.definitions.find((x) => x.id === m[1]);
      if (!d) return fail(404, 'NOT_FOUND', 'Not found');
      if (!s.activities.some((a) => a.definitionId === d.id))
        return fail(422, 'NO_DATA', 'Import at least one data source before publishing.');
      d.status = 'published';
      d.publishedAt = new Date().toISOString();
      calculateDefinition(s, d.id);
      return json(withCounts(s, d.id));
    },
  ],
  [
    'POST',
    /^\/activity-definitions\/([^/]+)\/recalculate$/,
    ({ s, m, body }) => {
      const d = s.definitions.find((x) => x.id === m[1]);
      if (!d) return fail(404, 'NOT_FOUND', 'Not found');
      if (d.status === 'published') calculateDefinition(s, d.id, Boolean(body?.resetOverrides));
      return json(withCounts(s, d.id), 202);
    },
  ],
  [
    'GET',
    /^\/activity-definitions\/([^/]+)\/activities$/,
    ({ s, m, q }) => {
      const all = s.activities.filter((a) => a.definitionId === m[1]);
      const off = Number(q.get('offset') ?? 0);
      const lim = Number(q.get('limit') ?? 50);
      return json({ items: all.slice(off, off + lim).map(actDto), total: all.length });
    },
  ],
  [
    'POST',
    /^\/activity-definitions\/([^/]+)\/activities\/bulk-delete$/,
    ({ s, m, body }) => {
      const ids = new Set<string>(body.activityIds);
      const before = s.activities.length;
      s.activities = s.activities.filter((a) => !(a.definitionId === m[1] && ids.has(a.id)));
      ids.forEach((id) => (s.calcs.delete(id), s.overrides.delete(id)));
      return json({ deleted: before - s.activities.length });
    },
  ],
  [
    'POST',
    /^\/activity-definitions\/([^/]+)\/data-sources$/,
    async ({ s, m, req }) => {
      const d = s.definitions.find((x) => x.id === m[1]);
      if (!d) return fail(404, 'NOT_FOUND', 'Not found');
      const form = await req.formData();
      const file = form.get('file');
      const name = file instanceof File ? file.name : 'upload.xlsx';
      const csv =
        file instanceof File && name.toLowerCase().endsWith('.csv')
          ? parseCsv(await file.text(), d.defaultOrgUnitId)
          : null;
      const rows = csv?.rows ?? CANNED(d.defaultOrgUnitId);
      const id = nextId(s, 'demo-ds');
      pending.set(id, rows);
      const ds: DataSource = {
        id,
        activityDefinitionId: d.id,
        fileName: name,
        fileType: name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx',
        fileSize: file instanceof File ? file.size : 5120,
        sheets: ['Sheet1'],
        sheetName: 'Sheet1',
        headerRow: 1,
        columns: ['Activity Description', 'Location', 'Measure', 'Unit', 'Period Start', 'Period End'],
        preview: rows
          .slice(0, 8)
          .map((r) => [r.description, r.location ?? '', String(r.measure), r.unit, r.periodStart, r.periodEnd]),
        rowCount: rows.length,
        mapping: STD_MAPPING,
        mappingMode: null,
        status: 'uploaded',
        importedCount: 0,
        errorCount: 0,
        errors: [],
        importedAt: null,
        createdAt: new Date().toISOString(),
      } as DataSource;
      s.dataSources.push(ds);
      return json(ds, 201);
    },
  ],
  [
    'GET',
    /^\/data-sources\/([^/]+)$/,
    ({ s, m }) => {
      const ds = s.dataSources.find((x) => x.id === m[1]);
      return ds ? json(ds) : fail(404, 'NOT_FOUND', 'Not found');
    },
  ],
  ['PATCH', /^\/data-sources\/([^/]+)$/, ({ s, m }) => json(s.dataSources.find((x) => x.id === m[1]))],
  [
    'POST',
    /^\/data-sources\/([^/]+)\/suggest-mapping$/,
    () =>
      json({
        mapping: STD_MAPPING,
        confidence: {
          description: 0.99,
          location: 0.95,
          measure: 0.99,
          unit: 0.99,
          periodStart: 0.97,
          periodEnd: 0.97,
        },
        source: 'ai',
        reasoning: 'Column headers match the standard template (demo).',
      }),
  ],
  [
    'POST',
    /^\/data-sources\/([^/]+)\/import$/,
    ({ s, m, body }) => {
      const ds = s.dataSources.find((x) => x.id === m[1]);
      if (!ds) return fail(404, 'NOT_FOUND', 'Not found');
      const rows = pending.get(ds.id) ?? [];
      const start = s.activities.filter((a) => a.dataSourceId === ds.id).length;
      const added = rows.map((r, i): DemoActivity => ({
        ...r,
        id: nextId(s, 'demo-act'),
        definitionId: ds.activityDefinitionId,
        dataSourceId: ds.id,
        rowNumber: start + i + 2,
      }));
      s.activities.push(...added);
      pending.delete(ds.id);
      Object.assign(ds, {
        status: 'imported',
        mapping: body.mapping ?? ds.mapping,
        mappingMode: body.mappingMode ?? 'ai',
        importedCount: added.length,
        importedAt: new Date().toISOString(),
      });
      if (defOf(s, ds.activityDefinitionId).status === 'published')
        for (const a of added) s.calcs.set(a.id, calculate(s, a));
      return json(ds, 202);
    },
  ],
  [
    'DELETE',
    /^\/data-sources\/([^/]+)$/,
    ({ s, m }) => {
      const ids = s.activities.filter((a) => a.dataSourceId === m[1]).map((a) => a.id);
      ids.forEach((id) => (s.calcs.delete(id), s.overrides.delete(id)));
      s.activities = s.activities.filter((a) => a.dataSourceId !== m[1]);
      s.dataSources = s.dataSources.filter((d) => d.id !== m[1]);
      return empty();
    },
  ],

  // emission factors
  ['GET', /^\/emission-factors\/sources$/, () => json(sources())],
  ['GET', /^\/emission-factors\/sync$/, ({ s }) => json(s.sync)],
  [
    'POST',
    /^\/emission-factors\/sync$/,
    ({ s }) => {
      s.sync.lastRun = {
        trigger: 'manual',
        status: 'ok',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        imported: [],
        message: 'All known databases are up to date.',
      };
      return json({}, 202);
    },
  ],
  [
    'GET',
    /^\/emission-factors\/search$/,
    ({ q }) => {
      const scope = q.get('scope') ? Number(q.get('scope')) : null;
      const hits = rankFactors(q.get('q') ?? '', q.get('unit'), scope).slice(0, Number(q.get('limit') ?? 10));
      return json(hits.map((r) => ({ factor: r.factor, score: Number(Math.min(0.99, r.score).toFixed(3)) })));
    },
  ],
  [
    'GET',
    /^\/emission-factors\/([^/]+)$/,
    ({ m }) => {
      const f = factorById(m[1]!);
      return f ? json(f) : fail(404, 'NOT_FOUND', 'Not found');
    },
  ],

  // emissions
  [
    'GET',
    /^\/emissions$/,
    ({ s, q }) => {
      const rank = (st: string) => ({ unmatched: 0, needs_review: 1, overridden: 2, matched: 3 })[st] ?? 4;
      const rows = s.activities.filter((a) => s.calcs.has(a.id)).map((a) => rowDto(s, a));
      const f = filtersOf(s, q);
      const keep = new Set(applyFilters(factsOf(s), f).map((x) => x.activityId));
      const items = rows
        .filter((r) => keep.has(r.activityId))
        .sort((a, b) => rank(a.status) - rank(b.status) || b.co2eKg - a.co2eKg);
      const off = Number(q.get('offset') ?? 0);
      const lim = Number(q.get('limit') ?? 50);
      return json({
        items: items.slice(off, off + lim),
        total: items.length,
        totalCo2eKg: items.reduce((x, r) => x + r.co2eKg, 0),
      });
    },
  ],
  [
    'GET',
    /^\/emissions\/summary$/,
    ({ s, q }) => json(summary(applyFilters(factsOf(s), filtersOf(s, q)), s.orgUnits.length)),
  ],
  [
    'GET',
    /^\/emissions\/heatmap$/,
    ({ s, q }) =>
      json(
        heatmap(
          applyFilters(factsOf(s), filtersOf(s, q)),
          (q.get('groupBy') ?? 'scope') as GroupBy,
          (q.get('bucket') ?? 'month') as Bucket,
          { from: q.get('from') ?? undefined, to: q.get('to') ?? undefined },
        ),
      ),
  ],
  [
    'GET',
    /^\/emissions\/org-tree$/,
    ({ s, q }) => json(orgTree(applyFilters(factsOf(s), filtersOf(s, q)), s.orgUnits)),
  ],
  [
    'POST',
    /^\/emissions\/bulk-override$/,
    ({ s, body }) => {
      let n = 0;
      for (const id of body.activityIds as string[]) {
        const a = s.activities.find((x) => x.id === id);
        if (!a) continue;
        applyOverride(s, a, { type: 'factor', factorId: body.factorId, reason: body.reason });
        n += 1;
      }
      return json({ updated: n });
    },
  ],
  [
    'GET',
    /^\/emissions\/([^/]+)\/trace$/,
    ({ s, m }) => {
      const a = s.activities.find((x) => x.id === m[1]);
      return a && s.calcs.has(a.id) ? json(traceFor(s, a)) : fail(404, 'NOT_FOUND', 'No calculation for this activity');
    },
  ],
  [
    'PUT',
    /^\/emissions\/([^/]+)\/override$/,
    ({ s, m, body }) => {
      const a = s.activities.find((x) => x.id === m[1]);
      if (!a) return fail(404, 'NOT_FOUND', 'Not found');
      applyOverride(s, a, body);
      return json(traceFor(s, a));
    },
  ],
  [
    'DELETE',
    /^\/emissions\/([^/]+)\/override$/,
    ({ s, m }) => {
      const a = s.activities.find((x) => x.id === m[1]);
      if (!a) return fail(404, 'NOT_FOUND', 'Not found');
      revertOverride(s, a);
      return json(traceFor(s, a));
    },
  ],

  // reports
  ['GET', /^\/reports\/formats$/, () => json(FORMATS)],
  [
    'GET',
    /^\/reports$/,
    ({ s }) => {
      // Seeded reports get their PDF the first time the list is shown.
      for (const r of s.reports)
        if (r.status === 'ready' && !hasDemoReportUrl(r.id))
          void makeReportBlob(s, r).then((b) => registerDemoReportUrl(r.id, URL.createObjectURL(b)));
      return json(s.reports);
    },
  ],
  [
    'POST',
    /^\/reports$/,
    ({ s, body }) => {
      const unit = s.orgUnits.find((u) => u.id === body.orgUnitId);
      const fmt = FORMATS.find((f) => f.code === body.format);
      if (!unit || !fmt) return fail(422, 'INVALID', 'Choose a business unit and a format.');
      const r = {
        id: nextId(s, 'demo-report'),
        orgUnitId: unit.id,
        orgUnitName: unit.name,
        format: fmt.code,
        formatName: fmt.name,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        status: 'queued' as const,
        error: null as string | null,
        createdAt: new Date().toISOString(),
        generatedAt: null as string | null,
      };
      s.reports.unshift(r);
      setTimeout(() => (r.status = 'generating' as never), 600);
      void makeReportBlob(s, r)
        .then((b) => {
          registerDemoReportUrl(r.id, URL.createObjectURL(b));
          r.status = 'ready' as never;
          r.generatedAt = new Date().toISOString();
        })
        .catch(() => {
          r.status = 'failed' as never;
          r.error = 'Could not generate the report in the browser.';
        });
      return json(r, 202);
    },
  ],
  [
    'GET',
    /^\/reports\/([^/]+)$/,
    ({ s, m }) => {
      const r = s.reports.find((x) => x.id === m[1]);
      return r ? json(r) : fail(404, 'NOT_FOUND', 'Not found');
    },
  ],
  ['DELETE', /^\/reports\/([^/]+)$/, ({ s, m }) => ((s.reports = s.reports.filter((r) => r.id !== m[1])), empty())],

  // assistant
  [
    'POST',
    /^\/assistant\/chat$/,
    async ({ s, body }) => {
      let cid: string = body.conversationId;
      if (!cid) {
        cid = nextId(s, 'demo-conv');
        s.conversations.unshift({
          id: cid,
          title: String(body.message).slice(0, 48),
          updatedAt: new Date().toISOString(),
        });
      }
      const list = s.messages.get(cid) ?? [];
      list.push(msg(nextId(s, 'demo-msg'), 'user', body.message));
      const a = answer(s, String(body.message));
      const reply: ChatMessage = msg(nextId(s, 'demo-msg'), 'assistant', a.content, a.chart, a.sources);
      list.push(reply);
      s.messages.set(cid, list);
      await new Promise((r) => setTimeout(r, 700));
      return json({ conversationId: cid, message: reply, suggestions: SUGGESTIONS.slice(0, 4) });
    },
  ],
  ['GET', /^\/assistant\/conversations$/, ({ s }) => json(s.conversations)],
  ['GET', /^\/assistant\/conversations\/([^/]+)\/messages$/, ({ s, m }) => json(s.messages.get(m[1]!) ?? [])],
  ['POST', /^\/assistant\/reindex$/, () => json({ indexed: 0 })],
];

/** Fake API: answers every SDK call from the in-browser store. Nothing leaves the page. */
export async function handleDemoRequest(request: Request): Promise<Response> {
  const url = new URL(request.url, window.location.origin);
  const path = url.pathname.replace(/^.*?\/api(?=\/|$)/, '') || '/';
  const method = request.method.toUpperCase();
  const s = getState();
  for (const [m, pattern, fn] of ROUTES) {
    if (m !== method) continue;
    const match = path.match(pattern);
    if (!match) continue;
    let body: unknown = undefined;
    if (!['GET', 'DELETE', 'HEAD'].includes(method) || request.headers.get('content-type')?.includes('json'))
      body = await request
        .clone()
        .json()
        .catch(() => undefined);
    try {
      return await fn({ s, q: url.searchParams, body: body ?? {}, m: match, req: request });
    } catch (e) {
      if (e instanceof DemoError) return fail(e.status, e.code, e.message);
      throw e;
    }
  }
  return fail(404, 'NOT_FOUND', `Demo mode does not implement ${method} ${path}`);
}
