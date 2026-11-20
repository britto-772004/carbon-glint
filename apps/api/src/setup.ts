import { spawnSync } from 'node:child_process';

/**
 * Container one-shot setup: migrations → emission factor library (DEFRA, skipped if loaded) → super admin seed.
 * Factor import failures (e.g. no internet) are warnings, not fatal.
 */
const run = (args: string[], fatal = true) => {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.status !== 0 && fatal) process.exit(r.status ?? 1);
  return r.status === 0;
};

run(['dist/migrate.js']);

const year = Number(process.env.DEFRA_YEAR ?? new Date().getUTCFullYear());
const loaded =
  run(['dist/import-factors.js', 'defra', '--year', String(year), '--skip-if-present'], false) ||
  run(['dist/import-factors.js', 'defra', '--year', String(year - 1), '--skip-if-present'], false);
if (!loaded) console.warn('WARN: could not load DEFRA emission factors — run import-factors later.');

run(['dist/seed-superadmin.js']);
console.log('Setup complete.');
