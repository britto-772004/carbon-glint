# Carbon Glint 🌿

**Open-source ESG audit platform for carbon accounting.** Measure Scope 1, 2 and 3 emissions across every business
unit, match activities to public emission factors with full traceability, and export country-format ESG reports.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-0f766e.svg)](LICENSE)

## Features

- **Companies and users:** work-email sign-up with verification, onboarding (industry, size, business units, links),
  invitations, a "forgot password" flow, and a global super-admin console.
- **Org units:** a parent/child business-unit tree in React Flow (drag a unit onto another to re-parent it) plus a table view.
- **Activity Definitions:** classified by GHG Protocol scope and category, with recommendations per industry and custom categories.
  Upload **CSV/XLSX**, pick the sheet and header row, then map columns **with AI (Gemini)** or manually. Rows are validated on import
  (numbers, units, business units, dates). A sample Excel template and a visual guide are included.
- **Emission factor library:** a verified importer for the **UK DESNZ/DEFRA** conversion factors (2,600+ factors, Open
  Government Licence) and a generic CSV importer for others (ADEME, US EPA, India CEA, Australia NGA, Singapore EMA…).
- **Calculation engine:** full-text and trigram search, then Gemini picks among the real candidates (it never produces numbers),
  then a deterministic calculation: `quantity × unit conversion × factor`.
- **Traceability and overrides:** a GHG traceability tree for every activity, and overrides by library factor, custom factor or
  custom result, each with a mandatory reason, audit history and revert.
- **Lasagne heatmap and dashboard:** drill down by scope → category → definition → activity (or by business unit), with
  KPIs, a scope trend, top emitters and a business-unit tree with roll-ups.
- **Reports:** polished PDFs for **India BRSR**, **NIRF/NAAC annex** (colleges), **US GHG Protocol / SB 253**,
  **UAE climate law**, **Saudi Tadawul**, **Australia AASB S2 / NGER** and **Singapore SGX (IFRS S2)**.
- **AI assistant:** RAG over pgvector plus tenant-scoped data tools. It answers with sources and **charts**.

> Reports follow the published framework structures but are **not assured**. Have them reviewed by an ESG / compliance
> professional before filing.

## Run it anywhere (Docker)

Public images: `ghcr.io/britto-772004/carbon-glint-api` and `ghcr.io/britto-772004/carbon-glint-web` (amd64 and arm64).

```bash
git clone https://github.com/britto-772004/carbon-glint.git && cd carbon-glint
cp deploy/docker/.env.example deploy/docker/.env         # set POSTGRES_PASSWORD, SESSION_SECRET, SUPERADMIN_*, GEMINI_API_KEY, SMTP_*
docker compose -f deploy/docker/compose.yaml --env-file deploy/docker/.env up -d
open http://localhost:8080
```

The `setup` service runs migrations, downloads the DEFRA factor library from GOV.UK, and creates the super admin.
To try it without an SMTP server, add `--profile mail`, set `SMTP_HOST=mailpit` and `SMTP_PORT=1025`, and read emails at
http://localhost:8025. Put HTTPS in front (a load balancer, Caddy/Traefik or Cloudflare Tunnel) for production.

Load other factor databases (CSV columns: `external_id,name,category,scope,region,unit,co2e_per_unit[,co2_per_unit,ch4_per_unit,n2o_per_unit]`):

```bash
docker compose -f deploy/docker/compose.yaml --env-file deploy/docker/.env run --rm -v "$PWD/cea.csv:/tmp/f.csv" api \
  node dist/import-factors.js csv --file /tmp/f.csv --code CEA_V20 --publisher "Central Electricity Authority" \
  --name "CO2 Baseline Database v20" --year 2025 --licence "Public" --url https://cea.nic.in
```

A low-cost single-VM deployment (GCP e2-micro, pm2, Cloudflare Tunnel, Terraform, CI/CD over SSH) is in
[apps/infra/README.md](apps/infra/README.md).

## Tech stack

Contract-first TypeScript monorepo: a **React** web app and a **Node/Express** API, both driven by one **OpenAPI** spec.

| Layer    | Tech                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Contract | OpenAPI 3.1 (`packages/api-spec/openapi.yaml`)                            |
| SDK      | `@hey-api/openapi-ts` → fetch client + TanStack Query hooks               |
| API      | Express 5, express-openapi-validator, Drizzle, BullMQ, Gemini, react-pdf  |
| Web      | React 19, Vite, Material UI (Livvic), TanStack Query, React Flow, ECharts |
| Data     | PostgreSQL 18 (+ pgvector, pg_trgm), Redis 8                              |

```
packages/
  api-spec/   openapi.yaml + generated types (the backend uses these)
  sdk/        generated client SDK (the frontend uses ONLY this)
apps/
  api/        Express API: controller → service → repository → model; worker; PDF reports
  web/        React app: containers (state + SDK) / components (props + MUI)
  infra/      Terraform + VM scripts (GCP e2-micro)
deploy/docker Self-host compose stack
```

## Architecture rules

### 1. The OpenAPI spec is the only source of truth

- **No hand-written routes.** `express-openapi-validator` reads `openapi.yaml`, mounts every path, and
  resolves each operation to a controller by `operationId` (`apps/api/src/openapi/resolver.ts`).
- **No hand-written DTOs.** Requests are validated against the spec (400 on mismatch); responses are
  validated in non-prod so drift fails loudly. Controller types are derived from the spec:
  `Controller<'getHealth'>` gives typed `req.params`, `req.query`, `req.body` and `res.json()`.
- **Every operation needs a controller.** `Controllers` is a mapped type over all `operationId`s,
  so adding an operation without a controller is a compile error.
- **The frontend never defines API types or calls `fetch`.** It imports functions and types from
  `@carbon-glint/sdk`, generated from the same spec. ESLint enforces this.

### 2. Backend: controller → service → repository → model

| Layer      | Folder             | Responsibility                                                                                |
| ---------- | ------------------ | --------------------------------------------------------------------------------------------- |
| Controller | `src/controllers`  | call one service method, set the status code, `try/catch` → `next(err)`                       |
| Service    | `src/services`     | business logic; calls repositories (+ Gemini); maps models → spec DTOs; throws `DomainError`s |
| Repository | `src/repositories` | data access; takes and returns **models only**                                                |
| Model      | `src/models`       | Drizzle table definitions + inferred row types                                                |

`src/errors/error-handler.ts` is the one place errors become HTTP status codes (`NotFoundError` → 404, etc.).
The import boundaries between layers are enforced by ESLint.

### 3. Frontend: container / component

|                                  | Containers (`src/containers`) | Components (`src/components`)              |
| -------------------------------- | ----------------------------- | ------------------------------------------ |
| State, effects, SDK calls        | ✅                            | ❌ (lint error)                            |
| Markup                           | Only renders its component    | ✅ props → JSX, conditional rendering only |
| Imports from `@carbon-glint/sdk` | ✅                            | `import type` only                         |

### Adding an endpoint

1. Add the path + schemas to `packages/api-spec/openapi.yaml` (with an `operationId`).
2. `pnpm generate` — regenerates backend types and the frontend SDK.
3. Add model → repository → service → controller in `apps/api/src/`, and register the controller in
   `controllers/index.ts` (typecheck tells you). See `.claude/skills/backend/SKILL.md`.
4. Consume it in a web container via `useQuery(<operationId>Options())` / the SDK function.

## Local development

Requirements: Node 22+ (24 recommended, see `.nvmrc`), pnpm 10, Docker.

```bash
pnpm install
pnpm db:up                          # local Postgres :5432, Redis :6379, Mailpit :8025
cp apps/api/.env.example apps/api/.env   # add GEMINI_API_KEY if needed
pnpm dev                            # generate + API on :8080 + web on :5173
```

The web dev server proxies `/api/**` to the API, mirroring Caddy in production. Local emails appear in Mailpit at http://localhost:8025.

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

Everything runs on **one GCP e2-micro VM**, natively, with no containers. The API and worker run under pm2, alongside
Postgres 18, Redis 8, Caddy (serving the web app and proxying `/api`), and a Cloudflare Tunnel for HTTPS. Pushing to `main` runs CI, then GitHub Actions
SSHes into the VM and activates the new release. Setup guide: [apps/infra/README.md](apps/infra/README.md).
