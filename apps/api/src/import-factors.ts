import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { findDefraFlatFileUrl, parseDefraFlatFile } from './ef/defra.js';
import { parseGenericFactorCsv } from './ef/generic-csv.js';
import { createEmissionFactorRepository } from './repositories/emission-factor.repository.js';

/**
 * Loads public emission factor databases into the local library (idempotent per source code).
 *   node dist/import-factors.js defra --year 2026            # downloads the official flat file from GOV.UK
 *   node dist/import-factors.js defra --file ./flat.xlsx      # from a local copy
 *   node dist/import-factors.js csv --file ./ademe.csv --code ADEME_23 --publisher ADEME --name "Base Carbone v23" \
 *        --year 2025 --licence "Licence Ouverte v2.0" --url https://base-empreinte.ademe.fr
 */
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    year: { type: 'string' },
    file: { type: 'string' },
    code: { type: 'string' },
    publisher: { type: 'string' },
    name: { type: 'string' },
    licence: { type: 'string' },
    url: { type: 'string' },
    'skip-if-present': { type: 'boolean', default: false },
  },
});

const kind = positionals[0];
const config = loadConfig();
const database = createDatabase(config.DATABASE_URL);
const repo = createEmissionFactorRepository(database.db);

try {
  if (kind === 'defra') {
    const year = Number(values.year ?? new Date().getFullYear());
    if (values['skip-if-present'] && (await repo.listSources()).some((s) => s.code === `DEFRA_${year}`)) {
      console.log(`DEFRA_${year} already loaded — skipping.`);
    } else {
      const url = values.file ? `file://${values.file}` : await findDefraFlatFileUrl(year);
      const data = values.file ? await readFile(values.file) : Buffer.from(await (await fetch(url)).arrayBuffer());
      const dataset = await parseDefraFlatFile(data, {
        url: values.file
          ? 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting'
          : url,
      });
      console.log(`Imported ${await repo.importDataset(dataset)} factors as ${dataset.source.code}.`);
    }
  } else if (kind === 'csv') {
    for (const k of ['file', 'code', 'publisher', 'name', 'year', 'licence', 'url'] as const) {
      if (!values[k]) throw new Error(`--${k} is required for csv imports`);
    }
    const { dataset, errors } = parseGenericFactorCsv(await readFile(values.file!, 'utf8'), {
      code: values.code!,
      publisher: values.publisher!,
      name: values.name!,
      version: values.year!,
      year: Number(values.year),
      licence: values.licence!,
      url: values.url!,
    });
    if (errors.length) console.warn(`Skipped ${errors.length} invalid lines:\n${errors.slice(0, 20).join('\n')}`);
    console.log(`Imported ${await repo.importDataset(dataset)} factors as ${dataset.source.code}.`);
  } else {
    throw new Error('Usage: import-factors <defra|csv> [options]');
  }
} finally {
  await database.close();
}
