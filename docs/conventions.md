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
cinza claro, cards brancos, laranja só em detalhes, nada de bloco preto**. A tela inicial é o modelo, e todas as telas seguem as regras abaixo.

- Os tokens ficam em `apps/mobile/src/global.css` (variáveis CSS em HSL) e são mapeados no `tailwind.config.js`.
  `src/lib/theme.ts` espelha as cores para APIs sem `className`; mudou um token no CSS, mude lá também.
  Use as classes semânticas, nunca cores soltas como `text-red-600`:
  - `bg-background`: fundo da tela (branco).
  - `bg-card`: superfície cinza clara preenchida (tiles, blocos de total).
  - `bg-field`: preenchimento dos controles de formulário (inputs, seletores, campo de data, controle de quantidade,
    chips, busca e filtros sobre branco, botão `outline`), cinza um pouco mais forte (95,5%) para ler sobre o branco
    sem card em volta. `bg-field-raised` (branco) é o que fica dentro deles (botões − e +, alternância R$/%). A folha
    não troca esses dois.
  - `bg-primary`: laranja (`#EA580C`), para a ação principal e a seleção.
  - `bg-secondary`: preto. **Não use em cards ou blocos** (o mantenedor vetou card preto); só em texto forte ou no
    véu de fundo (`BACKDROP`).
  - `text-muted-foreground`: texto secundário.
  - `text-destructive`: erro, remoção e prejuízo.
  - `text-success`: lucro positivo, nas linhas pequenas das listas e nos números grandes de lucro.
- **Sem sombras**, com uma exceção: folhas e gavetas têm uma sombra bem suave no topo (`SHEET_SHADOW`), para se
  descolarem da tela de trás. A profundidade vem da cor: card branco sobre fundo cinza claro (`tone="muted"`, o padrão do
  `ScreenLayout`), sem borda. Campos e chips são sempre cinza (`bg-field`) sobre branco; chips e busca direto na
  página cinza são brancos (`surface="page"`; sobre branco, `surface="field"`).
- **Nada de card preto nem card laranja cheio.** Laranja só em detalhes: variação, link, badge de ação, ícone de
  destaque, botão principal.
- Ícones Phosphor em `bold` por padrão (`regular` fica fino demais); `fill` na aba ativa.
- Raio: botões, chips, controle de quantidade (− e +), botões de ícone, pílulas, badges, navbar e avatares `rounded-full`; cards e blocos `rounded-2xl`;
  campos (texto, busca, seletores) `rounded-[8px]`, nunca pílula. Nada de `rounded-3xl` (só o topo da gaveta,
  `rounded-t-3xl`). Em `tailwind.config.js`, `rounded-lg`, `-md` e `-sm` valem 16, 14 e 12px, não o padrão do Tailwind.
- Raios aninhados: raio interno = raio externo − distância entre as bordas, para as curvas ficarem paralelas. Exemplos:
  gaveta de 24px com 12px de margem dá linhas de 12px (`rounded-xl`); campo de 8px com 5px até o botão interno dá 3px.
  Quando a conta dá menos de 8px em um bloco visível (card de 16px com `p-4` dá 0), usa-se 8px, o mínimo. Pílula dentro de
  pílula já fica paralela.
- Campo de texto (`TextInput`) usa `text-[16px]`, nunca `text-base`/`text-sm`: essas classes também fixam a altura da
  linha, e no iPhone isso empurra o texto para baixo do centro.
- Todo campo tem placeholder: um exemplo do que vai nele ("Ex.: Perfumes", "(11) 90000-0000").
- Escolha única em formulário (canal, pagamento, tipo): `SelectField`, um campo que abre a lista numa gaveta. Chips
  ficam para filtros e alternâncias curtas, como R$/%.
- Sucesso de uma ação (venda registrada, dados salvos): `showToast`, um aviso que desce do topo e some sozinho.
- Filtros de lista: botão de filtro ao lado da busca (ou no cabeçalho, se a tela não tem busca) abre uma gaveta com todas
  as opções (`FilterControl`). Na tela só aparecem pílulas pequenas do que está em uso, com um x para remover
  (`ActiveFilters`). Filtros que aceitam várias opções usam `multiFilterGroup`: dentro de um filtro vale qualquer uma, e
  entre filtros valem todos. Período e situação são escolha única. Quando a descrição embaixo do título já diz o filtro
  (Vendas: "Novembro de 2026 · Loja"), as pílulas não aparecem. Chips fixos na página só para trocar de visão, como as abas de Relatórios.
- Carregamento: telas e listas usam esqueleto no formato do conteúdo (`RowsSkeleton`, `DetailSkeleton`, `FormSkeleton`,
  `SummarySkeleton`), nunca spinner solto. Descrição que depende de dado (subtítulo do título, linha de baixo dos atalhos)
  mostra uma linha de esqueleto enquanto carrega, nunca fica vazia. Botão em andamento usa `loading`: o spinner fica no lugar do texto, sem texto
  de espera ("Salvando...") e sem mudar o tamanho do botão.
- **Ícones soltos, sem tile** (quadradinho colorido ou cinza atrás). Cor padrão cinza: `text-foreground/50` nos cards,
  `text-foreground/45` em detalhes (olho, seta). Cor cheia só quando o ícone carrega significado (laranja da variação,
  vermelho de erro/alerta).
- **Espaço generoso, mas sem exagero:** card principal `p-5`, cards de atalho `p-3.5`, `gap-7` entre blocos da tela.
  Fontes discretas: título de seção `text-base`, nome de card `text-sm`, valor de destaque `text-[32px]`.
- Tipografia: Manrope; títulos em `font-sans-semibold`, nunca bold pesado. Peso se escolhe pela família:
  `font-sans`, `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`. Dinheiro com `formatMoney`, centavos no mesmo peso e cor.
- Só tema claro por enquanto (`userInterfaceStyle: "light"` no `app.json`).
- **Sem header padrão do navigator** (`headerShown: false`). Telas internas usam `ScreenHeader` (voltar em
  círculo branco, título centralizado, ação à direita). Raízes de aba não têm header fixo: o título fica no conteúdo
  (`PageTitle`, ou a saudação na inicial) e o `compactTitle` do `ScreenLayout` mostra o título ao rolar. Botões só de
  ícone usam `IconButton`.
- Navbar: barra branca larga, com borda fina, ícone + nome em três abas (Início, Vendas, Estoque; a ativa em laranja) e
  um botão "+" laranja ao lado. O "+" abre a gaveta de ações rápidas (`QuickActionsSheet`): nova venda, nova compra,
  novo produto, novo cliente. Sem contadores nas abas. Com `TabTrigger asChild`, descarte o
  `style` que ele injeta no botão (senão o ícone sai do centro).
- **Tela inicial** (o modelo):
  - Sem brilho laranja no fundo: foi testado e saiu. A página é só o cinza claro.
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
- Transições entre telas: deslizam da direita (`ios_from_right`). Formulários de criar e editar abrem como folha, imitando
  o modal do iPhone: sobem de baixo, deixam um espaço em cima com a tela anterior aparecendo, têm cantos arredondados e
  um botão grande de fechar (`ScreenLayout sheet` + `SheetHeader`). A rota entra em `SHEETS` no `(app)/_layout.tsx` e o
  arquivo dela exporta `sheetRoute(Tela)` (`components/route-sheet.tsx`), que é quem desenha a folha.
  Nada de transição de tela com fade (`fade`, `fade_from_bottom`) nem fade no conteúdo ao abrir a tela.
- **Tudo que sobe de baixo abre e fecha igual** (`useSheetMotion`, em `components/sheet-motion.tsx`): gavetas
  (`BottomSheet`, como a do "+"), folhas de escolher (`SheetModal`), formulários (`sheetRoute`) e modais de tela cheia
  (`FullScreenModal`: foto do produto, leitor de código). Abre em 450 ms, subindo rápido e freando devagar no final
  (`Easing.bezier(0.32, 0.72, 0, 1)`, a curva das folhas do iPhone), e fecha em 280 ms acelerando para baixo
  (`Easing.in(Easing.cubic)`). Só o fundo escurecido (`BACKDROP`) muda de opacidade; a folha nunca faz fade. A animação
  é sempre nossa: `Modal` com `animationType="none"` e rota com `animation: "none"` (`SHEET`), nunca o `slide` do
  sistema, que sobe o fundo escuro junto com a folha. Nos formulários, qualquer saída (fechar, arrastar, voltar do
  sistema, `router.back()` ou `replace` depois de salvar) espera a folha descer; quem segura é o `RouteSheet`, e o
  `DiscardGuard` pergunta por ele.
- **Animações suaves, sem bounce:** Reanimated com `withTiming` (120–320 ms; a abertura das folhas, 450 ms, é a
  exceção). `LinearTransition` quando itens entram,
  saem ou expandem, e `FadeIn` só para pedaços pequenos que surgem dentro da tela (erro de campo, detalhe
  expandido), nunca na tela inteira. Nada de `springify()`. Não ponha `className` em
  `Animated.View`: use uma `View` dentro dele.
- **Haptics** em todo toque, pelos helpers de `src/lib/haptics.ts` (nunca `expo-haptics` direto): `hapticTap` para abrir
  card, linha ou link; `hapticSelect` para trocar aba, alternar, escolher chip ou mudar quantidade; `hapticPress` para a
  ação principal (o "+", botões laranja; o `Button` já faz sozinho). Dentro de conteúdo que rola, a vibração vai no
  `onPress` (ao soltar), não no `onPressIn`, para não vibrar quando a pessoa só começa a rolar. Na navbar e no header,
  que não rolam, pode ser `onPressIn`.
- **Listas:** `ListCard` + `ListRow` para listas curtas. Listas que crescem (produtos, vendas, compras, clientes)
  são paginadas e virtualizadas: `ScreenLayout list` + `useInfiniteList`. Escolher produto é sempre pelo
  `ProductPicker` (folha, busca, leitura de código, filtros), nunca por um seletor simples: o catálogo é grande.
- **Linha de item (`ItemRow`)**, a mesma em vendas, compras, produtos, clientes, revendedoras e itens de uma venda:
  miniatura à esquerda, título e uma linha pequena no meio, valor e uma nota pequena colorida à direita. Mesma altura em
  todas (`py-4`, título 15px). Nada de pílula de status dentro da linha (aumenta a altura): o estado vai na nota embaixo
  do valor ("estoque baixo" em laranja, "sem estoque" em vermelho). Produto sem foto: quadrado em tom suave com as
  iniciais (`ProductThumb`); pessoa: círculo com as iniciais (`PersonAvatar`). Venda e compra mostram os 3 primeiros
  produtos sobrepostos, com um quadrado "+N" para o resto (`ThumbStack`). Quantidade como "5x". Cancelado: riscado e
  apagado.
- **Menos coisa na tela:** a lista mostra o que se usa no dia a dia; custo, valor em estoque e o resto ficam no detalhe.
- **Números:** o topo de detalhes e resumos mostra os dois números principais grandes, lado a lado (`FigurePair`:
  vendido e lucro real, preço e estoque, total gasto e compras). Lucro positivo em verde (`text-success`), prejuízo em
  vermelho. Centavos com o mesmo peso e cor do resto do valor.
- **Datas** como as pessoas falam (`formatDayHeading`: "Hoje", "Ontem", dia da semana, "2 de novembro"); listas de
  vendas e compras agrupadas por dia. Campo de data abre o calendário do sistema (`DateField`), nunca digitação.
- **Seletores:** escolha única em formulário é `SelectField` (abre uma gaveta com as opções em blocos separados, rádio
  suave à direita e ícone opcional, que aparece também no campo). Várias escolhas usam `Checkbox` no mesmo estilo.
  Cliente e revendedora se escolhem numa folha própria (`PersonPicker`), com busca, avatar e um "+" laranja no topo
  que abre outra folha para cadastrar na hora.
- **Carregando:** botão em andamento mostra spinner no lugar do texto (`Button loading`). Puxar a lista para baixo
  atualiza.
- **Estados:** toda tela trata carregando, erro com "Tentar de novo" e vazio (`QueryView`, `ScreenQuery`,
  `useInfiniteList`, `EmptyState`).
- Formulários: `FormScreen` (folha + campos + rodapé com o botão), `FormField` (label + input + erro), `FormSection`
  (grupo de campos com um titulozinho opcional), `SelectField` (escolha única), `CollapsibleSection` (o que costuma
  ficar no padrão, como custos e desconto, recolhido numa linha com fio embaixo), `DiscardGuard` (pergunta antes de
  sair com coisa preenchida) e `FormFooter` (quando o rodapé tem resumo). O estado fica no
  `useZodForm`: a validação é com Zod e o erro aparece embaixo do campo só depois da primeira tentativa de envio. Erro da
  API sobre um campo vai para o campo; os outros, para o rodapé.
- **Teclado:** o rodapé do formulário (botão de salvar) não sobe com o teclado; fica embaixo, coberto por ele, e só a área
  que rola abre espaço e leva o campo focado para cima do teclado (`ScreenLayout`: no iOS o próprio `ScrollView`, com
  `automaticallyAdjustKeyboardInsets`; no Android, `KeyboardAvoidingView` só em volta da área que rola). No iOS todo
  campo de texto tem uma barra com "OK" em cima do teclado para fechá-lo (`DoneTextInput`: todo campo de texto usa
  ele, nunca um `TextInput` puro; `Input`, `AmountField`, `QuantityStepper` e `SearchField` já usam). Gavetas (`BottomSheet`) continuam subindo com o teclado.
  Nas folhas fora da navegação (`SheetModal`: escolher produto, "Nova categoria") o rodapé também sobe, porque a folha
  inteira encolhe com o teclado.
- **Nada de card em volta de campos** (o mantenedor vetou card dentro de card): os campos ficam direto na folha branca.
  Para separar grupos, use o título da `FormSection`; para separar itens repetidos (produtos de uma venda ou compra,
  custos), um fio (`border-border border-b`). Blocos só de leitura (resultado da venda, custo atual, prévia do ajuste)
  continuam como bloco cinza.
- Ícones: [Phosphor](https://phosphoricons.com) pelo `Icon`, importando cada ícone pelo caminho dele
  (`phosphor-react-native/src/icons/<Nome>`), nunca pelo pacote inteiro, que traz os 1500 ícones para o app. Peso
  `bold` no geral (o `regular` fica fino demais), `regular` dentro das opções de um seletor e `fill` na aba ativa.
- **Como o mantenedor revisa:** olhando o app no iPhone. Ajuste visual em passos pequenos, dizendo os valores mudados
  (px, %), para ele pedir "mais" ou "menos". Não mexa no emulador ou no app aberto dele sem pedir, e não diga que algo
  funciona sem ter visto rodando.
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
- **Dinheiro em centavos inteiros** (R$ 92,50 = `9250`) no banco (`integer`, via `moneyColumn()`), na API e no app.
  Nunca float, `numeric` ou string decimal. Um `integer` guarda até R$ 21.474.836,47 por valor; soma que pode passar
  disso (totais de relatório) é calculada como `bigint`. O `sum()` do Postgres sobre `integer` já devolve `bigint`, e o
  driver entrega `bigint` como string: converta para número na query (`.mapWith(Number)`), senão o schema da
  resposta recusa e a rota responde 500.
- **Percentuais em pontos-base inteiros** (12,5% = `1250`, 100% = `10000`), via `percentColumn()` + `percentRange()`
  (CHECK de 0 a 10000 no banco).
- **Contrato da API:** dinheiro e percentual entram por `moneyField`/`percentField` (`apps/server/src/lib/fields.ts`),
  que só aceitam número JSON inteiro. Texto (`"92.50"`, `"10"`), fração ou negativo é 422: nada é convertido nem
  arredondado na entrada.
- **Arredondamento:** toda divisão que pode deixar fração de centavo passa por `divideRounded()`/`percentOf()`
  (`apps/server/src/lib/money.ts`): para o inteiro mais próximo, metade para longe do zero (como o `round` do
  Postgres). O `percentOf()` do app (`apps/mobile/src/lib/money.ts`) segue a mesma regra, para a prévia bater com o que
  a API grava. Arredonde só no fim da conta, nunca em passos intermediários.
- **No app**, `Money` e `Percent` são esses inteiros. O texto digitado vira inteiro dígito a dígito
  (`parseMoneyInput`, `parsePercentInput`), sem passar por float, e só se formata na tela (`formatMoney`,
  `formatPercent`, `moneyToInput`, `percentToInput`).
- Datas: `timestamptz` (`timestamp({ withTimezone: true })`), gravadas em UTC. A conversão para o horário local
  (America/Sao_Paulo) acontece no app. Dia do calendário (data da compra) é `date` e trafega como `"YYYY-MM-DD"`;
  validade trafega como mês, `"YYYY-MM"`, e é guardada como o primeiro dia do mês. Regra que depende de "hoje" usa o
  dia da loja (`storeToday()`, `apps/server/src/lib/dates.ts`), nunca o do servidor.
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
