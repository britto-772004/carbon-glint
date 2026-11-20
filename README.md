# Carbon Glint

Contract-first TypeScript monorepo: **React** web app + **Node/Express** API, driven by a single **OpenAPI** spec.

| Layer    | Tech                                                        | Deployed to      |
| -------- | ----------------------------------------------------------- | ---------------- |
| Contract | OpenAPI 3.1 (`packages/api-spec/openapi.yaml`)              | —                |
| SDK      | `@hey-api/openapi-ts` → fetch client + TanStack Query hooks | —                |
| API      | Express 5, express-openapi-validator, Drizzle, Gemini       | Google Cloud Run |
| Web      | React 19, Vite, TanStack Query                              | Firebase Hosting |
| Database | Postgres (Docker locally, **Neon** in deployed envs)        | Neon             |

```
packages/
  api-spec/   openapi.yaml + generated types (backend uses these)
  sdk/        generated client SDK (frontend uses ONLY this)
apps/
  api/        Express API — routes + DTO validation come from openapi.yaml
  web/        React app — containers / components
```

## Architecture rules

### 1. The OpenAPI spec is the only source of truth

- **No hand-written routes.** `express-openapi-validator` reads `openapi.yaml`, mounts every path, and
  resolves each operation to a handler by `operationId` (`apps/api/src/openapi/resolver.ts`).
- **No hand-written DTOs.** Requests are validated against the spec (400 on mismatch); responses are
  validated in non-prod so handler drift fails loudly. Handler types are derived from the spec:
  `OperationHandler<'getHealth'>` gives typed `req.params`, `req.query`, `req.body` and `res.json()`.
- **Every operation needs a handler.** `OperationHandlers` is a mapped type over all `operationId`s,
  so adding an operation without a handler is a compile error.
- **The frontend never defines API types or calls `fetch`.** It imports functions and types from
  `@carbon-glint/sdk`, generated from the same spec. ESLint enforces this.

### 2. Frontend: container / component

|                                  | Containers (`src/containers`) | Components (`src/components`)              |
| -------------------------------- | ----------------------------- | ------------------------------------------ |
| State, effects, SDK calls        | ✅                            | ❌ (lint error)                            |
| Markup                           | Only renders its component    | ✅ props → JSX, conditional rendering only |
| Imports from `@carbon-glint/sdk` | ✅                            | `import type` only                         |

### Adding an endpoint

1. Add the path + schemas to `packages/api-spec/openapi.yaml` (with an `operationId`).
2. `pnpm generate` — regenerates backend types and the frontend SDK.
3. Add the handler in `apps/api/src/handlers/` and register it in `handlers/index.ts` (typecheck tells you).
4. Consume it in a web container via `useQuery(<operationId>Options())` / the SDK function.

## Local development

Requirements: Node 22+ (24 recommended, see `.nvmrc`), pnpm 10, Docker.

```bash
pnpm install
pnpm db:up                          # local Postgres on :5432
cp apps/api/.env.example apps/api/.env   # add GEMINI_API_KEY if needed
pnpm dev                            # generate + API on :8080 + web on :5173
```

The web dev server proxies `/api/**` to the API, mirroring the Firebase Hosting rewrite in production.

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `pnpm generate`    | OpenAPI → backend types + client SDK                      |
| `pnpm lint`        | Redocly spec lint + ESLint (incl. architecture rules)     |
| `pnpm typecheck`   | `tsc --noEmit` across the workspace                       |
| `pnpm test`        | Vitest (API via supertest, web via Testing Library)       |
| `pnpm build`       | generate + build everything                               |
| `pnpm db:generate` | Drizzle: diff `apps/api/src/db/schema.ts` → SQL migration |
| `pnpm db:migrate`  | Apply migrations to `$DATABASE_URL`                       |

Generated code (`**/src/generated/`) is git-ignored and rebuilt by `pnpm generate`.

## Deployment

- **Web → Firebase Hosting.** `/api/**` is rewritten to the Cloud Run service, so the browser talks to
  one origin (no CORS).
- **API → Cloud Run**, built from `apps/api/Dockerfile`. Secrets (`DATABASE_URL`, `GEMINI_API_KEY`) come
  from Secret Manager.
- **Database → Neon.** Migrations run in CI before the API deploys.

CI (`.github/workflows/ci.yml`) runs on every PR. Pushing to `main` runs CI → migrate → deploy API → deploy web
(`.github/workflows/deploy.yml`), authenticating to GCP keylessly via Workload Identity Federation.

One-time cloud setup: see [docs/deployment.md](docs/deployment.md).
