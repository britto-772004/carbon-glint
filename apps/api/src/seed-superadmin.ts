import { parseArgs } from 'node:util';
import { loadConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { hashPassword, isStrongPassword } from './lib/password.js';
import { normalizeEmail } from './lib/work-email.js';
import { users } from './models/index.js';
import { eq } from 'drizzle-orm';

/**
 * Creates the global super admin if it doesn't exist (idempotent; never changes an existing password).
 *   node dist/seed-superadmin.js --email ops@example.com --password '…'
 *   or set SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD (used by the deploy workflow).
 */
const { values } = parseArgs({
  options: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } },
});
const email = normalizeEmail(values.email ?? process.env.SUPERADMIN_EMAIL ?? '');
const password = values.password ?? process.env.SUPERADMIN_PASSWORD ?? '';
const name = values.name ?? 'Super Admin';

if (!email || !password) {
  console.log('SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set — skipping super admin seed.');
  process.exit(0);
}
if (!isStrongPassword(password)) {
  console.error('Super admin password needs at least 10 characters with a letter and a number.');
  process.exit(1);
}

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL);
try {
  const [existing] = await database.db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    console.log(
      existing.role === 'superadmin'
        ? `Super admin ${email} already exists.`
        : `${email} exists as a company user — not promoting.`,
    );
  } else {
    await database.db.insert(users).values({
      email,
      name,
      passwordHash: await hashPassword(password),
      role: 'superadmin',
      status: 'active',
      tenantId: null,
      emailVerifiedAt: new Date(),
    });
    console.log(`Super admin ${email} created.`);
  }
} finally {
  await database.close();
}
