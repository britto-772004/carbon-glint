import type { Readable } from 'node:stream';
import type { Schemas } from '@carbon-glint/api-spec';
import { BusinessRuleError, ConflictError, NotFoundError } from '../errors/domain-errors.js';
import type { ReportModel } from '../models/index.js';
import { findFormat, REPORT_FORMATS } from '../reports/formats.js';
import { buildReportData } from '../reports/report-data.js';
import { renderReportPdf } from '../reports/report-document.js';
import { flattenOrgTree } from './org-tree-order.js';
import { applyFilters } from './emission-aggregates.js';
import type { EmissionFactRow } from '../repositories/calculation.repository.js';
import type { ServiceDeps } from './index.js';
import { subtreeIds } from './org-unit.service.js';
import { requireTenantId } from './tenant.service.js';
import type { Actor } from './types.js';

export interface ReportService {
  formats(): Schemas['ReportFormat'][];
  list(actor: Actor): Promise<Schemas['Report'][]>;
  get(actor: Actor, id: string): Promise<Schemas['Report']>;
  create(actor: Actor, input: Schemas['CreateReportRequest']): Promise<Schemas['Report']>;
  remove(actor: Actor, id: string): Promise<void>;
  download(actor: Actor, id: string): Promise<{ stream: Readable; fileName: string }>;
  /** Worker entrypoint (`report.generate`). */
  generate(job: { tenantId: string; reportId: string }): Promise<void>;
}

export const createReportService = ({ repositories: repos, jobs, files }: ServiceDeps): ReportService => {
  const toDto = async (r: ReportModel): Promise<Schemas['Report']> => {
    const unit = await repos.orgUnits.findById(r.tenantId, r.orgUnitId);
    return {
      id: r.id,
      orgUnitId: r.orgUnitId,
      orgUnitName: unit?.name ?? '—',
      format: r.format,
      formatName: findFormat(r.format)?.name ?? r.format,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      status: r.status,
      error: r.error,
      createdAt: r.createdAt.toISOString(),
      generatedAt: r.generatedAt ? r.generatedAt.toISOString() : null,
    };
  };
  const load = async (tenantId: string, id: string) => {
    const r = await repos.reports.findById(tenantId, id);
    if (!r) throw new NotFoundError('Report not found.');
    return r;
  };

  return {
    formats: () =>
      REPORT_FORMATS.map(({ code, name, region, framework, description }) => ({
        code,
        name,
        region,
        framework,
        description,
      })),

    async list(actor) {
      return Promise.all((await repos.reports.list(requireTenantId(actor))).map(toDto));
    },

    async get(actor, id) {
      return toDto(await load(requireTenantId(actor), id));
    },

    async create(actor, input) {
      const tenantId = requireTenantId(actor);
      if (!findFormat(input.format)) throw new BusinessRuleError('Unknown report format.', { code: 'UNKNOWN_FORMAT' });
      if (!(await repos.orgUnits.findById(tenantId, input.orgUnitId))) {
        throw new BusinessRuleError('Business unit not found.', { code: 'UNKNOWN_ORG_UNIT' });
      }
      if (input.periodEnd < input.periodStart)
        throw new BusinessRuleError('Period end is before period start.', { code: 'INVALID_PERIOD' });
      const r = await repos.reports.create({ tenantId, ...input, createdBy: actor.userId });
      await jobs.enqueue('report.generate', { tenantId, reportId: r.id });
      return toDto(r);
    },

    async remove(actor, id) {
      const tenantId = requireTenantId(actor);
      const r = await load(tenantId, id);
      await repos.reports.delete(tenantId, id);
      if (r.fileKey) await files.remove(r.fileKey);
    },

    async download(actor, id) {
      const r = await load(requireTenantId(actor), id);
      if (r.status !== 'ready' || !r.fileKey)
        throw new ConflictError('The report is not ready yet.', { code: 'REPORT_NOT_READY' });
      const unit = await repos.orgUnits.findById(r.tenantId, r.orgUnitId);
      const slug = `${r.format}-${unit?.code ?? 'bu'}-${r.periodStart}_${r.periodEnd}`.replace(/[^\w.-]+/g, '_');
      return { stream: files.read(r.fileKey), fileName: `carbon-glint-${slug}.pdf` };
    },

    async generate({ tenantId, reportId }) {
      const r = await repos.reports.findForJob(reportId);
      if (!r || r.tenantId !== tenantId) return;
      await repos.reports.update(r.id, { status: 'generating', error: null });
      try {
        const format = findFormat(r.format)!;
        const [tenant, units, facts] = await Promise.all([
          repos.tenants.findById(tenantId),
          repos.orgUnits.listByTenant(tenantId),
          repos.calculations.listFacts(tenantId),
        ]);
        const ids = subtreeIds(units, r.orgUnitId);
        const rows = applyFilters(facts, {
          orgUnitIds: ids,
          from: r.periodStart,
          to: r.periodEnd,
        }) as EmissionFactRow[];
        const root = units.find((u) => u.id === r.orgUnitId)!;
        const data = buildReportData(rows, {
          companyName: tenant?.tenant.name ?? '',
          orgUnitName: root.name,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          formatName: format.name,
          framework: format.framework,
          boundary: flattenOrgTree(
            units.filter((u) => ids.has(u.id)),
            r.orgUnitId,
          ),
        });
        const pdf = await renderReportPdf(data, format);
        const fileKey = `tenants/${tenantId}/reports/${r.id}.pdf`;
        await files.put(fileKey, pdf);
        await repos.reports.update(r.id, { status: 'ready', fileKey, generatedAt: new Date() });
      } catch (err) {
        await repos.reports.update(r.id, {
          status: 'failed',
          error: err instanceof Error ? err.message.slice(0, 500) : 'Report failed',
        });
        throw err;
      }
    },
  };
};
