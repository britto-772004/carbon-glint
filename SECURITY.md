# Security policy

Please **do not** open public issues for security problems. Report them privately through
GitHub's "Report a vulnerability" (Security → Advisories) on this repository. We aim to respond within 5 working days.

## Built-in protections

- Work-email sign-up with email verification; argon2id password hashes; rate limits on sign-up, sign-in and password emails.
- Server-side sessions in Redis behind an httpOnly, SameSite=Lax cookie (Secure when served over HTTPS), plus an origin check on state-changing requests.
- Tenant isolation is enforced in every repository query and tested at the HTTP and SQL levels.
- Request and response validation against the OpenAPI contract.
- The AI assistant only uses read-only, tenant-scoped tools. Retrieved text is treated as data, and the model never writes SQL or produces emission factor values.

## Operator responsibilities

- Set strong `SESSION_SECRET` and `POSTGRES_PASSWORD` values and keep them out of version control.
- Serve over HTTPS (Cloudflare Tunnel, a load balancer or a reverse proxy).
- Back up the database: `apps/infra/scripts/backup.sh` runs nightly on the reference VM.
- "Forgot password" emails a new password by design. Ask users to change it after signing in (the app prompts them).
