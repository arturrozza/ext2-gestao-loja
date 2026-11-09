# Testes

> Atualize este arquivo sempre que a estratégia ou as ferramentas de teste mudarem.

## Server (`bun test`)

O sistema mexe com dinheiro e estoque: **toda mudança no server vem com testes em todas as camadas que ela toca**, de
preferência escritos antes do código (TDD). Código sem teste não entra.

| Camada | Onde | Banco | Comando (em `apps/server`) |
| --- | --- | --- | --- |
| Unit | `src/**/*.test.ts`, ao lado do código (ex.: `products.service.test.ts`) | nenhum | `bun run test:unit` |
| Integração | `test/integration/<module>.integration.test.ts` | `ext2_test` | `bun run test:integration` |
| E2E | `test/e2e/<module>.e2e.test.ts` | `ext2_test` | `bun run test:e2e` |

- `bun run test` roda tudo, e `bun run test:coverage` roda tudo com cobertura (é o que o CI roda). Os scripts que
  usam banco migram o `ext2_test` antes. Localmente, precisa do Postgres no ar (`bun run db:up` na raiz).
- Os scripts carregam `.env` e, por cima, `.env.test` (na raiz), que aponta o `DATABASE_URL` para o `ext2_test`. O
  banco de teste é criado pelo `docker/postgres-init.sql` no mesmo container do Postgres.
- A config do `bun test` (cobertura) fica no `bunfig.toml` da raiz. Os scripts passam `--config=../../bunfig.toml`,
  porque o Bun só lê o `bunfig.toml` do diretório onde roda.

### O que cada camada cobre

- **Unit:** regras puras, sem banco. Cálculos de dinheiro (custo médio, lucro, descontos, percentuais) e
  arredondamento com casos de borda, validações de domínio e schemas Zod com regra própria.
- **Integração:** services contra o Postgres de verdade, sem HTTP. É onde se prova o que só o banco garante:
  - atomicidade: uma operação com várias escritas (ex.: venda + itens + baixa de estoque) grava tudo ou nada;
  - constraints (unicidade por loja, FKs, `NOT NULL`);
  - concorrência: duas operações simultâneas no mesmo estoque não deixam saldo errado nem negativo;
  - escopo por loja: uma loja não lê nem altera dados de outra.
- **E2E:** as rotas via HTTP, com o `app` em memória e um client Eden tipado. Toda rota tem o caminho feliz, um erro
  de validação (422) e cada erro de domínio.

  ```ts
  import { treaty } from "@elysia/eden";
  import { app } from "../../src/app";

  const api = treaty(app);
  const { data, status } = await api.health.get();
  ```

  Se usar `app.handle(new Request(...))`, a URL precisa ser absoluta (`http://localhost/...`).

### Dados de teste

- Todo arquivo que usa o banco chama `useTestDatabase()` (`test/support/database.ts`): antes de cada teste, todas as
  tabelas do schema `public` são truncadas (`TRUNCATE ... RESTART IDENTITY CASCADE`). O journal de migrations fica no
  schema `drizzle` e não é apagado.
- O reset só roda contra um banco cujo nome termina em `_test`; contra qualquer outro, ele lança erro.
- Cada teste cria os próprios dados e não depende da ordem, pelas factories em `test/support/factories/` (ex.:
  `createProduct(storeId, { ...overrides })`), com padrões válidos e sobrescrita só do que o teste precisa. As
  factories gravam direto no banco, sem as regras do service, dentro de `audited("system", ...)`: a trigger de
  auditoria recusa escrita sem autor, então um `db.insert` solto num teste falha.
- Rotas com login: `signedIn()` (`factories/accounts.ts`) cria loja, usuário e sessão e devolve os `headers` com o
  Bearer para passar ao Eden (`api.users.get({ headers })`) e a `session` que os services de escrita recebem.
- Regra que lança erro de domínio (`httpError`, que não é um `Error`): `thrown(() => ...)` (`test/support/thrown.ts`)
  devolve o que foi lançado, para comparar com `toMatchObject({ code: 422, response: { field } })`.
- Fotos: os testes rodam sem as variáveis do R2 (fotos desligadas). Quem testa foto chama `useFakePhotoStorage()`
  (`test/support/photo-storage.ts`), um bucket em memória por teste, com `put` (uma foto já enviada), `failing` (o
  bucket fora do ar) e `off` (fotos desligadas). O `r2Storage` de verdade é testado contra um S3 falso local
  (`Bun.serve`), sem rede.
- O `bun test` roda os arquivos em sequência, num processo só. Não ligue execução concorrente nos testes que usam
  banco: eles compartilham o `ext2_test`.

### Cobertura

- Mínimo de **90% de linhas e de funções** (`coverageThreshold` no `bunfig.toml`). O CI falha abaixo disso.
- O Bun só conta os arquivos que algum teste carrega: um módulo sem teste nenhum não baixa o número. O que garante a
  cobertura é a regra de toda mudança vir com teste; o threshold pega o que ficou pela metade.

## Mobile

Ainda sem testes automatizados. Por enquanto, o mínimo é `bun run typecheck` + `bun run doctor` + subir o app.
A exceção é o `apps/mobile/src/lib/money.ts` (TypeScript puro, sem React Native): ele é testado pela suíte do server
em `apps/server/src/lib/money.parity.test.ts`, que confere a leitura do que se digita e o arredondamento lado a lado
com o `money.ts` do server. Mudou a regra de dinheiro de um lado, o teste falha até o outro acompanhar.
Do mesmo jeito, `apps/mobile/src/lib/stock-math.ts` (o valor que a prévia do ajuste mostra) é testado em
`apps/server/src/modules/stock/stock.parity.test.ts` contra a regra do ajuste no server, e
`apps/mobile/src/lib/sale-math.ts` (o lucro que a tela de nova venda mostra) em
`apps/server/src/modules/sales/sales.parity.test.ts` contra a conta da venda no server. Esses arquivos do app importam
uns aos outros por caminho relativo, não por `@/`, para a suíte do server conseguir carregá-los.
Quando forem adotados, seguir a doc oficial: https://docs.expo.dev/develop/unit-testing/

## Definição de pronto

```bash
bun run check && bun run typecheck && bun run test
```
