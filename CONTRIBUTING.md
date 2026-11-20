# Contributing to Carbon Glint

Thanks for helping! Carbon Glint is a contract-first TypeScript monorepo. Please read the architecture rules
in the [README](README.md#architecture-rules). They are enforced by ESLint and CI.

## Setup

```bash
pnpm install
pnpm db:up                                  # Postgres 18 + pgvector, Redis 8, Mailpit (Docker)
cp apps/api/.env.example apps/api/.env
pnpm --filter @carbon-glint/api db:migrate
pnpm --filter @carbon-glint/api ef:import defra --year 2026   # load the DEFRA factor library
pnpm dev                                    # API :8080, web :5173, emails at http://localhost:8025
```

## Making a change

1. **API change?** Edit `packages/api-spec/openapi.yaml` first, then run `pnpm generate`.
2. Backend: model → repository → service → controller (see `.claude/skills/backend/SKILL.md`).
3. Frontend: container (state + SDK) → component (props + MUI only) (see `.claude/skills/frontend/SKILL.md`).
4. Add tests at every layer you touch. The skills list exactly which.

## Before opening a PR

```bash
pnpm generate && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
pnpm db:up && pnpm test:integration
```

Keep PRs focused, describe the user-visible change, and add a screenshot for UI changes.

## Emission factor data

Only add datasets whose licence allows redistribution and local use (e.g. OGL, Etalab, public domain).
Commercial databases such as ecoinvent must stay out of the repository. Use the generic CSV importer
(`apps/api/src/ef/generic-csv.ts`) with your own licensed copy.

## License

By contributing you agree that your contributions are licensed under the [Apache License 2.0](LICENSE).
