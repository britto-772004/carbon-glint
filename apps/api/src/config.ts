import { z } from 'zod';

/** Treat `FOO=` (empty) the same as unset, so .env templates can leave values blank. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  /** Bind address: localhost on the VM (behind Caddy); 0.0.0.0 inside containers. */
  HOST: optional(z.string().min(1).default('127.0.0.1')),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Postgres connection string (local docker in dev, native Postgres on the VM in production). */
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().default('redis://127.0.0.1:6379'),
  /** Public base URL of the web app (used in email links). */
  APP_URL: z.url().default('http://localhost:5173'),
  /** Root directory for uploaded files and generated reports. */
  FILES_DIR: z.string().min(1).default('./.data/files'),
  /** SMTP relay. When SMTP_HOST is unset, emails are logged instead of sent. */
  SMTP_HOST: optional(z.string().min(1).optional()),
  SMTP_PORT: optional(z.coerce.number().int().positive().default(587)),
  SMTP_USER: optional(z.string().min(1).optional()),
  SMTP_PASS: optional(z.string().min(1).optional()),
  MAIL_FROM: optional(z.string().min(1).default('Carbon Glint <no-reply@carbon-glint.local>')),
  GEMINI_API_KEY: optional(z.string().min(1).optional()),
  GEMINI_MODEL: optional(z.string().min(1).default('gemini-2.5-flash')),
  /** Comma-separated list of allowed origins. Empty = same-origin only (Firebase Hosting rewrite). */
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  /** Key for hashing session/verification/invite tokens. Must be set (64+ chars) in production. */
  SESSION_SECRET: optional(z.string().min(16).default('dev-only-insecure-session-secret')),
  APP_VERSION: optional(z.string().default(process.env.npm_package_version ?? '0.0.0')),
});

export type Config = z.infer<typeof EnvSchema>;

const assertProductionSafe = (c: Config) => {
  if (c.NODE_ENV === 'production' && c.SESSION_SECRET.startsWith('dev-only')) {
    throw new Error('Invalid environment configuration:\n✖ SESSION_SECRET must be set in production');
  }
  return c;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  return assertProductionSafe(parsed.data);
}
