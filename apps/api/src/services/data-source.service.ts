import { randomUUID } from 'node:crypto';
import { buffer } from 'node:stream/consumers';
import type { Schemas } from '@carbon-glint/api-spec';
import { BusinessRuleError, ConflictError, NotFoundError } from '../errors/domain-errors.js';
import { heuristicMapping, MAPPING_FIELDS, sanitizeMapping, type MappingField } from '../lib/column-mapping.js';
import { detectType, parseSpreadsheet, type ParsedSheet } from '../lib/spreadsheet.js';
import type { ColumnMapping, DataSourceModel } from '../models/index.js';
import { missingRequired, validateRows } from './activity-import.js';
import type { ServiceDeps } from './index.js';
import { toDataSourceDto } from './mappers.js';
import { requireTenantId } from './tenant.service.js';
import type { Actor } from './types.js';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_ROWS = 100_000;
const PREVIEW_ROWS = 20;

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

export interface DataSourceService {
  upload(actor: Actor, activityDefinitionId: string, file: UploadedFile | undefined): Promise<Schemas['DataSource']>;
  get(actor: Actor, id: string): Promise<Schemas['DataSource']>;
  updateLayout(
    actor: Actor,
    id: string,
    input: Schemas['UpdateDataSourceLayoutRequest'],
  ): Promise<Schemas['DataSource']>;
  suggestMapping(actor: Actor, id: string): Promise<Schemas['MappingSuggestion']>;
  startImport(actor: Actor, id: string, input: Schemas['ImportDataSourceRequest']): Promise<Schemas['DataSource']>;
  /** Worker entrypoint for the `datasource.import` job. */
  runImport(job: { tenantId: string; dataSourceId: string; onlyValidRows: boolean }): Promise<void>;
  remove(actor: Actor, id: string): Promise<void>;
}

const AI_MAPPING_SCHEMA = {
  type: 'object',
  properties: {
    mapping: {
      type: 'object',
      properties: Object.fromEntries(MAPPING_FIELDS.map((f) => [f, { type: 'string', nullable: true }])),
      required: [...MAPPING_FIELDS],
    },
    confidence: {
      type: 'object',
      properties: Object.fromEntries(MAPPING_FIELDS.map((f) => [f, { type: 'number' }])),
      required: [...MAPPING_FIELDS],
    },
    reasoning: { type: 'string' },
  },
  required: ['mapping', 'confidence', 'reasoning'],
};

const FIELD_HELP: Record<MappingField, string> = {
  description: 'what the activity is (e.g. "Diesel for DG set", "Flight BLR-DXB") — REQUIRED',
  measure: 'the numeric quantity consumed / travelled / purchased — REQUIRED',
  unit: 'unit of the measure (kWh, L, kg, t, km, passenger.km…) — REQUIRED',
  location: 'site / city / country / route',
  periodStart: 'start date of the activity period (or a single date / month)',
  periodEnd: 'end date of the activity period',
  spend: 'money spent (numeric)',
  currency: 'currency code of the spend',
};

export const createDataSourceService = ({ repositories: repos, jobs, files, ai }: ServiceDeps): DataSourceService => {
  const load = async (tenantId: string, id: string) => {
    const ds = await repos.dataSources.findById(tenantId, id);
    if (!ds) throw new NotFoundError('Data source not found.');
    return ds;
  };

  const parseStored = async (
    ds: DataSourceModel,
    opts: { sheetName?: string | null; headerRow?: number },
  ): Promise<ParsedSheet> => parseSpreadsheet(await buffer(files.read(ds.fileKey)), ds.fileType, opts);

  const layoutFields = (p: ParsedSheet) => ({
    sheets: p.sheets,
    sheetName: p.sheetName,
    headerRow: p.headerRow,
    columns: p.columns,
    preview: p.rows.slice(0, PREVIEW_ROWS),
    rowCount: p.rows.length,
  });

  return {
    async upload(actor, adId, file) {
      const tenantId = requireTenantId(actor);
      const ad = await repos.activityDefinitions.findById(tenantId, adId);
      if (!ad) throw new NotFoundError('Activity Definition not found.');
      if (ad.definition.status === 'archived') {
        throw new BusinessRuleError('Archived definitions can’t receive new data.', { code: 'DEFINITION_ARCHIVED' });
      }
      if (!file) throw new BusinessRuleError('Attach a CSV or XLSX file.', { code: 'FILE_REQUIRED' });
      const type = detectType(file.originalname);
      if (!type) throw new BusinessRuleError('Only .csv and .xlsx files are supported.', { code: 'UNSUPPORTED_FILE' });
      if (file.size > MAX_UPLOAD_BYTES)
        throw new BusinessRuleError('Files must be 20 MB or smaller.', { code: 'FILE_TOO_LARGE' });

      let parsed: ParsedSheet;
      try {
        parsed = await parseSpreadsheet(file.buffer, type);
        // For workbooks, start on the first sheet that actually has a table.
        for (const name of parsed.sheets) {
          if (parsed.rows.length > 0 && parsed.columns.length >= 2) break;
          parsed = await parseSpreadsheet(file.buffer, type, { sheetName: name });
        }
      } catch {
        throw new BusinessRuleError('We couldn’t read this file. Is it a valid CSV/XLSX?', { code: 'UNREADABLE_FILE' });
      }
      if (parsed.rows.length > MAX_ROWS) {
        throw new BusinessRuleError(`Files can have at most ${MAX_ROWS.toLocaleString()} rows.`, {
          code: 'TOO_MANY_ROWS',
        });
      }

      const id = randomUUID();
      const safeName = file.originalname.replace(/[^\w.-]+/g, '_').slice(-120);
      const fileKey = `tenants/${tenantId}/data-sources/${id}/${safeName}`;
      await files.put(fileKey, file.buffer);
      const row = await repos.dataSources.create({
        id,
        tenantId,
        activityDefinitionId: adId,
        fileKey,
        fileName: file.originalname,
        fileType: type,
        fileSize: file.size,
        ...layoutFields(parsed),
      });
      return toDataSourceDto(row);
    },

    async get(actor, id) {
      return toDataSourceDto(await load(requireTenantId(actor), id));
    },

    async updateLayout(actor, id, input) {
      const ds = await load(requireTenantId(actor), id);
      if (ds.status === 'importing') throw new ConflictError('An import is running.', { code: 'IMPORT_RUNNING' });
      if (input.sheetName && !ds.sheets.includes(input.sheetName)) {
        throw new BusinessRuleError(`Sheet "${input.sheetName}" not found.`, { code: 'UNKNOWN_SHEET' });
      }
      const parsed = await parseStored(ds, {
        sheetName: input.sheetName ?? ds.sheetName,
        ...(input.headerRow ? { headerRow: input.headerRow } : {}),
      });
      const updated = await repos.dataSources.update(ds.id, { ...layoutFields(parsed), mapping: null });
      return toDataSourceDto(updated!);
    },

    async suggestMapping(actor, id) {
      const ds = await load(requireTenantId(actor), id);
      const heuristic = heuristicMapping(ds.columns);
      if (!ai.available) {
        return { ...heuristic, source: 'heuristic', reasoning: 'Matched by column names (AI not configured).' };
      }
      try {
        const sample = [ds.columns, ...ds.preview.slice(0, 15)].map((r) => r.join(' | ')).join('\n');
        const prompt = [
          'Map spreadsheet columns to GHG activity-data fields for a carbon accounting import.',
          'Fields:',
          ...MAPPING_FIELDS.map((f) => `- ${f}: ${FIELD_HELP[f]}`),
          'Rules: use exact column names from the header; each column at most once; null if no column fits;',
          'confidence 0–1 per field; keep reasoning to one or two sentences.',
          '',
          'Header and sample rows (pipe-separated):',
          sample,
        ].join('\n');
        const out = await ai.generateJson<{
          mapping: Record<string, unknown>;
          confidence: Record<string, number>;
          reasoning: string;
        }>(prompt, AI_MAPPING_SCHEMA);
        const mapping = sanitizeMapping(out.mapping ?? {}, ds.columns);
        const confidence = Object.fromEntries(
          MAPPING_FIELDS.map((f) => [f, mapping[f] ? Math.min(1, Math.max(0, Number(out.confidence?.[f] ?? 0.5))) : 0]),
        );
        return { mapping, confidence, source: 'ai', reasoning: String(out.reasoning ?? '').slice(0, 1000) };
      } catch (err) {
        const why = err instanceof Error ? err.message.replace(/\s+/g, ' ').slice(0, 120) : 'unknown error';
        return {
          ...heuristic,
          source: 'heuristic',
          reasoning: `The AI service didn't respond (${why}), so the columns were matched by name. Please review them below.`,
        };
      }
    },

    async startImport(actor, id, input) {
      const tenantId = requireTenantId(actor);
      const ds = await load(tenantId, id);
      if (ds.status === 'importing')
        throw new ConflictError('An import is already running.', { code: 'IMPORT_RUNNING' });
      const mapping = sanitizeMapping(input.mapping, ds.columns);
      const unknown = MAPPING_FIELDS.filter((f) => input.mapping[f] && !mapping[f]);
      if (unknown.length) {
        throw new BusinessRuleError(`Mapped columns not found in the sheet: ${unknown.join(', ')}.`, {
          code: 'UNKNOWN_COLUMNS',
        });
      }
      const missing = missingRequired(mapping);
      if (missing.length) {
        throw new BusinessRuleError(`Map the required fields: ${missing.join(', ')}.`, { code: 'MAPPING_INCOMPLETE' });
      }
      const updated = await repos.dataSources.update(ds.id, {
        mapping,
        mappingMode: input.mappingMode,
        status: 'importing',
        errors: [],
        errorCount: 0,
      });
      await jobs.enqueue('datasource.import', {
        tenantId,
        dataSourceId: ds.id,
        onlyValidRows: input.onlyValidRows ?? false,
      });
      return toDataSourceDto(updated!);
    },

    async runImport({ tenantId, dataSourceId, onlyValidRows }) {
      const ds = await repos.dataSources.findForJob(dataSourceId);
      if (!ds || ds.tenantId !== tenantId || !ds.mapping) return;
      const ad = await repos.activityDefinitions.findById(tenantId, ds.activityDefinitionId);
      if (!ad) return;
      try {
        const parsed = await parseStored(ds, { sheetName: ds.sheetName, headerRow: ds.headerRow });
        // The sheet carries no business unit: use the definition's, else the company's HQ / top-level unit.
        const units = await repos.orgUnits.listByTenant(tenantId);
        const orgUnitId =
          ad.definition.defaultOrgUnitId ??
          (units.find((u) => u.type === 'hq') ?? units.find((u) => !u.parentId) ?? units[0])?.id ??
          null;
        const outcome = validateRows(parsed.columns, parsed.rows, parsed.rowNumbers, ds.mapping as ColumnMapping, {
          tenantId,
          activityDefinitionId: ad.definition.id,
          dataSourceId: ds.id,
          orgUnitId,
          periodStart: ad.definition.periodStart,
          periodEnd: ad.definition.periodEnd,
        });
        const abort = outcome.errorCount > 0 && !onlyValidRows;
        const imported = abort
          ? 0
          : await repos.transaction((tx) => tx.activities.replaceForDataSource(ds.id, outcome.valid));
        await repos.dataSources.update(ds.id, {
          status: abort ? 'failed' : 'imported',
          importedCount: imported,
          errorCount: outcome.errorCount,
          errors: outcome.errors,
          importedAt: abort ? ds.importedAt : new Date(),
        });
        if (!abort && ad.definition.status === 'published') {
          await jobs.enqueue('calculation.run', { tenantId, activityDefinitionId: ad.definition.id });
        }
      } catch (err) {
        await repos.dataSources.update(ds.id, {
          status: 'failed',
          errors: [{ row: 0, field: 'file', message: err instanceof Error ? err.message : 'Import failed' }],
          errorCount: 1,
        });
      }
    },

    async remove(actor, id) {
      const tenantId = requireTenantId(actor);
      const ds = await load(tenantId, id);
      await repos.dataSources.delete(tenantId, id);
      await files.remove(ds.fileKey);
    },
  };
};
