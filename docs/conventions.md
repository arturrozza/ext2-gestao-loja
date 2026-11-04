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

### Mobile: design system

Referência visual: app de loja com fundo branco, superfícies cinza claro preenchidas e ações em laranja (Dribbble,
enviada pelo mantenedor em 2026-11-04), revista na tela inicial (MUN-9) com o Inter Empresas como referência: **fundo
cinza claro, cards brancos, laranja só em detalhes, nada de bloco preto**. A tela inicial é o modelo; as outras telas do
mock ainda seguem a versão antiga e migram aos poucos para as regras abaixo.

- Os tokens ficam em `apps/mobile/src/global.css` (variáveis CSS em HSL) e são mapeados no `tailwind.config.js`.
  `src/lib/theme.ts` espelha as cores para APIs sem `className`; mudou um token no CSS, mude lá também.
  Use as classes semânticas, nunca cores soltas como `text-red-600`:
  - `bg-background`: fundo da tela (branco).
  - `bg-card`: superfície cinza clara preenchida (inputs, chips, tiles, blocos de total, botões secundários).
  - `bg-primary`: laranja (`#EA580C`), para a ação principal e a seleção.
  - `bg-secondary`: preto. **Não use em cards ou blocos** (o mantenedor vetou card preto); só em texto forte ou no
    véu de fundo (`BACKDROP`).
  - `text-muted-foreground`: texto secundário.
  - `text-destructive`: erro e remoção.
- **Sem sombras.** A profundidade vem da cor: card branco sobre fundo cinza claro (`ScreenLayout tone="muted"`), sem
  borda. Em tela de fundo branco (as antigas), o card é branco com borda fina (`border border-border`).
- **Nada de card preto nem card laranja cheio.** Laranja só em detalhes: variação, link, badge de ação, ícone de
  destaque, botão principal.
- Raio: botões, inputs, chips, botões de ícone, pílulas, badges, navbar e avatares `rounded-full`; cards, blocos e
  campos de várias linhas `rounded-2xl`; pequenos elementos dentro de card `rounded-xl`. Nada de `rounded-3xl` (só o topo
  da gaveta, `rounded-t-3xl`).
- **Ícones soltos, sem tile** (quadradinho colorido ou cinza atrás). Cor padrão cinza: `text-foreground/50` nos cards,
  `text-foreground/45` em detalhes (olho, seta). Cor cheia só quando o ícone carrega significado (laranja da variação,
  vermelho de erro/alerta).
- **Espaço generoso, mas sem exagero:** card principal `p-5`, cards de atalho `p-3.5`, `gap-7` entre blocos da tela.
  Fontes discretas: título de seção `text-base`, nome de card `text-sm`, valor de destaque `text-[32px]`.
- Tipografia: Plus Jakarta Sans; títulos em `font-sans-semibold`, nunca bold pesado. Peso se escolhe pela família:
  `font-sans`, `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`. Dinheiro com `Price` (centavos menores).
- Só tema claro por enquanto (`userInterfaceStyle: "light"` no `app.json`).
- **Sem header padrão do navigator** (`headerShown: false`). Telas internas usam `ScreenHeader` (voltar em
  círculo cinza, título centralizado, ação à direita). Raízes de aba com o título dentro do conteúdo (a inicial) não têm
  header fixo: usam `compactTitle` no `ScreenLayout`. As raízes antigas ainda usam `ScreenHeader variant="large"` até
  migrarem. Botões só de ícone usam `IconButton`.
- Navbar: barra branca larga, com borda fina, ícone + nome em três abas (Início, Vendas, Estoque; a ativa em laranja) e
  um botão "+" laranja ao lado. O "+" abre a gaveta de ações rápidas (`QuickActionsSheet`): nova venda, nova compra,
  novo produto, novo cliente. Sem contadores nas abas. Com `TabTrigger asChild`, descarte o
  `style` que ele injeta no botão (senão o ícone sai do centro).
- **Tela inicial** (o modelo):
  - Um brilho laranja bem leve (`HOME_GLOW`: 12% no topo, 4% e 2% descendo) cobre a página e rola com ela. Mais que
    isso fica laranja demais; só no topo deixa o resto cru.
  - O título fica dentro do conteúdo (saudação: avatar + "Boa tarde," + nome da loja) e rola junto; o `compactTitle`
    mostra "Início" no header de vidro ao rolar.
  - Card de destaque: rótulo + olho que esconde os valores, lucro real do mês grande (toque abre o relatório), variação
    contra o mês anterior, barrinhas dos últimos 7 dias (hoje em laranja cheio) e três números de apoio.
  - Seções com título e um carrossel horizontal de cards quadrados brancos (ícone solto, nome, resumo).
  - Badge vermelho (`bg-destructive`) com número só onde há pendência real: hoje, só em Alertas.
  - Estado vazio (loja começando): tudo zerado, barras cinza baixinhas, Margem "—", resumos "Nenhuma ainda". Sem
    passo a passo de onboarding (fora do MVP).
- Toda tela monta em cima do `ScreenLayout` (`@/components/screen-layout`): header, o conteúdo (aparece direto, sem fade), uma
  linha finíssima e bem clara sob o header que só aparece quando o conteúdo rola por baixo, e um degradê branco embaixo
  para o conteúdo sumir suave atrás da navbar (`bottom="tabs"` nas abas). Cores em `DIVIDER` e `FADE`
  (`src/lib/theme.ts`).
- Telas cujo título fica dentro do conteúdo (a inicial) passam `compactTitle` ao `ScreenLayout`: ao rolar, uma barra
  compacta com o título centralizado aparece no topo, como o título grande do iOS, para a pessoa saber onde está. Ela é
  de vidro fosco (`CompactHeader`: blur do `expo-blur` + véu branco `GLASS`), cobre a barra de status e tem uma linha
  fina embaixo. O blur aparece animando a `intensity`, nunca a opacidade.
- Sem barra de rolagem vertical visível nas telas (`showsVerticalScrollIndicator={false}` no `ScreenLayout`).
- Transições entre telas: **todas** deslizam da direita (`ios_from_right`), formulários também. Nada de transição de
  tela com fade (`fade`, `fade_from_bottom`) nem fade no conteúdo ao abrir a tela.
- Gavetas (bottom sheets, como a do "+"): sobem deslizando de baixo com `withTiming` (abre ~320 ms com
  `Easing.out(Easing.cubic)`, fecha ~220 ms) e descem ao fechar. Só o fundo escurecido (`BACKDROP`) muda de opacidade; a
  gaveta nunca faz fade. `Modal` com `animationType="none"`; a animação é nossa.
- **Animações suaves, sem bounce:** Reanimated com `withTiming` (120–320 ms). `LinearTransition` quando itens entram,
  saem ou expandem, e `FadeIn` só para pedaços pequenos que surgem dentro da tela (erro de campo, detalhe
  expandido), nunca na tela inteira. Nada de `springify()`. Não ponha `className` em
  `Animated.View`: use uma `View` dentro dele.
- **Haptics** em todo toque, pelos helpers de `src/lib/haptics.ts` (nunca `expo-haptics` direto): `hapticTap` para abrir
  card, linha ou link; `hapticSelect` para trocar aba, alternar, escolher chip ou mudar quantidade; `hapticPress` para a
  ação principal (o "+", botões laranja; o `Button` já faz sozinho). Dentro de conteúdo que rola, a vibração vai no
  `onPress` (ao soltar), não no `onPressIn`, para não vibrar quando a pessoa só começa a rolar. Na navbar e no header,
  que não rolam, pode ser `onPressIn`.
- Detalhes de um item abrem no próprio card (`ExpandableRow`), sem navegar para outra tela.
- Formulários: `FormField` (label + input + erro), `FormSection` (grupo com título), `ChoiceChips` (escolha única) e
  `FormFooter` (resumo + botão). A validação é com Zod e o erro aparece embaixo do campo só depois da primeira tentativa
  de envio.
- Ícones: [Phosphor](https://phosphoricons.com) pelo `Icon`, importando cada ícone pelo caminho dele
  (`phosphor-react-native/src/icons/<Nome>`), nunca pelo pacote inteiro, que traz os 1500 ícones para o app. Peso
  `regular` no geral e `fill` na aba ativa da navbar.
- Componentes base vêm do [React Native Reusables](https://reactnativereusables.com/docs) e ficam em
  `src/components/ui/`. Para adicionar um: `bunx --bun @react-native-reusables/cli@latest add <componente>` (em
  `apps/mobile`), depois troque `font-<peso>` pelas famílias, os ícones do lucide pelos do Phosphor, ajuste ao estilo acima e rode `bun run check:fix`.
- Texto sempre pelo `Text` de `@/components/ui/text`, não o `Text` do React Native. Junte classes com `cn()`.

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
