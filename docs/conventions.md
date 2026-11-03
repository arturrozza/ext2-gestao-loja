# Convenções

> Atualize este arquivo sempre que uma convenção for criada ou alterada.

## Idioma

- **Código** (variáveis, funções, arquivos, tabelas, colunas, rotas), **commits** e **`AGENTS.md`**: inglês.
- **Docs** (`docs/`, `README.md`) e textos exibidos ao usuário no app: português (pt-BR).

## Nomes

| O quê | Padrão | Exemplo |
| --- | --- | --- |
| Arquivos e pastas | kebab-case (o Biome barra outros formatos) | `sale-items.ts`, `use-products.ts` |
| Arquivos com papel | `<nome>.<papel>.ts` | `products.controller.ts`, `products.service.ts`, `home.screen.tsx` |
| Componentes React | export nomeado em PascalCase num arquivo kebab-case | `product-card.tsx` → `ProductCard` |
| Screens | `<Nome>Screen` em `screens/<nome>/<nome>.screen.tsx` | `HomeScreen` |
| Controllers | `<module>Controller` | `productsController` |
| Hooks | `useX` | `useProducts` |
| Tabelas (TS) | camelCase, plural (vira snake_case no banco) | `saleItems` → `sale_items` |
| Rotas HTTP | kebab-case, recursos no plural | `GET /products/:id`, `POST /sales` |
| Models do Elysia | `<Module>Model` | `ProductsModel.create` |
| Services | `<Module>Service` (objeto simples) | `ProductsService.create` |
| Query keys | factory `<module>Keys` em `src/queries/<module>/` | `productsKeys.detail(id)` |

## Código

- Formatação e lint são do **Biome**, com a config da raiz (padrão: tabs, aspas duplas, imports organizados). Não se
  discute estilo em review: o Biome decide.
- **Complexidade cognitiva máxima de 10 por função** (`noExcessiveCognitiveComplexity` como erro). Prefira early
  return, funções pequenas e lookup tables a `if/else` aninhados. Não silencie com `biome-ignore`.
- Sem `any`. Sem non-null assertion (`!`), a não ser com um comentário `biome-ignore` explicando o motivo.
- **Só exports nomeados.** Nada de `export default`, a não ser onde a ferramenta exige: rotas do Expo Router
  (`apps/mobile/src/app/**`) e arquivos `*.config.*`. O Biome (`noDefaultExport`) barra o resto.
- Sem barrel files (`index.ts` que só reexporta), exceto `apps/server/src/db/schema/index.ts`, que o Drizzle precisa.
- Prefira funções e objetos simples a classes. O Biome bloqueia classes só com membros estáticos.
- Comentários explicam o **porquê**, não o quê.
- Variáveis de ambiente só são lidas pelo módulo `env` validado de cada app (`apps/server/src/env.ts`,
  `apps/mobile/src/lib/env.ts`). Variável nova entra nesse módulo e no `.env.example` da raiz.

## Organização de pastas

### Server: uma pasta por módulo

```
apps/server/src/modules/products/
  products.controller.ts      rotas (instância Elysia com prefixo) → productsController
  products.service.ts         regra de negócio → ProductsService
  products.model.ts           schemas `t` de request/response → ProductsModel
  products.service.test.ts    testes unitários, ao lado do código
```

Outros arquivos do módulo seguem o mesmo padrão `<module>.<papel>.ts` (ex.: `products.errors.ts`). O controller é
registrado em `src/app.ts` com `.use(productsController)`.

### Mobile: screens com partials

```
apps/mobile/src/
  app/products/index.tsx                      rota: só importa e reexporta a screen
  screens/products/products.screen.tsx        a screen → ProductsScreen
  screens/products/partials/product-row.tsx   componente usado SÓ por essa screen
  components/price-tag.tsx                    componente usado por mais de uma screen
  queries/products/use-products.ts            hooks do TanStack Query + productsKeys
```

- A rota não tem UI: `import { ProductsScreen } from "@/screens/products/products.screen"` e
  `export default ProductsScreen`.
- Partial que passar a ser usado por outra screen sobe para `src/components/`.
- Screens e partials buscam dados pelos hooks de `src/queries/`, nunca chamando o `api` direto.

## Validação: `t` × Zod

| Situação | Use |
| --- | --- |
| body/query/params/response das rotas Elysia | `t` (Elysia/TypeBox) |
| Variáveis de ambiente (server e app) | Zod |
| Regras de domínio que o `t` não expressa bem (CPF/CNPJ, refinements entre campos, transforms) | Zod (pode ir direto na rota, via Standard Schema) |
| Formulários no app | Zod |
| Respostas da API no app | nada: já vêm tipadas pelo Eden |

## Dados

- Toda tabela usa `snakeCase.table(...)` e inclui `...timestamps` (`apps/server/src/db/schema/helpers.ts`).
- **Escopo por loja:** toda tabela de negócio (produtos, compras, lotes, movimentações, vendas, revendedoras...) tem
  `storeId` (FK para `stores`, obrigatório, com índice). O `storeId` vem da sessão, nunca do body/query/params, e todo
  service recebe e filtra por ele. Unicidades de negócio são por loja (ex.: código de barras único por `storeId`).
  Teste e2e de cada módulo cobre que uma loja não lê nem altera dados de outra.
- Dinheiro: `numeric(12, 2)` no banco e string decimal no app. Nunca float.
- Datas: `timestamptz` (`timestamp({ withTimezone: true })`), gravadas em UTC. A conversão para o horário local
  (America/Sao_Paulo) acontece no app.
- IDs: definir na primeira feature que criar uma tabela e registrar aqui.
- Mudança de schema vai junto com a migration gerada (`bun run db:generate`), no mesmo commit. Nunca use
  `drizzle-kit push` em banco compartilhado ou de produção.

## Testes

Ver [`testing.md`](testing.md).

## Git

- **Branches:**
  - `main`: integração. Todo trabalho entra aqui por PR, a partir de branches `feat/...`, `fix/...` e `chore/...`. Com task
    no Linear, o id entra no nome (`feat/mun-12-products-listing`) e o PR fecha a task (`Closes MUN-12`).
    Push na `main` **não** faz deploy.
  - `production`: o que está no ar. Só recebe PRs de release vindos da `main`. Cada merge nela faz deploy no Railway
    (depois do CI).
- **Release:** abra um PR `main → production` (título `chore(release): <resumo>`, por exemplo
  `gh pr create --base production --head main`) e mergeie com **merge commit**, nunca squash ou rebase. Com squash, a
  `production` ganha commits que não existem na `main`, e as releases seguintes passam a dar conflito.
- **Hotfix:** corrija na `main` e faça uma release. Não commite direto na `production`.
- **Proteção (rulesets do GitHub `main-protection` e `production-protection`):** as duas branches só aceitam PR, com os
  checks `Lint, typecheck & doctor`, `Server tests` e `Server image` verdes, e bloqueiam force push e exclusão. A `main` aceita merge
  commit ou squash; a `production`, só merge commit. Não há review obrigatório (projeto solo). Admins podem passar por
  cima das regras só dentro de um PR (ex.: mergear com o CI quebrado numa emergência); push direto continua bloqueado.
  Se o nome de um job do CI mudar, atualize os checks obrigatórios dos rulesets.
- **Sempre Conventional Commits**, com o escopo sendo o módulo/feature afetado (em kebab-case). O commitlint
  (`@commitlint/config-conventional`) valida no hook `commit-msg` e recusa mensagens fora do padrão.
  - `feat(products): add product listing`
  - `fix(sales): round totals to two decimals`
  - `refactor(auth): extract token helpers`
  - `chore(deps): bump biome`
  - `docs(sales): add sales spec`
  - Tipos: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `chore`, `build`, `ci`, `revert`.
- Commits e PRs **não mencionam Claude/IA**: nada de `Co-Authored-By` de agente nem linhas "Generated with".
- O pre-commit (Husky) roda o `lint-staged`, que passa `biome check --write` (format, imports e lint com fixes
  seguros) só nos arquivos staged, e depois o `bun run typecheck`. Erro de lint ou de tipo barra o commit; corrija a
  causa, nunca use `--no-verify`.
- **Skills do Claude Code** (`.claude/skills/`): `/pr-main` abre o PR para a `main`, acompanha o CI e mergeia (squash)
  se passar; `/release-prod` abre o PR de release, confere o que precisa estar pronto antes do deploy, mergeia com merge
  commit e acompanha o deploy.

## Docs

- Os `AGENTS.md` (raiz e de cada app) têm as regras que os agentes seguem. Cada `CLAUDE.md` só importa o `AGENTS.md`
  ao lado (`@AGENTS.md`).
- `docs/architecture.md`, `docs/stack.md`, `docs/testing.md` e este arquivo descrevem o sistema. Atualize no mesmo PR
  da mudança.
- Decisões (de produto ou técnicas) com o porquê vão em `docs/decisions.md`, a mais recente no topo.
