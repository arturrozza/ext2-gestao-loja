# AGENTS.md

Store management system: a mobile app (Expo) and an API (Bun + Elysia) in a Bun monorepo.
**Online-first** (no offline sync) and **single-tenant** (a single store).

This file is the source of truth for agents (Claude Code, Codex, Cursor...). `CLAUDE.md` only imports it.
Each app has its own `AGENTS.md` with app-specific rules:

- [`apps/server/AGENTS.md`](apps/server/AGENTS.md) — API (Elysia + Drizzle + Postgres)
- [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md) — app (Expo + NativeWind + TanStack Query)

## Rule #1: check the official docs before acting

Before installing, configuring or using an API from any tool in the stack, **read its current official docs**.
Don't trust memory or training data: Expo, Drizzle (1.0 RC) and Elysia change fast. Use the install commands and
layout the docs recommend. If you have to deviate, document why in [`docs/stack.md`](docs/stack.md)
("Restrições conhecidas"). Links to every tool's docs are in the table there.

## Stack

| Layer | Tech |
| --- | --- |
| Monorepo / runtime | Bun (workspaces + catalog, `hoisted` linker) |
| API | Elysia, Drizzle ORM 1.0 RC (`bun-sql`), PostgreSQL 18, Zod |
| API tests | `bun test` (unit + e2e with Eden Treaty) |
| App | Expo SDK 57 (Expo Router), NativeWind 4 (Tailwind 3), TanStack Query 5, Zod |
| HTTP client | Eden Treaty (`@elysia/eden`), types inferred from the API |
| Lint/format | Biome (root config) |
| Git hooks | Husky: pre-commit runs `biome format`, commit-msg runs commitlint (Conventional Commits) |
| Infra (local) | Docker Compose: postgres + server |

## Layout

```
.env(.example)   single env file for the whole repo; .env.test holds test overrides
apps/server/     API (@ext2/server), with its own Dockerfile
apps/mobile/     Expo app (@ext2/mobile)
packages/        shared packages (create only when code is actually shared)
docs/            architecture, stack, conventions, testing + features/ (specs), in pt-BR
```

## Commands (from the repo root)

```bash
bun install            # install everything
cp .env.example .env   # first time only
bun run up             # docker compose: postgres + server (build, migrate, start) on :3000
bun run down           # stop the containers
bun run db:up          # only postgres (for running the server locally with hot reload)
bun run dev:server     # API with watch on :3000 (don't run together with the Docker server)
bun run dev:mobile     # Expo dev server
bun run check          # Biome lint + format + imports (read-only)
bun run check:fix      # Biome with safe fixes
bun run format         # Biome format on everything (what the pre-commit hook runs)
bun run typecheck      # tsc in every workspace
bun run test           # API tests (unit + e2e; needs postgres up)
```

App-specific commands (migrations, e2e, expo install...) are in each app's `AGENTS.md`.

## Global rules

- **Bun only.** No npm/yarn/pnpm/npx; use `bun`, `bun run`, `bunx`. In the app, add deps with `bunx expo install`.
- **Shared versions go in the catalog** of the root `package.json` (`"pkg": "catalog:"`). Any dependency used by more
  than one workspace belongs there (e.g. `zod`, `elysia`, `typescript`).
- **Single `.env` at the root.** Don't create `.env` files inside the apps. New variables go in `.env.example` and in
  the app's validated `env` module.
- **Strict TypeScript** everywhere. No `any` and no `!` without a justification comment.
- **Biome is the law.** Default config + `noExcessiveCognitiveComplexity` as an **error, max 10**. If a function goes
  over, split it; don't use `biome-ignore` to dodge the rule.
- **Definition of done:** `bun run check`, `bun run typecheck` and `bun run test` pass.
- **Validation:** Elysia `t` for API HTTP contracts; Zod for env, domain rules `t` doesn't cover, and app forms.
- **Features:** read the spec in `docs/features/` before implementing. If there is no spec, ask; don't invent
  requirements.
- **Language:** code, commits and `AGENTS.md` in English. Docs (`docs/`, `README.md`) and user-facing app text
  in pt-BR.
- **Conventional Commits, always**, scoped by module/feature: `feat(products): add product listing`,
  `fix(sales): round totals`, `chore(deps): bump biome`. Enforced by commitlint on `commit-msg`.
  **Never mention Claude/AI in commits or PRs**: no `Co-Authored-By` trailers, no "Generated with" lines.
- **File names are kebab-case** (enforced by Biome `useFilenamingConvention`). Role suffixes use a dot:
  `products.controller.ts`, `home.screen.tsx`.
- **Named exports only.** No `export default` unless a tool requires it (Expo Router routes in `apps/mobile/src/app`
  and `*.config.*` files). Enforced by Biome `noDefaultExport`.
- **Keep the docs current:** if you change the architecture, stack, a convention or the test strategy, update the
  matching file in `docs/` in the same change.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — how the pieces fit, env, Docker
- [`docs/stack.md`](docs/stack.md) — tools, versions, official docs links, known constraints
- [`docs/conventions.md`](docs/conventions.md) — naming, code style, validation, data, git
- [`docs/testing.md`](docs/testing.md) — test strategy
- [`docs/features/`](docs/features/) — feature specs ([template](docs/features/_template.md))
