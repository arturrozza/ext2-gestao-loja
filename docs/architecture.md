# Arquitetura

> Atualize este arquivo sempre que a estrutura ou a forma como as partes conversam mudar.

Sistema de gerenciamento de loja: um app mobile (Expo) conversando com uma API HTTP (Bun + Elysia) sobre PostgreSQL.
Versões e ferramentas: [`stack.md`](stack.md).

- **Online-first:** o app depende da API para ler e gravar. O TanStack Query cuida de cache, retry e refetch quando a
  rede volta (`onlineManager`) ou o app volta pro foreground (`focusManager`). Não existe banco local nem fila de sync.
- **Single-tenant:** uma loja só. Sem colunas de tenant/organização no schema.

## Visão geral

```
┌──────────────────────────┐   HTTP/JSON (Eden Treaty)   ┌──────────────────────────┐      ┌────────────┐
│ apps/mobile (Expo)       │ ──────────────────────────▶ │ apps/server (Elysia)     │ ───▶ │ PostgreSQL │
│ Expo Router + NativeWind │                             │ modules/<feature>        │      │ (Drizzle)  │
│ TanStack Query (cache)   │ ◀── tipos: `type App` ───── │ app.ts exporta App       │      └────────────┘
└──────────────────────────┘                             └──────────────────────────┘
```

## Estrutura do repositório

```
.env / .env.example     env único do repo (server, mobile, docker compose)
.env.test               overrides aplicados sobre o .env pelos scripts de teste do server
docker-compose.yml      postgres + server
docker/                 script de init do postgres (cria o banco ext2_test)
apps/
  server/               @ext2/server — API (com Dockerfile próprio)
  mobile/               @ext2/mobile — app Expo
packages/               pacotes compartilhados (nenhum ainda)
docs/
  architecture.md       este arquivo
  stack.md              ferramentas, versões e restrições conhecidas
  conventions.md        código, validação, dados e git
  testing.md            estratégia de testes
  features/             uma spec por feature (ver _template.md)
```

## Tipos ponta a ponta (Eden Treaty)

1. O server monta o app em `apps/server/src/app.ts` e exporta `export type App = typeof app`.
2. O `package.json` do server expõe `"exports": { ".": "./src/app.ts" }`.
3. O mobile tem `@ext2/server` como devDependency (`workspace:*`) e faz `import type { App } from "@ext2/server"`.
4. `treaty<App>(url)` gera um client com rotas, params, body e respostas tipados.

É um import só de tipo: nenhum código do server entra no bundle do app. Se uma rota mudar, o `bun run typecheck` do
mobile mostra o que quebrou. Para funcionar, é preciso a mesma versão do Elysia nos dois lados (está no catalog),
`strict: true`, métodos do Elysia sempre encadeados e nenhum path alias no server.

## Server

Uma pasta por módulo (`src/modules/<module>`), com `<module>.controller.ts`, `<module>.service.ts` e
`<module>.model.ts`, seguindo a separação controller/service/model do guia de boas práticas do Elysia. Exemplo:

```
src/modules/products/
  products.controller.ts   rotas (instância Elysia com prefixo) → productsController
  products.service.ts      regra de negócio → ProductsService
  products.model.ts        schemas `t` de request/response → ProductsModel
```
 O `app.ts` só compõe os módulos e o `index.ts` só
chama o `listen`, para os testes usarem o `app` sem abrir porta. O `src/db/migrate.ts` aplica as migrations em
runtime (usado pela imagem Docker ao subir).

## Mobile

```
src/
  app/                       rotas do Expo Router: só importam e reexportam a screen (+ _layout.tsx)
  screens/<screen>/
    <screen>.screen.tsx      a screen (ex.: screens/home/home.screen.tsx → HomeScreen)
    partials/                componentes usados SÓ por essa screen
  components/                componentes usados por mais de uma screen
  queries/<module>/          hooks do TanStack Query + query keys, por módulo da API
  lib/                       client da API (Eden), query client, env
  providers/                 providers globais
```

A rota não tem UI: `src/app/index.tsx` faz `import { HomeScreen } from "@/screens/home/home.screen"` e
`export default HomeScreen`. Quando um partial passa a ser usado por outra screen, ele sobe para `src/components/`.
As screens pegam dados pelos hooks de `src/queries/`, nunca chamando o `api` direto.

## Pacotes compartilhados (`packages/`)

Nenhum ainda. Crie um (ex.: `packages/shared` com schemas Zod e constantes de domínio) só quando houver código que
**de fato** precise rodar nos dois apps. Os tipos da API não precisam disso, porque vêm do Eden.

## Variáveis de ambiente

Existe um único `.env`, na raiz (copie do `.env.example`).

- **Docker Compose** lê esse arquivo sozinho.
- **Server:** os scripts passam `--env-file=../../.env`, porque o Bun só carrega `.env` do diretório atual. Os scripts
  de teste também passam `--env-file=../../.env.test`.
- **Mobile:** os scripts rodam o Expo via `bun --env-file=../../.env`. O Expo inlina os `EXPO_PUBLIC_*` que já estão
  no ambiente do processo, então o arquivo da raiz funciona, mesmo o Expo só procurando `.env` dentro do app.
  Builds na nuvem do EAS não enxergam o `.env` da raiz: configure as variáveis com as variáveis de ambiente do EAS.

## Rodando localmente

| Objetivo | Comando |
| --- | --- |
| Stack completa no Docker (postgres + server) | `bun run up` / `bun run down` |
| Server com hot reload | `bun run db:up` e depois `bun run dev:server` (não rode junto com o `server` do Docker: os dois usam a porta 3000) |
| App | `bun run dev:mobile` |

| Recurso | Dev | Teste |
| --- | --- | --- |
| Postgres | `ext2` em localhost:5432 | `ext2_test` (mesmo container) |

A imagem do server (`apps/server/Dockerfile`, com a raiz do repo como contexto de build) instala só as dependências de
produção do server e sobe a API. As migrations não ficam no `CMD`: no compose, o `command` roda `src/db/migrate.ts`
antes de subir; no Railway, elas são o pre-deploy.

## CI/CD

```
feat/x ──PR──▶ main (CI) ──PR de release──▶ production (CI) ──✓──▶ Railway ──▶ pre-deploy: migrations ──▶ deploy ──▶ healthcheck /health
```

### CI: `.github/workflows/ci.yml`

Roda em push e em PRs abertos contra a `main` ou a `production`, com dois jobs:

| Job | O que roda |
| --- | --- |
| `quality` | `biome ci .`, `bun run typecheck` (server + mobile), `expo-doctor` |
| `test` | migrations + `bun run test` (unit + e2e) contra um Postgres 18 de serviço (`ext2_test`) |

A versão do Bun no CI vem do `packageManager` do `package.json` da raiz, a mesma da imagem Docker.

### CD do server: Railway

- **Ambiente:** só `production`, que acompanha a **branch `production`**. Push na `main` não faz deploy: só roda o CI.
  O deploy acontece quando um PR de release (`main → production`) é mergeado. Ver "Branches e releases" em
  [`conventions.md`](conventions.md).
- **Infrastructure as Code:** toda a infra do projeto Railway (service `ext.2`, Postgres, volume, build, deploy,
  variáveis) fica em `.railway/railway.ts` (SDK `railway/iac`). **Não mude nada pelo dashboard**: mude o arquivo e
  aplique (ver abaixo). O formato antigo (`railway.json`, "Config as Code") foi depreciado pelo Railway e não vale
  para services novos.
- **Wait for CI** (`checkSuites: true`): o Railway segura o deploy até o workflow passar. Se o CI falhar, o commit não
  vai para produção.
- **Build:** pelo `apps/server/Dockerfile`, com a raiz do repo como contexto (sem root directory).
- **Watch paths:** só mudanças em `apps/server/**`, `package.json`, `bun.lock` e `bunfig.toml` disparam deploy.
- **Migrations:** o `preDeployCommand` roda `bun src/db/migrate.ts` num container com a imagem nova, antes de trocar a
  versão. Se a migration falhar, o deploy é abortado e a versão anterior continua no ar.
- **Healthcheck:** `/health`. A versão nova só entra no ar se responder; senão, a anterior continua.
- **Banco:** Postgres gerenciado do Railway. O server recebe `DATABASE_URL: Postgres.env.DATABASE_URL` (rede privada).
- **Variáveis:** são gerenciadas pelo arquivo (`variables: { managed: true }`): variável que não estiver lá é apagada no
  apply. O `PORT` é fixado em `3000` (sem isso o Railway
  injeta `8080` e o domínio, que aponta para a 3000, responde 502). Variável nova do server entra em `apps/server/src/env.ts`, no `.env.example` e no
  `env` do service em `.railway/railway.ts`.

#### Alterando a infra

O `apply` é feito pelo GitHub Actions (`.github/workflows/railway-config.yml`, action oficial `railwayapp/config`),
não pelo terminal:

1. Edite `.railway/railway.ts` numa branch e abra um PR para a `main`. O workflow roda o **plan** e comenta no PR o
   que vai mudar no Railway (mudanças destrutivas aparecem marcadas). Revise principalmente as linhas `Delete`:
   **recurso ou variável omitido no arquivo é deletado**.
2. Mergeie na `main`. Nada é aplicado ainda.
3. Na release (PR `main → production`), o workflow roda o plan de novo e, **no merge, aplica exatamente aquele plan**.
   A infra muda junto com o código.

O apply falha de propósito se o Railway mudou entre o plan e o merge (por exemplo, alguém mexeu no dashboard): reabra
ou atualize o PR para gerar um plan novo. O token é o secret `RAILWAY_TOKEN` (project token do ambiente
`production`).

Localmente (CLI logada e linkada: `railway login`, `railway link` na raiz) dá para conferir antes de abrir o PR:

```bash
railway config plan                       # mostra o que vai mudar (não aplica nada)
railway config pull --variables=managed   # só se algo mudou pelo dashboard: traz o estado atual para o arquivo
```

Não rode `railway config apply` na mão, a não ser numa emergência: o normal é aplicar pelo merge da release.

#### Setup inicial (já feito)

1. No dashboard: **New Project → Deploy from GitHub repo** → `gugeldev/ext.2`, e **+ New → Database → PostgreSQL**.
2. Na raiz do repo: `railway link` e `railway config pull --variables=managed` para importar o projeto.
3. Ajustar `.railway/railway.ts` (build, deploy, variáveis), `plan` e `apply`.
4. Gerar o domínio (porta 3000) em **Settings → Networking → Generate Domain** e colocá-lo em
   `networking.serviceDomains` no arquivo. Sem isso, o próximo apply apagaria o domínio.
5. Conferir `https://<domínio>/health` → `{"status":"ok","database":"up"}`.

### Mobile

Ainda sem CD. O app não vai para as lojas: o plano é gerar um `.apk` (EAS Build, perfil com `buildType: apk`) para
mandar ao cliente, possivelmente automatizado no push da `production`. O `EXPO_PUBLIC_API_URL` de um build desses precisa
apontar para o domínio do Railway, não para a máquina local.
