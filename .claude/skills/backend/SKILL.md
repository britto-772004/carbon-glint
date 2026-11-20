---
name: backend
description: Build or change the Carbon Glint API (apps/api) and its OpenAPI contract (packages/api-spec). Use whenever adding or editing an endpoint, request/response shape, controller, service, repository, model/table, migration, Gemini call, or API test. The OpenAPI spec is the single source of truth for routes and DTOs; code is layered controller → service → repository → model.
---

# Backend: contract-first, layered API

Stack: Express 5 · express-openapi-validator · TypeScript (ESM, NodeNext) · Drizzle + `pg` (local Postgres / Neon) · Gemini (`@google/genai`) · Vitest + supertest. Deployed to Cloud Run.

## Architecture

```
openapi.yaml ──(routes + request/response validation)──▶ express-openapi-validator
                                                          │ operationId
                                                          ▼
 CONTROLLER  src/controllers/*.controller.ts   call ONE service method → res.status(code).json(dto); catch → next(err)
      │
      ▼
 SERVICE     src/services/*.service.ts         business logic; calls repositories + deps.ai; model → DTO; throws DomainErrors
      │
      ▼
 REPOSITORY  src/repositories/*.repository.ts  data access only; takes/returns MODELS (or primitives / null)
      │
      ▼
 MODEL       src/models/*.model.ts             Drizzle tables + inferred row types. Nothing else.
```

Composition root: `src/server.ts` wires `createRepositories(db)`, then `createServices({ repositories, ai, config })`, then `createApp({ services })`, which calls `createControllers(services)`. No layer imports a singleton. Everything is passed in, which is what makes each layer testable on its own.

### Layer rules (ESLint enforces the import boundaries)

| Layer          | Owns                                                                        | May import                                                                                            | Must NOT                                                                                                    |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Controller** | HTTP: status codes, forwarding errors                                       | services, `openapi/types`                                                                             | repositories, models, db, drizzle, Gemini; business logic; building DTOs by hand                            |
| **Service**    | business rules, orchestration, model → DTO mapping, throwing `DomainError`s | repositories, `deps.ai`, `deps.config`, `errors/domain-errors`, spec types (`Schemas`), model _types_ | Express, `drizzle-orm`/SQL, `db/`, controllers                                                              |
| **Repository** | queries and writes for one aggregate                                        | models, `db/client` (type `Database`), `drizzle-orm`                                                  | DTOs/spec types, Express, services, domain errors. Return `null` for "not found" and let the service decide |
| **Model**      | table definitions, `$inferSelect`/`$inferInsert` types                      | `drizzle-orm/pg-core`                                                                                 | everything else                                                                                             |

## Non-negotiable rules

1. **The spec comes first.** Every endpoint starts as an edit to `packages/api-spec/openapi.yaml`.
2. **No hand-written routes.** Never `app.get/post` or `express.Router()` for API endpoints. Routes exist because the spec declares them; `src/openapi/resolver.ts` maps each `operationId` to a controller.
3. **No hand-written DTOs or request validation.** No zod/joi for bodies, params or query. The validator returns 400 on bad input and checks responses outside production. DTO types come from the spec: `Controller<'opId'>` for controllers and `Schemas['Name']` (from `@carbon-glint/api-spec`) in services.
4. **One controller per operationId**, registered in `src/controllers/index.ts`. The `Controllers` type fails typecheck if one is missing.
5. **Controllers are thin.** They call one service method, set the status code, and wrap the call in `try/catch` with `next(err)`. Nothing else.
6. **Errors:** services throw `DomainError` subclasses from `src/errors/domain-errors.ts` (`NotFoundError` 404, `ConflictError` 409, `UnauthorizedError` 401, `ForbiddenError` 403, `BusinessRuleError` 422, `UpstreamError` 502). `src/errors/error-handler.ts` is the single place errors become HTTP status codes and the spec's `Error` body. A new error type means a new subclass plus a line in `DOMAIN_STATUS`. Unknown errors become a 500 that hides the details.

## Spec conventions (`openapi.yaml`)

- OpenAPI 3.1. `servers: [{ url: /api }]`, so paths are written **without** `/api`.
- Every operation needs a camelCase verb-first `operationId` (`listProjects`, `createProject`, `getProjectById`), `tags`, `summary`, its success response(s), each domain error status it can return (404/409/422…, `$ref: '#/components/responses/Error'`), and `default: { $ref: '#/components/responses/Error' }`.
- Put schemas in `components/schemas`, in PascalCase, with `additionalProperties: false` and an explicit `required` list.
- Request bodies get their own schema (`CreateProjectRequest`). Don't reuse the response schema.
- Constrain inputs in the spec (`format: uuid`, `minLength`, `maxLength`, `minimum`, `enum`, `pattern`). That _is_ the validation layer.
- Lists are paginated: `limit` and `cursor` query params, and a response of `{ items: [...], nextCursor: string | null }`.
- Check with `pnpm --filter @carbon-glint/api-spec lint`.

## Recipe: add an endpoint (example: `getProjectById`)

1. **Spec:** add the path, operation and schemas. Lint them, then run `pnpm generate`. This regenerates the backend types and the frontend SDK.

2. **Model:** `src/models/project.model.ts`, then re-export it from `src/models/index.ts`.

   ```ts
   import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

   export const projects = pgTable('projects', {
     id: uuid().primaryKey().defaultRandom(),
     name: text().notNull(),
     createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
   });
   export type ProjectModel = typeof projects.$inferSelect;
   export type NewProjectModel = typeof projects.$inferInsert;
   ```

   Run `pnpm db:generate`, review the SQL in `apps/api/drizzle/`, and commit it. Never edit an applied migration.

3. **Repository:** `src/repositories/project.repository.ts`, then add it to `Repositories` in `repositories/index.ts`.

   ```ts
   import { eq } from 'drizzle-orm';
   import type { Database } from '../db/client.js';
   import { projects, type NewProjectModel, type ProjectModel } from '../models/index.js';

   export interface ProjectRepository {
     findById(id: string): Promise<ProjectModel | null>;
     create(data: NewProjectModel): Promise<ProjectModel>;
   }

   export const createProjectRepository = (db: Database): ProjectRepository => ({
     async findById(id) {
       const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
       return row ?? null;
     },
     async create(data) {
       const [row] = await db.insert(projects).values(data).returning();
       return row!;
     },
   });
   ```

   For multi-statement writes that must be atomic, add a repository method that uses `db.transaction(async (tx) => …)` internally.

4. **Service:** `src/services/project.service.ts`, then add it to `Services` in `services/index.ts`.

   ```ts
   import type { Schemas } from '@carbon-glint/api-spec';
   import type { ProjectModel } from '../models/index.js';
   import { NotFoundError } from '../errors/domain-errors.js';
   import type { ServiceDeps } from './index.js';

   type Project = Schemas['Project'];

   export interface ProjectService {
     getById(id: string): Promise<Project>;
   }

   const toProjectDto = (m: ProjectModel): Project => ({
     id: m.id,
     name: m.name,
     createdAt: m.createdAt.toISOString(),
   });

   export const createProjectService = ({ repositories }: ServiceDeps): ProjectService => ({
     async getById(id) {
       const project = await repositories.project.findById(id);
       if (!project) throw new NotFoundError(`Project ${id} not found`);
       return toProjectDto(project);
     },
   });
   ```

5. **Controller:** `src/controllers/project.controller.ts`, then register it in `controllers/index.ts`.

   ```ts
   import type { Services } from '../services/index.js';
   import type { Controller } from '../openapi/types.js';

   export const getProjectById =
     ({ project }: Services): Controller<'getProjectById'> =>
     async (req, res, next) => {
       try {
         res.status(200).json(await project.getById(req.params.id));
       } catch (err) {
         next(err);
       }
     };
   ```

   For creates, use `res.status(201)`. For deletes, `res.status(204).end()`.

6. **Fakes:** add the new repository to `fakeRepositories()` in `test/helpers/fakes.ts` (with a `vi.fn` per method).
7. **Tests** for every layer you touched (next section), then the definition-of-done commands.

## Gemini

- Use `deps.ai` (`AiClient` in `src/lib/gemini.ts`), and only from services. Add capabilities such as structured JSON output or streaming as methods on `AiClient`. Never import `@google/genai` elsewhere.
- Wrap provider failures in `UpstreamError` (502).
- The model comes from `GEMINI_MODEL`, and the key from Secret Manager in production.
- Firebase Hosting → Cloud Run times out at 60 s. Keep calls under that, or use the Cloud Run URL directly for streaming.

## Testing (required for every change)

| Layer          | Test location                                            | Real                                          | Faked                                          | Run                                                 |
| -------------- | -------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| **Service**    | `test/unit/services/*.service.test.ts`                   | service logic                                 | repositories, AI                               | `pnpm test`                                         |
| **Controller** | `test/unit/controllers/*.controller.test.ts`             | HTTP, OpenAPI validation, controller, service | repositories (or a service, to force an error) | `pnpm test`                                         |
| **Contract**   | `test/unit/contract.test.ts`                             | spec ↔ controllers ↔ validation               | —                                              | `pnpm test`, covers every operationId automatically |
| **Repository** | `test/integration/repositories/*.repository.int.test.ts` | SQL on **real Postgres**                      | —                                              | `pnpm test:integration`                             |
| **End-to-end** | `test/integration/*.int.test.ts`                         | everything down to Postgres                   | AI                                             | `pnpm test:integration`                             |

Helpers:

- `createTestServices({ repositories?, ai?, config? })` returns real services over `fakeRepositories()`, plus the fakes, so you can assert calls.
- `createTestApp({ repositories?, services?, ai?, config?, controllers? })` returns the real app and `api` (supertest). Pass `services: { x: { method: async () => { throw new NotFoundError('…') } } }` to test error mapping.
- `fakeRepositories({ project: { findById: vi.fn(async () => null) } })` overrides individual methods. Everything else keeps its defaults.
- `fakeAi(reply)` is a `vi.fn`. **Never call real Gemini in tests.**
- `createTestDatabase()` and `resetDatabase()` come from `test/integration/db.ts`. Call `resetDatabase` in `beforeEach`. The database name must end in `_test`, which guards against pointing at Neon. Migrations run once in `global-setup.ts`. Locally, run `pnpm db:up` first. CI provides Postgres.

What to cover:

- **Service:** each business rule and branch, each `DomainError` thrown, model → DTO mapping, and the repository or AI calls made (`toHaveBeenCalledWith`).
- **Controller:** the success status and body, a 400 from spec validation (bad body, param or query), and each domain error status (404/409/422…) with an `{ code, message }` body.
- **Repository:** each query against real rows, including not found (`null`), constraints such as unique and foreign keys, ordering and pagination.

```ts
// test/unit/services/project.service.test.ts
it('throws NotFoundError for a missing project', async () => {
  const { services } = createTestServices({
    repositories: fakeRepositories({ project: { findById: vi.fn(async () => null) } }),
  });
  await expect(services.project.getById('x')).rejects.toBeInstanceOf(NotFoundError);
});

// test/unit/controllers/project.controller.test.ts
it('404 with a spec Error body', async () => {
  const { api } = createTestApp({
    repositories: fakeRepositories({ project: { findById: vi.fn(async () => null) } }),
  });
  const res = await api.get(`/api/projects/${crypto.randomUUID()}`).expect(404);
  expect(res.body.code).toBe('NOT_FOUND');
});
```

Reference implementations: the `health` slice (`system.repository` → `health.service` → `health.controller`) and its tests.

## Definition of done

Run from the repo root. All must pass:

```bash
pnpm generate
pnpm --filter @carbon-glint/api-spec lint
pnpm --filter @carbon-glint/api typecheck
pnpm --filter @carbon-glint/api lint          # includes layer-boundary rules
pnpm --filter @carbon-glint/api test
pnpm db:up && pnpm test:integration           # whenever models/repositories changed
pnpm --filter @carbon-glint/web typecheck     # the SDK changed, so the web app must still compile
```

If the spec changed, follow the **frontend** skill to consume the new SDK functions.
