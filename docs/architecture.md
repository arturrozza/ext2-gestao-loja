# Arquitetura

> Atualize este arquivo sempre que a estrutura ou a forma como as partes conversam mudar.

Sistema de gerenciamento de loja: um app mobile (Expo) conversando com uma API HTTP (Bun + Elysia) sobre PostgreSQL.
Versões e ferramentas: [`stack.md`](stack.md).

- **Online-first:** o app depende da API para ler e gravar. O TanStack Query cuida de cache, retry e refetch quando a
  rede volta (`onlineManager`) ou o app volta pro foreground (`focusManager`). Não existe banco local nem fila de sync.
- **Multi-loja no schema, uma loja na prática:** toda tabela de negócio tem `store_id`, e o server descobre a loja
  pela sessão do usuário (nunca por parâmetro vindo do app) e filtra todas as consultas e escritas por ela. O MVP tem
  uma loja. A loja e o primeiro usuário são criados no deploy (seed, ver "Acesso" abaixo); os outros usuários são
  criados no app por quem já está logado. Não existe cadastro aberto nem troca de loja. Para várias
  lojas por usuário no futuro, basta trocar o vínculo usuário → loja por uma tabela de associação.

## Visão geral

```
┌──────────────────────────┐   HTTP/JSON (Eden Treaty)   ┌──────────────────────────┐      ┌────────────┐
│ apps/mobile (Expo)       │ ──────────────────────────▶ │ apps/server (Elysia)     │ ───▶ │ PostgreSQL │
│ Expo Router + NativeWind │                             │ modules/<feature>        │      │ (Drizzle)  │
│ TanStack Query (cache)   │ ◀── tipos: `type App` ───── │ app.ts exporta App       │      └────────────┘
└──────────────────────────┘                             └──────────────────────────┘
```

## Acesso (auth)

Auth própria e enxuta, sem lib: só e-mail e senha, sem cadastro aberto, e-mail ou OAuth. Regras de produto em
[`product/acesso.md`](product/acesso.md).

- **Senha:** argon2id pelo `Bun.password` (sal e parâmetros dentro do hash). E-mail guardado em minúsculas.
- **Sessão:** token opaco de 256 bits, mandado pelo app em `Authorization: Bearer <token>` (RFC 6750). O banco guarda
  só o SHA-256 do token (`sessions.token_hash`). Expira após 30 dias sem uso: cada uso empurra a validade, no máximo
  uma escrita por dia. Sair apaga a sessão; trocar a senha apaga as outras sessões do usuário; desativar um usuário
  apaga as dele.
- **No server:** a macro `auth` (`modules/auth/auth.macro.ts`) protege a rota com `auth: true` e põe a `session` no
  contexto (usuário e loja). A loja de toda consulta vem de `session.store.id`. Sem sessão válida: 401 com
  `WWW-Authenticate: Bearer`. O Elysia valida o body antes do `resolve` da macro, então um body inválido sem sessão
  responde 422, não 401; não vaza dado nenhum (os schemas já estão nos tipos do app).
- **Tentativas:** 5 senhas erradas em 15 minutos bloqueiam aquele e-mail (login) ou aquele usuário (troca de senha)
  até a janela acabar (429 `too_many_attempts`), inclusive para a senha mestra. A tentativa é reservada antes de
  conferir a senha, então requisições em paralelo não passam do limite. No máximo 3 hashes de senha rodam ao mesmo
  tempo (cada um usa ~64 MiB); o excedente recebe 429. Tudo em memória (`auth.rate-limit.ts`), o que basta com uma
  instância só do server; com mais réplicas, teria que ir para o banco ou um Redis.
- **No app:** o token fica no `expo-secure-store` (Keychain/Keystore) e o client Eden manda em toda requisição. Um 401
  (`unauthorized`) em qualquer chamada apaga o token e volta para a tela de entrada.
- **Senha mestra (`MASTER_PASSWORD`):** opcional (vazia = desligada, mínimo 16 caracteres). Entra como qualquer usuário
  ativo e também vale como "senha atual" para trocar a senha (é assim que a equipe redefine uma senha esquecida). A
  sessão fica marcada (`via_master_password`) e o server loga cada uso.
- **Primeiro usuário (seed):** o `src/db/migrate.ts` (pre-deploy no Railway, start no Docker) cria a loja e o primeiro
  usuário a partir de `SEED_STORE_NAME`, `SEED_USER_NAME`, `SEED_USER_EMAIL` e `SEED_USER_PASSWORD` (todas ou nenhuma),
  só enquanto não existe nenhum usuário. Rodar de novo não faz nada. Troque a senha do primeiro usuário no primeiro
  acesso: a `SEED_USER_PASSWORD` continua no Railway e só volta a valer se a tabela de usuários ficar vazia.
- **Erros da API:** sempre `{ code, message, field? }` (`ErrorModel` em `src/lib/http-error.ts`), com `message` em
  pt-BR. Erro de validação vira 422 `validation` com o `field`. Rota inexistente vira 404 `not_found` e JSON
  quebrado vira 400 `invalid_body`. Qualquer outro erro vira 500 `internal` com mensagem genérica: a mensagem original
  nunca sai, e o log guarda só a causa de um erro do Drizzle, porque a mensagem dele traz o SQL e os parâmetros. No app, `request()` (`src/lib/api.ts`) transforma isso
  em `ApiError`.

## Estrutura do repositório

```
.env / .env.example     env único do repo (server, mobile, docker compose)
.env.test               overrides aplicados sobre o .env pelos scripts de teste do server
docker-compose.yml      postgres + server
docker/                 script de init do postgres (cria o banco ext2_test)
apps/
  server/               @ext2/server: API (com Dockerfile próprio)
  mobile/               @ext2/mobile: app Expo
packages/               pacotes compartilhados (nenhum ainda)
docs/
  product/              módulos, regras funcionais, regras de negócio e modelo de dados (fonte da verdade do produto)
  getting-started.md    como rodar o projeto
  architecture.md       este arquivo
  stack.md              ferramentas, versões e restrições conhecidas
  conventions.md        código, validação, dados e git
  testing.md            estratégia de testes
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

### Auditoria

Toda criação, alteração e exclusão nas tabelas de negócio fica registrada em `audit_log`: a tabela, o id do registro, a
ação, quem fez, quando, a linha antes e depois e os campos que mudaram. Quem grava é uma trigger do Postgres
(`audit_row_change`, migration `audit_trigger`), não o código do app, então nenhum caminho de escrita escapa, nem um
`UPDATE` feito à mão.

- **Quem fez:** toda escrita roda dentro de `audited(autor, tx => ...)` (`src/db/audit.ts`), que guarda o autor na
  transação (`set_config('app.actor', ..., true)`). O autor é o id do usuário da sessão ou `"system"` (seed, testes). A
  trigger **recusa** escrita sem autor, então esquecer o `audited()` quebra na hora em vez de gravar sem dono.
- **Segredos:** colunas passadas como argumento da trigger (como `password_hash` em `users`) não são copiadas; a
  alteração aparece só pelo nome em `changed_fields`.
- **Update sem mudança** (só `updated_at`) não gera registro.
- **Só cresce:** o `audit_log` recusa `UPDATE` e `DELETE`.
- **Tabela nova:** a migration dela cria a trigger (`CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON <tabela>
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();`, numa migration custom). Um teste falha se alguma tabela de
  `public` ficar sem ela (exceções: `sessions`, o próprio `audit_log` e tabelas de rascunho dos testes).
- Ainda não há tela para consultar o registro.

### Estoque (livro de movimentações)

O estoque não tem coluna de saldo: o livro de movimentações é a fonte da verdade. A quantidade de um produto é a soma
dos lotes, o valor é a soma das movimentações (`value_change`) e o custo médio é valor ÷ quantidade, calculado quando
precisa e arredondado só para mostrar. Um saldo em coluna poderia divergir do histórico; a soma do livro não diverge.
O custo médio segue a ordem de lançamento (coluna `seq`), não a data informada, para nada já registrado ser
recalculado. A entrada soma o valor exato; a saída tira `custo médio × unidades` arredondado ao centavo, e zerar o
estoque zera o valor, para o erro de arredondamento não acumular. Por isso `quantidade × custo unitário` de uma
movimentação pode diferir 1 centavo do `value_change`, que é o valor que vale. O módulo
`src/modules/stock` não tem rotas; é usado por quem mexe no estoque (compras, vendas, ajustes, correções de custo e os
cancelamentos de compra e de venda). As rotas do estoque ficam em `products` (`products.stock.ts`): o histórico
(`GET /products/:id/movements`), o valor total (`GET /products/stock-value`), o ajuste
(`POST /products/:id/adjustments`) e a correção de custo (`POST /products/:id/cost-corrections`).

- `stock.rules.ts`: as contas puras (custo médio, entrada, saída, limites, estados baixo/sem estoque), testadas sem
  banco.
- `stock.adjustment.ts`: as regras puras do ajuste e da correção de custo (de quais lotes sai, com que valor, o que é
  recusado).
- `stock.queries.ts`: a quantidade (soma de `stock_lots`), a quantidade vendável (lotes sem validade ou dentro dela), o
  valor (soma de `stock_movements.value_change`) e os estados perto de vencer e vencido como SQL correlacionado a
  `products`, usado na lista de produtos e no saldo antes de gravar; a quantidade por validade, os lotes abertos e os
  lotes que uma venda pode levar (`sellableLots`, validade mais próxima primeiro, vencidos fora).
- `stock.ledger.ts`: o único lugar que grava lotes e movimentações, e `sale_item_lots` (de quais lotes cada item de
  venda saiu). O cancelamento de compra zera os lotes dela (recusa se alguma unidade já saiu), e o de venda devolve as
  unidades aos lotes registrados em `sale_item_lots`.
- `stock.errors.ts`: o erro `stock_limit`, quando uma escrita passaria do que o livro guarda.

Quem grava no estoque trava antes os produtos (`lockProducts`, em `products/products.lock.ts`, `FOR UPDATE` em ordem
de id), depois o cliente e a revendedora da venda (`FOR SHARE`, para não serem arquivados no meio) e só depois, se
precisar, a linha da loja (`FOR NO KEY UPDATE`, para o número sequencial da compra ou da venda, `db/numbering.ts`). Essa
ordem evita deadlock e faz duas escritas no mesmo produto entrarem em fila. `stock_movements` só cresce (trigger
`stock_movements_append_only`) e segue a ordem da coluna `seq`. As tabelas de compras e estoque também têm a trigger
de auditoria.

"Hoje" é o dia da loja (`America/Sao_Paulo`, `src/lib/dates.ts`), não o do servidor: decide a data máxima de uma compra
ou venda, o que está vencido e os períodos da lista de vendas.

### Vendas

`src/modules/sales` registra, lê e cancela as vendas (`POST /sales`, `GET /sales`, `GET /sales/:id`,
`POST /sales/:id/cancel`). As regras puras ficam em
`sales.rules.ts` (estoque de cada item, conta do lucro real, períodos), as leituras em `sales.queries.ts` e os totais de
clientes e revendedoras em `sales.totals.ts`, como colunas SQL correlacionadas que `customers` e `resellers` usam. A
venda grava receita, custos e lucro calculados na hora; nada é recalculado depois. A prévia do lucro na tela de nova
venda usa a mesma conta do server, conferida por um teste de paridade.

As rotas que criam compra e venda não têm chave de idempotência: se a resposta se perde depois de a API gravar e o
usuário envia de novo, o registro entra duas vezes. A correção é cancelar o repetido.

### Fotos dos produtos (Cloudflare R2)

- **Fluxo:** o app reduz a foto (JPEG, 1080 px) e manda para `POST /products/photos` (multipart, campo `photo`). A API
  confere pelos bytes (começo e fim do JPEG) que é JPEG de até 2 MB, grava no bucket com uma chave nova
  (`stores/<loja>/products/<uuid>.jpg`, `Content-Type: image/jpeg`) e devolve `{ key }`. Criar ou editar o produto
  manda essa chave em `photoKey` (sem o campo, mantém; `null`, remove); a API confere que a chave é da loja e existe no
  bucket antes de gravar. A resposta do produto traz `photoUrl`, montada com `PHOTOS_PUBLIC_URL`.
- **Só a API escreve no bucket.** Arquivo nunca é sobrescrito nem apagado: trocar a foto grava outra chave. A API
  registra no log quem guardou cada foto (o bucket não guarda autor).
- **Quem vê a foto:** o bucket é público (só leitura, sem listagem): qualquer um com a URL vê a foto, e a proteção é a
  chave ter um UUID impossível de adivinhar e a API só devolver URLs da loja da sessão. Como nada se apaga, uma URL
  que vazar continua valendo. Não guarde ali nada que não possa ser público.
- **Variáveis:** `R2_ENDPOINT` (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`), `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` e `PHOTOS_PUBLIC_URL` (a URL pública do bucket). Todas ou nenhuma: sem elas as
  fotos ficam desligadas (o server avisa ao subir, os produtos vêm sem foto e enviar uma responde 503). Os testes rodam
  assim, com um bucket em memória (`test/support/photo-storage.ts`).
- **Corpo das requisições:** o server recusa (413) corpo acima de 2 MB + 64 KB antes de ler. O envio da foto sem
  nenhum header de sessão leva 401 antes de o corpo ser lido (`tokenBeforeBody`); um token inválido leva o 401 depois
  do corpo, como nas outras rotas.

#### Criando um bucket (dev ou prod)

1. No Cloudflare, **R2 Object Storage → Create bucket**: nome `mundomadam-photos-dev` (ou `-prod`), Location
   Automatic, sem jurisdiction, Standard.
2. No bucket, **Settings → Public Development URL → Enable**, digite `allow`. A URL `https://pub-….r2.dev` é o
   `PHOTOS_PUBLIC_URL`.
3. **R2 Object Storage → Overview → API Tokens: Manage → Create Account API token**: Object Read & Write, só esse
   bucket, TTL Forever. Copie o Access Key ID e o Secret Access Key (64 caracteres, aparece uma vez só) com o botão de
   copiar.
4. O `R2_ENDPOINT` usa o **Account ID** (em Overview → Account Details), não o Access Key ID: os dois têm 32
   caracteres.
5. Dev: preencha as cinco variáveis no `.env` da raiz. Prod: `R2_BUCKET` está no `.railway/railway.ts`; as outras
   quatro são `preserve()` e têm de existir na Railway **antes** do release que as declara, senão o grupo fica pela
   metade e o server não sobe.

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
| App apontando para a API de produção (sem subir o server) | `bun run start:prod`. Os dados são os reais da loja: use para ver tela, não para testar cadastro |

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

Roda em push e em PRs abertos contra a `main` ou a `production`, com quatro jobs:

| Job | O que roda |
| --- | --- |
| `quality` | `biome ci .`, `bun run typecheck` (server + mobile), `expo-doctor` |
| `test` | `bun run test:coverage` (migrations + unit + integração + e2e, com cobertura mínima) contra um Postgres 18 de serviço (`ext2_test`) |
| `server-image` | builda o `apps/server/Dockerfile` (o mesmo que a Railway usa), roda as migrations com a imagem e espera o `/health` responder |
| `eas-update` | só em push na `production`, depois dos três acima: publica o JS/assets do app no channel `production` do EAS Update (ver "Mobile" abaixo) |

A versão do Bun no CI vem do `packageManager` do `package.json` da raiz, a mesma da imagem Docker.

### CD do server: Railway

- **Ambiente:** só `production`, que acompanha a **branch `production`**. Push na `main` não faz deploy: só roda o CI.
  O deploy acontece quando um PR de release (`main → production`) é mergeado. Ver "Branches e releases" em
  [`conventions.md`](conventions.md).
- **Infrastructure as Code:** toda a infra do projeto Railway (service `ext.2`, Postgres, volume, build, deploy,
  variáveis) fica em `.railway/railway.ts` (SDK `railway/iac`). **Não mude nada pelo dashboard**: mude o arquivo e
  aplique (ver abaixo).
- **Wait for CI** (`checkSuites: true`): o Railway segura o deploy até o workflow passar. Se o CI falhar, o commit não
  vai para produção.
- **Build:** pelo `apps/server/Dockerfile`, com a raiz do repo como contexto (sem root directory).
- **Watch paths:** só mudanças em `apps/server/**`, `package.json`, `bun.lock` e `bunfig.toml` disparam deploy.
- **Migrations:** o `preDeployCommand` roda `bun src/db/migrate.ts` num container com a imagem nova, antes de trocar a
  versão. Se a migration falhar, o deploy é abortado e a versão anterior continua no ar.
- **Healthcheck:** `/health`. A versão nova só entra no ar se responder; senão, a anterior continua.
- **Banco:** Postgres gerenciado do Railway. O server recebe `DATABASE_URL: Postgres.env.DATABASE_URL` (rede privada).
- **Variáveis:** são gerenciadas pelo arquivo (`variables: { managed: true }`): variável que não estiver lá é apagada no
  apply. Segredos (`MASTER_PASSWORD`, `SEED_*`) ficam como `preserve()`: o arquivo declara a variável, mas o valor é
  definido uma vez com `railway variables --set` e nunca entra no repo. O `PORT` é fixado em `3000` (sem isso o Railway
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

#### Criando o projeto no Railway (fork)

1. No dashboard: **New Project → Deploy from GitHub repo** → `gugeldev/ext.2`, e **+ New → Database → PostgreSQL**.
2. Na raiz do repo: `railway link` e `railway config pull --variables=managed` para importar o projeto.
3. Ajustar `.railway/railway.ts` (build, deploy, variáveis), `plan` e `apply`.
4. Gerar o domínio (porta 3000) em **Settings → Networking → Generate Domain** e colocá-lo em
   `networking.serviceDomains` no arquivo. Sem isso, o próximo apply apagaria o domínio.
5. Conferir `https://<domínio>/health` → `{"status":"ok","database":"up"}`.

### Mobile: EAS Build + EAS Update

O app não vai para as lojas: é de um cliente só. A instalação é feita com um binário de **distribuição interna**
(Android: `.apk` mandado direto; iOS: build ad hoc para aparelhos cadastrados), e o resto chega por **EAS Update**
(atualização OTA de JS e assets). O projeto Expo fica na organização `mundo-madam` (`owner` e
`extra.eas.projectId` no `apps/mobile/app.json`).

- **Channels:** `preview` (para testar) e `production` (cliente). Cada perfil do `apps/mobile/eas.json` grava o seu
  channel no binário e usa o environment do EAS de mesmo nome.
- **TestFlight (iOS, equipe):** o perfil `testflight` gera build de loja (`"distribution": "store"`) no channel
  `production` e envia para o App Store Connect (`--auto-submit`). Testadores internos (usuários do App Store Connect)
  recebem sem revisão da Apple. O `ascAppId` (id do app no App Store Connect) fica no perfil de submit `testflight`
  do `eas.json`, para o envio funcionar sem modo interativo. Cada build do TestFlight expira em 90 dias: gere outra
  antes disso, mesmo sem mudança nativa. O cliente segue no ad hoc (perfil `production`), que não expira assim.
- **Número de build (iOS):** o App Store Connect rejeita duas builds com o mesmo `buildNumber` na mesma `version`, e o
  `eas.json` usa `"appVersionSource": "local"` sem `autoIncrement`. Uma segunda build do perfil `testflight` na mesma
  versão falha no envio, a menos que o perfil passe para `"appVersionSource": "remote"` com `"autoIncrement": true`.
  O `version` (que define o `runtimeVersion` do OTA) é manual.
- **Criptografia (iOS):** `ios.config.usesNonExemptEncryption: false` no `app.json` (só HTTPS padrão), para a Apple
  não pedir a declaração de exportação a cada build.
- **`runtimeVersion` com policy `appVersion`:** um update só chega a binários com o mesmo `version` do `app.json`.
  Mudança nativa (lib nativa, permissão, config plugin, upgrade de SDK) exige subir o `version` e gerar um binário
  novo. Só JS/assets: basta publicar um update.
- **Variáveis:** builds e updates na nuvem não leem o `.env` da raiz. O `EXPO_PUBLIC_API_URL`
  (`https://mundomadam.up.railway.app`) está nos environments `preview` e `production` do EAS
  (`bunx eas-cli env:list --environment production`).
- **CD:** o job `eas-update` do CI publica no channel `production` a cada push na `production` (merge da release),
  só se os outros jobs passarem. Autentica com o secret `EXPO_TOKEN`, token de um robot (papel Developer) da
  organização. Os apps instalados baixam o update em segundo plano e aplicam no próximo reinício.
- **Versão do Bun:** a imagem de build do EAS vem com um Bun mais antigo, que não lê o `bun.lock`. Cada perfil do
  `eas.json` fixa `"bun"` na mesma versão do `packageManager` do `package.json` raiz. Ao subir o Bun, atualize os dois.
- **Credenciais:** keystore Android e certificados iOS ficam no EAS. Não gere binários com outra chave: o APK novo não
  instalaria por cima do antigo.

Atalhos (da raiz ou de `apps/mobile`), ambos com o perfil `production`:

```bash
bun run build:android   # APK do cliente
bun run build:ios       # iOS ad hoc (precisa do Apple Developer Program e do aparelho cadastrado)
bun run build:ios:testflight  # iOS para o TestFlight (gera e envia para o App Store Connect)
```

Comandos completos (em `apps/mobile`):

```bash
bunx eas-cli build -p android --profile production   # APK do cliente (--profile preview para testar)
bunx eas-cli device:create                           # iOS: cadastrar o aparelho (UDID) antes da build ad hoc
bunx eas-cli build -p ios --profile production       # iOS ad hoc (precisa do Apple Developer Program)
bunx eas-cli update --channel preview --environment preview --message "..."   # update de teste, manual
```

Cota do plano Free: 15 builds Android + 15 iOS por mês e 1.000 usuários ativos/mês de update. Se faltar build,
`--local` gera na máquina (precisa de JDK + Android SDK) com a mesma config e as mesmas credenciais.
