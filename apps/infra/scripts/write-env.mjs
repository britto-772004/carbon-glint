// Prints the production .env for the VM from environment variables (GitHub secrets/vars).
// Values are double-quoted; DATABASE_URL is built with a URL-encoded password.
const env = process.env;
const required = ['POSTGRES_PASSWORD', 'SESSION_SECRET'];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing required secrets: ${missing.join(', ')}`);
  process.exit(1);
}
for (const [k, v] of Object.entries(env)) {
  if (typeof v === 'string' && /[\n"]/.test(v) && k === k.toUpperCase() && !k.startsWith('GITHUB_')) {
    // dotenv values can't safely contain newlines or double quotes
    if (
      [
        'POSTGRES_PASSWORD',
        'SESSION_SECRET',
        'GEMINI_API_KEY',
        'OPENAI_API_KEY',
        'SMTP_PASS',
        'SUPERADMIN_PASSWORD',
      ].includes(k)
    ) {
      console.error(`${k} must not contain newlines or double quotes`);
      process.exit(1);
    }
  }
}

const values = {
  NODE_ENV: 'production',
  PORT: '8080',
  LOG_LEVEL: 'info',
  APP_VERSION: env.RELEASE_ID ?? env.GITHUB_SHA ?? 'unknown',
  APP_URL: env.APP_URL || 'http://localhost',
  POSTGRES_PASSWORD: env.POSTGRES_PASSWORD,
  DATABASE_URL: `postgres://carbon:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:5432/carbon_glint`,
  REDIS_URL: 'redis://127.0.0.1:6379',
  SESSION_SECRET: env.SESSION_SECRET,
  FILES_DIR: '/opt/carbon-glint/shared/files',
  LLM_PROVIDER: env.LLM_PROVIDER || 'gemini',
  LLM_MODEL: env.LLM_MODEL ?? '',
  GEMINI_API_KEY: env.GEMINI_API_KEY ?? '',
  GEMINI_MODEL: env.GEMINI_MODEL || 'gemini-3.8-flash',
  OPENAI_API_KEY: env.OPENAI_API_KEY ?? '',
  OPENAI_MODEL: env.OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_EMBEDDING_MODEL: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  OPENAI_BASE_URL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  OPENAI_EMBEDDING_BASE_URL: env.OPENAI_EMBEDDING_BASE_URL ?? '',
  SMTP_HOST: env.SMTP_HOST ?? '',
  SMTP_PORT: env.SMTP_PORT || '587',
  SMTP_USER: env.SMTP_USER ?? '',
  SMTP_PASS: env.SMTP_PASS ?? '',
  MAIL_FROM: env.MAIL_FROM || 'Carbon Glint <no-reply@carbon-glint.app>',
  SUPERADMIN_EMAIL: env.SUPERADMIN_EMAIL ?? '',
  SUPERADMIN_PASSWORD: env.SUPERADMIN_PASSWORD ?? '',
  CLOUDFLARE_TUNNEL_TOKEN: env.CLOUDFLARE_TUNNEL_TOKEN ?? '',
};

process.stdout.write(
  Object.entries(values)
    .map(([k, v]) => `${k}="${v}"`)
    .join('\n') + '\n',
);
