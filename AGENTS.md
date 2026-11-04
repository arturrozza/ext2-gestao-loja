# AGENTS.md

Store management system: a mobile app (Expo) and an API (Bun + Elysia) in a Bun monorepo.
**Online-first** (no offline sync) and **store-scoped**: every business table has a `store_id` taken from the session,
but the MVP runs a single store with a single user (see `docs/architecture.md`).

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
| Git hooks | Husky: pre-commit runs lint-staged (`biome check --write` on staged files) + typecheck, commit-msg runs commitlint |
| Infra (local) | Docker Compose: postgres + server |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`); server deployed to Railway from the `production` branch (IaC in `.railway/railway.ts`) |

## Layout

```
.env(.example)   single env file for the whole repo; .env.test holds test overrides
apps/server/     API (@ext2/server), with its own Dockerfile
apps/mobile/     Expo app (@ext2/mobile)
packages/        shared packages (create only when code is actually shared)
docs/            architecture, stack, conventions, testing, in pt-BR
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
bun run build:android  # EAS cloud build of the client APK (production profile)
bun run build:ios      # EAS cloud build, iOS ad hoc (production profile)
bun run build:ios:testflight  # EAS cloud build for TestFlight, auto-submitted to App Store Connect
bun run check          # Biome lint + format + imports (read-only)
bun run check:fix      # Biome with safe fixes
bun run format         # Biome format on everything
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
- **Features:** business rules come from the user. If a requirement is unclear, ask; don't invent requirements.
- **Language:** code, commits and `AGENTS.md` in English. Docs (`docs/`, `README.md`) and user-facing app text
  in pt-BR.
- **Conventional Commits, always**, scoped by module/feature: `feat(products): add product listing`,
  `fix(sales): round totals`, `chore(deps): bump biome`. Enforced by commitlint on `commit-msg`.
  **Never mention Claude/AI in commits or PRs**: no `Co-Authored-By` trailers, no "Generated with" lines.
- **File names are kebab-case** (enforced by Biome `useFilenamingConvention`). Role suffixes use a dot:
  `products.controller.ts`, `home.screen.tsx`.
- **Named exports only.** No `export default` unless a tool requires it (Expo Router routes in `apps/mobile/src/app`
  and `*.config.*` files). Enforced by Biome `noDefaultExport`.
- **Branches:** work lands on `main` via PRs (no deploy). Releases are PRs `main → production`, merged with a merge
  commit (never squash); Railway deploys `production` only after CI passes. Never push or commit to `production`
  directly. Both branches are protected by rulesets (PR only, CI checks required): always work on a branch and open a
  PR with `gh pr create`; ask the user before merging. The `/pr-main` and `/release-prod` skills run these flows
  (running one is the go-ahead to merge). See `docs/conventions.md` (Git).
- **Railway infra is code** (`.railway/railway.ts`, Infrastructure as Code). Never change it through the dashboard.
  Edit the file in a PR: the `Railway config` workflow comments the plan on the PR and applies it when the
  release PR (`main → production`) is merged. Don't run `railway config apply` by hand. Anything omitted from the file
  (resources, variables) is deleted on apply, so always read the plan. A new server env var also goes in
  the service `env` there. See `docs/architecture.md` (CI/CD).
- **Keep the docs current:** if you change the architecture, stack, a convention or the test strategy, update the
  matching file in `docs/` in the same change.

## Work tracking

Tasks, ideas and bugs live in Linear (workspace `mundomadam`, team `Mundomadam`, key `MUN`), not in GitHub Issues.
Use the project-local MCP connection `linear-ext2` (`mcp__linear-ext2__*`); the user-level `linear` connection points
to another workspace, never use it here. A task's id goes in the branch (`feat/mun-12-products-listing`) and the PR
(`Closes MUN-12`). When work on a task starts, move it to `In Progress` and assign it to the maintainer if unassigned.
A `Closes` PR merged into `main` moves the task to `Waiting for Release`; it goes to `Done` only once the release that
carries it is live. Linear's GitHub automation on merge must point at `Waiting for Release`, never `Done`.
Skills: `/start-mundomadam` lists open tasks easiest first, `/pr-main` ships a branch to `main`, `/release-prod` ships
`main` to `production`.

## Docs

- [`docs/getting-started.md`](docs/getting-started.md) — onboarding: fork, tool install, running everything locally
- [`docs/architecture.md`](docs/architecture.md) — how the pieces fit, env, Docker
- [`docs/stack.md`](docs/stack.md) — tools, versions, official docs links, known constraints
- [`docs/conventions.md`](docs/conventions.md) — naming, code style, validation, data, git
- [`docs/testing.md`](docs/testing.md) — test strategy
- [`docs/decisions.md`](docs/decisions.md) — decision log (what was decided and why), newest first
