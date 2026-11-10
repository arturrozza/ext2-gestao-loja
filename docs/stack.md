# Stack

> Atualize este arquivo sempre que uma ferramenta entrar, sair ou mudar de versão major.

A fonte de verdade das versões é o `package.json` de cada workspace e o `catalog` da raiz. A versão do Bun fica no
`packageManager` do `package.json` da raiz (o CI usa ela) e na tag da imagem em `apps/server/Dockerfile`: mude as duas
juntas.

| Ferramenta | Versão | Onde | Doc oficial |
| --- | --- | --- | --- |
| Bun | 1.4 | runtime, package manager, test runner | https://bun.sh/docs |
| TypeScript | ~6.0 (catalog) | todos | https://www.typescriptlang.org/docs |
| Elysia | ^1.4 (catalog) | server (+ tipos no mobile) | https://elysiajs.com/llms.txt |
| Eden Treaty (`@elysia/eden`) | ^1.4 (catalog) | client no mobile, testes e2e do server | https://elysiajs.com/eden/overview.html |
| Drizzle ORM / Kit | 1.0.0-rc (driver `bun-sql`) | server | https://orm.drizzle.team/docs/get-started/bun-sql-new |
| PostgreSQL | 18 (Docker) | infra | https://www.postgresql.org/docs/18/ |
| Zod | ^4 (catalog) | server, mobile | https://zod.dev |
| Expo SDK | 58 (RN 0.88, React 19.3) | mobile | https://docs.expo.dev/versions/v58.0.0/ |
| Expo Router | ~58 | mobile | https://docs.expo.dev/router/introduction/ |
| NativeWind | 4.2.7 (Tailwind 3.4) | mobile | https://www.nativewind.dev/docs |
| React Native Reusables | componentes copiados para `src/components/ui` (CLI `@react-native-reusables/cli`, variante NativeWind) | mobile: componentes base do design system | https://reactnativereusables.com/docs |
| expo-haptics | ~58.0 | mobile: vibração nos toques, pelos helpers de `src/lib/haptics.ts` | https://docs.expo.dev/versions/v58.0.0/sdk/haptics/ |
| expo-blur | ~58.0 | mobile: vidro fosco do header compacto (`CompactHeader`) | https://docs.expo.dev/versions/v58.0.0/sdk/blur-view/ |
| phosphor-react-native | ^3.0 (+ `react-native-svg` 15.16) | mobile: ícones, via `Icon` (`src/components/ui/icon.tsx`) | https://github.com/duongdev/phosphor-react-native |
| expo-linear-gradient | ~58 | mobile: degradês nas bordas da rolagem | https://docs.expo.dev/versions/v58.0.0/sdk/linear-gradient/ |
| expo-camera | ~58.0 | mobile: leitor de código de barras (`BarcodeScanner`) | https://docs.expo.dev/versions/v58.0.0/sdk/camera/ |
| expo-image-picker | ~58.0 | mobile: foto do produto (tirar ou escolher) | https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/ |
| expo-image-manipulator | ~58.0 | mobile: reduz a foto do produto antes do upload (`PhotoField`) | https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/ |
| expo-file-system | ~58.0 | mobile: envia a foto do produto para a API (`uploadFile` em `src/lib/api.ts`) | https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/ |
| Cloudflare R2 | — (API S3, pelo `S3Client` do Bun) | server: fotos dos produtos (`src/lib/photo-storage.ts`) | https://developers.cloudflare.com/r2/ |
| expo-notifications | ~58.1 | mobile: instalada para push, ainda sem uso (MUN-7) | https://docs.expo.dev/versions/v58.0.0/sdk/notifications/ |
| expo-secure-store | ~58.0 | mobile: token da sessão no Keychain/Keystore (`src/lib/session-token.ts`) | https://docs.expo.dev/versions/v58.0.0/sdk/securestore/ |
| @react-native-community/datetimepicker | 9.2.1 | mobile: calendário dos campos de data (`DateField`) | https://docs.expo.dev/versions/v58.0.0/sdk/date-time-picker/ |
| react-native-gesture-handler | ~3.3 | mobile: arrastar gavetas e folhas para fechar (`useDragToClose`) e zoom da foto (`PhotoViewer`) | https://docs.swmansion.com/react-native-gesture-handler/ |
| Manrope | `@expo-google-fonts/manrope` ^0.4 | mobile: fonte do app | https://docs.expo.dev/develop/user-interface/fonts/ |
| EAS (Build + Update) | `eas-cli` >= 27.4.1 (via `bunx eas-cli`), `expo-updates` ~58 | mobile: APK/iOS ad hoc e updates OTA (`apps/mobile/eas.json`) | https://docs.expo.dev/eas-update/introduction/ |
| TanStack Query | ^5 | mobile | https://tanstack.com/query/latest/docs/framework/react/react-native |
| Biome | 2.5.15 (versão exata) | raiz | https://biomejs.dev |
| Husky | ^9 | raiz (pre-commit, commit-msg) | https://typicode.github.io/husky |
| commitlint | ^21 (config-conventional) | raiz | https://commitlint.js.org |
| Docker Compose | — | infra local (postgres + server) | https://docs.docker.com/compose/ |
| GitHub Actions | `setup-bun@v2`, `checkout@v7`, `cache@v6` | CI (`.github/workflows/ci.yml`) | https://docs.github.com/actions |
| Railway | CLI 5.70, SDK `railway` ^3.16 (IaC), action `railwayapp/config` (fixada num commit da `main`) | deploy do server + Postgres (production), infra em `.railway/railway.ts` | https://docs.railway.com/infrastructure-as-code |

## Catalog (versões compartilhadas)

Fica em `package.json` → `workspaces.catalog`, e os workspaces referenciam com `"catalog:"`. Hoje estão lá `zod`,
`elysia`, `@elysia/eden`, `typescript`, `@types/bun` e os peers do Elysia (`@sinclair/typebox`, `file-type`,
`openapi-types`). O Elysia precisa estar no catalog porque o Eden exige **a mesma versão** no server e no client.

## Libs nativas

Lib com código nativo só chega ao aparelho num **binário novo**: atualização OTA (EAS Update) leva só JS e assets. Por
isso as libs nativas do MVP entraram todas de uma vez, na versão 1.2.0 do app (MUN-23), e as features seguintes saem
por OTA. O que está instalado é o que está nas `dependencies` de `apps/mobile/package.json`. O `expo-file-system` virou
dependência direta na MUN-11, mas já estava no binário 1.2.0 como dependência do `expo` (mesma versão), então não pediu
binário novo.

Antes de adicionar uma lib, veja se dá para resolver só com JS ou com uma lib que já está instalada. Se ela for nativa
(tem config plugin ou não roda no Expo Go), ela exige subir o `version` do app e gerar binários novos, como explica
[`architecture.md`](architecture.md#mobile-eas-build--eas-update) (`runtimeVersion`). O mesmo vale para permissão nova
ou mudança em plugin do `app.json`.

## Restrições conhecidas

Coisas que parecem "consertáveis", mas que só devem mudar depois de testar de novo:

- **Linker `hoisted` do Bun** (`bunfig.toml`). Com o `isolated` (o padrão), o `expo-doctor` acusa módulos nativos
  duplicados (`expo-font`, `expo-symbols`...), e isso quebra builds nativos. Testar o `isolated` de novo ao subir o
  Expo.
- **Peers do Elysia declarados explicitamente.** Sem eles, o Bun resolveu o TypeBox 0.27 (que vem do Jest via Expo)
  e o server quebrava.
- **NativeWind 4.2.7 no SDK 58 sem suporte oficial.** A doc do NativeWind só declara suporte até o SDK 57, e a v5 ainda
  é RC (e exige Tailwind 4). As telas foram conferidas à mão no Expo Go e funcionaram. Se aparecer bug de estilo, comece
  por aqui, e confirme o suporte do NativeWind antes de subir o SDK de novo.
- **Drizzle 1.0 RC.** A API da 0.x é diferente: não existe mais a opção `schema` no `drizzle()` nem `casing` no config
  do kit. Ignore exemplos da 0.x.
- **`apps/server/drizzle/` precisa existir** (por isso o `.gitkeep`). O migrator do Drizzle 1.0 falha com `ENOENT` se
  a pasta não existir, mesmo sem nenhuma migration, e isso derrubava o pre-deploy no Railway. Localmente não aparece,
  porque o `drizzle-kit migrate` dos testes cria a pasta: para validar a imagem, builde a partir de um clone limpo.
- **Railway: Infrastructure as Code, não `railway.json`.** O Config as Code (`railway.json`/`railway.toml`) foi
  depreciado: services criados depois de 2026-08-28 ignoram o arquivo (o build caiu no Railpack) e os antigos param de
  lê-lo em 2026-12-01. Use só `.railway/railway.ts`. O `.railway/` tem `export default` liberado no Biome, porque o
  SDK exige.
- **Action `railwayapp/config` fixada por SHA.** A release `v1` (1.2.0) só instala dependências com npm, que não
  entende o `catalog:` do Bun. O suporte a Bun (`package-manager: bun`) está só na `main` dela (commit `f1f0c71`).
  Volte para uma tag quando sair uma release com ele.
- **Railway CLI via Bun:** `bun add -g @railway/cli` precisa de `bun pm -g trust @railway/cli`, porque o postinstall
  (que baixa o binário) é bloqueado por padrão.
- **`t.Integer` do Elysia aceita texto.** O `t.Integer` (e o `t.Numeric`) do Elysia 1.4 é um `anyOf` que também
  aceita string numérica e a converte (`"10"` → `10`). Para dinheiro e percentual isso é perigoso (um app antigo
  mandando `"10"` para 10% gravaria 0,1%), então `moneyField`/`percentField` (`apps/server/src/lib/fields.ts`) usam o
  `Type.Integer` do próprio TypeBox, que só aceita número inteiro. Os testes de `fields.test.ts` e os e2e falham se
  isso mudar.
- **Barra "OK" do teclado (iOS) dentro de uma caixa 0x0.** O `InputAccessoryView` deixa na tela um nó próprio,
  absoluto, no topo do campo e com a largura toda. Num build iOS ele apareceu cobrindo o label e o topo do input depois
  de abrir um segundo formulário. O `DoneTextInput` envolve a barra numa caixa 0x0 com `overflow-hidden`, e o conteúdo
  da barra continua indo para a janela do teclado. Não tire a caixa sem testar num build de verdade (TestFlight).
- **Biome:** `@tailwind` está liberado no CSS. O NativeWind 4 usa Tailwind 3, e o parser de Tailwind do Biome só
  conhece as diretivas da v4.
- **`tailwind-merge` 3 com Tailwind 3.** A v3 do `tailwind-merge` foi feita para o Tailwind 4, mas é a versão que o
  template NativeWind do React Native Reusables usa, e funciona com as classes do app. Se o `cn()` resolver algum
  conflito errado, teste o `tailwind-merge` 2 (feito para o Tailwind 3).
- **Cada peso da fonte é uma família.** O `fontWeight` não escolhe o arquivo da fonte: use `font-sans`,
  `font-sans-medium`, `font-sans-semibold` e `font-sans-bold`, nunca `font-medium`/`font-bold`. O SDK 58 trouxe fontes
  variáveis no `expo-font`, mas ainda não testamos se isso simplifica esse esquema. As fontes são carregadas com `useFonts` (em `src/lib/fonts.ts`), e não
  pelo config plugin, para os nomes serem iguais em iOS, Android e web e funcionar no Expo Go.
- **Componentes do Reusables são código nosso.** Ao rodar o `add` de novo (ou com `--overwrite`), refaça a troca de
  `font-<peso>` pelas famílias acima.

- **Fotos pelo `r2.dev`.** A URL pública de desenvolvimento do R2 tem limite de taxa e não tem cache nem WAF; o
  Cloudflare pede um domínio próprio para produção. Para trocar: um domínio no Cloudflare, **R2 → bucket → Settings →
  Custom Domains**, e mudar `PHOTOS_PUBLIC_URL` na Railway. O banco guarda só a chave, então nada mais muda.
- **Foto enviada pela API, não direto ao bucket.** O `presign` do Bun (1.4) só assina o `host`, não o `Content-Type`
  nem o tamanho, então uma URL pré-assinada aceitaria qualquer arquivo. Se um dia o upload direto voltar, confira os
  `X-Amz-SignedHeaders` da URL antes.
- **`uploadFile` fora do Eden** (`apps/mobile/src/lib/api.ts`). O Eden só manda multipart quando o campo é um `Blob`,
  e o `File` do `expo-file-system` não passa no `instanceof Blob`; o `Blob` do React Native não aceita bytes. O envio
  usa o `File.upload` nativo do Expo, com o mesmo token e os mesmos `ApiError`. É a única chamada fora do `api`.
- **Eden com `parseDate: false`** (`apps/mobile/src/lib/api.ts`). Por padrão o Eden converte em `Date` qualquer string
  da resposta que pareça data, mesmo com o tipo dizendo `string`. O dia da compra (`"2026-11-09"`) chegava como `Date`
  e a lista de compras derrubava o app no iOS. Datas viajam como string e o app formata (`src/lib/dates.ts`).

## Como atualizar

1. Leia o changelog e o guia de migração oficiais da ferramenta.
2. Expo: `bunx expo install expo@^<sdk>`, depois `bunx expo install --fix` e `bun run doctor`
   (guia: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/). Confira o NativeWind antes.
3. Rode `bun run check`, `bun run typecheck`, `bun run test` e um bundle do app (`bun run export` em `apps/mobile`).
4. Atualize a tabela acima e as restrições conhecidas.
