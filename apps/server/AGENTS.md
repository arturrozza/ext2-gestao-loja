# AGENTS.md — server (`@ext2/server`)

API on Bun + Elysia + Drizzle ORM (1.0 RC, `bun-sql` driver) + PostgreSQL. Read the [root `AGENTS.md`](../../AGENTS.md) too.

Official docs (check before using an API):
- Elysia: https://elysiajs.com/llms.txt — best practices: https://elysiajs.com/essential/best-practice.md
- Drizzle 1.0: https://orm.drizzle.team/docs/get-started/bun-sql-new (the 0.x API is different; ignore old examples)
- Bun: https://bun.sh/docs

## Commands (from `apps/server`)

All scripts load the root `.env` via `--env-file=../../.env` (test scripts add `../../.env.test`).

```bash
bun run dev               # watch src/index.ts
bun run typecheck
bun run test              # everything (unit + e2e), needs postgres (`bun run db:up` at the root)
bun run test:unit         # src/**/*.test.ts only
bun run test:e2e          # migrates the test DB, then runs test/e2e
bun run db:generate       # generate a migration from the schema
bun run db:migrate        # apply migrations to the dev DB
bun run db:studio         # Drizzle Studio
```

Docker: `apps/server/Dockerfile` (build context = repo root). On start the container runs `src/db/migrate.ts` and
then `src/index.ts`. Use `bun run up` at the root.

## Structure

```
src/
  index.ts            starts the server (the only place that calls .listen)
  app.ts              builds the Elysia app and exports `type App` (used by Eden in mobile)
  env.ts              env validated with Zod; never read process.env anywhere else
  db/
    index.ts          Drizzle client
    migrate.ts        applies migrations at runtime (Docker)
    schema/           tables (one file per domain) + index.ts re-exporting everything
  modules/<module>/               one folder per module, e.g. modules/products/
    <module>.controller.ts        Elysia instance with the module's routes (prefixed), exported as `<module>Controller`
    <module>.service.ts           business logic, decoupled from Elysia (`<Module>Service`)
    <module>.model.ts             `t` schemas for request/response + derived types (`<Module>Model`)
    <module>.service.test.ts      unit tests next to the code
test/e2e/             end-to-end tests, one file per module (<module>.e2e.test.ts)
drizzle/              generated migrations (don't hand-edit, except custom migrations)
Dockerfile
```

## Rules

### Elysia
- One folder per module in `src/modules/<module>`, with `<module>.controller.ts`, `<module>.service.ts` and
  `<module>.model.ts` (see `src/modules/health`). Add other role files the same way when needed
  (e.g. `products.errors.ts`).
- Controller = one `new Elysia({ prefix })` per module, exported as `<module>Controller` and registered in `app.ts`
  with `.use()`. No barrel `index.ts` in modules.
- **Always chain** Elysia methods (`new Elysia().get(...).post(...)`). Without chaining type inference breaks and
  Eden loses the types in mobile.
- Don't pass the whole `Context` to services; destructure only what you need (`({ body, params }) => ...`).
- Request-independent services are plain objects (`export const XService = { ... }`). No static-only classes:
  Biome blocks them (`noStaticOnlyClass`).
- Every route declares `body`/`query`/`params` **and** `response` with schemas from `<module>.model.ts`.
- Types come from the schemas (`UnwrapSchema<typeof Model.x>`). Don't declare duplicate interfaces.
- The server uses **relative** imports (no path aliases) so Eden can resolve its types from mobile.

### Validation (`t` vs Zod)
- HTTP contracts: Elysia `t` (generates OpenAPI and is the fastest in Elysia).
- Zod: `env.ts`, domain rules `t` doesn't express well (e.g. CPF/CNPJ, cross-field refinements) and schemas shared
  with mobile. Elysia accepts Zod in routes directly (Standard Schema), so mixing is fine.

### Drizzle / database
- Every table uses `snakeCase.table(...)` (from `drizzle-orm/pg-core`): camelCase in TS, snake_case in the DB.
- Spread `...timestamps` (`src/db/schema/helpers.ts`) in every table.
- Every schema file must be re-exported from `src/db/schema/index.ts`.
- Changed the schema? Run `bun run db:generate` and **commit the migration** with it. Never `drizzle-kit push` to a
  shared/production DB.
- Money: `numeric` (never `real`/`double`). Dates: `timestamp({ withTimezone: true })`.

### Tests
- Unit: `*.test.ts` next to the code, no database.
- E2E: `test/e2e/*.e2e.test.ts` via Eden's `treaty(app)` against `ext2_test`.
- Every new route gets at least one success e2e and one validation-error e2e.
- More in [`docs/testing.md`](../../docs/testing.md).

### Env
- New variables: add to `src/env.ts` (Zod) and the root `.env.example` (and `.env.test` if tests need an override).
  If the Docker server needs it, add it to the `server` service in `docker-compose.yml`.
