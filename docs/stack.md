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
| Expo SDK | 57 (RN 0.86, React 19.2) | mobile | https://docs.expo.dev/versions/v57.0.0/ |
| Expo Router | ~57 | mobile | https://docs.expo.dev/router/introduction/ |
| NativeWind | 4.2.7 (Tailwind 3.4) | mobile | https://www.nativewind.dev/docs |
| TanStack Query | ^5 | mobile | https://tanstack.com/query/latest/docs/framework/react/react-native |
| Biome | 2.5.15 (versão exata) | raiz | https://biomejs.dev |
| Husky | ^9 | raiz (pre-commit, commit-msg) | https://typicode.github.io/husky |
| commitlint | ^21 (config-conventional) | raiz | https://commitlint.js.org |
| Docker Compose | — | infra local (postgres + server) | https://docs.docker.com/compose/ |
| GitHub Actions | `setup-bun@v2`, `checkout@v6` | CI (`.github/workflows/ci.yml`) | https://docs.github.com/actions |
| Railway | — | deploy do server + Postgres (production) | https://docs.railway.com |

## Catalog (versões compartilhadas)

Fica em `package.json` → `workspaces.catalog`, e os workspaces referenciam com `"catalog:"`. Hoje estão lá `zod`,
`elysia`, `@elysia/eden`, `typescript`, `@types/bun` e os peers do Elysia (`@sinclair/typebox`, `file-type`,
`openapi-types`). O Elysia precisa estar no catalog porque o Eden exige **a mesma versão** no server e no client.

## Restrições conhecidas

Coisas que parecem "consertáveis", mas que só devem mudar depois de testar de novo:

- **Linker `hoisted` do Bun** (`bunfig.toml`). Com o `isolated` (o padrão), o `expo-doctor` acusa módulos nativos
  duplicados (`expo-font`, `expo-symbols`...), e isso quebra builds nativos. Testar o `isolated` de novo ao subir o
  Expo.
- **Peers do Elysia declarados explicitamente.** Sem eles, o Bun resolveu o TypeBox 0.27 (que vem do Jest via Expo)
  e o server quebrava.
- **Expo SDK 57, não 58.** O NativeWind 4.2.7 só suporta oficialmente até o SDK 57. Confirme o suporte do NativeWind
  antes de subir o SDK.
- **Drizzle 1.0 RC.** A API da 0.x é diferente: não existe mais a opção `schema` no `drizzle()` nem `casing` no config
  do kit. Ignore exemplos da 0.x.
- **Biome:** `@tailwind` está liberado no CSS. O NativeWind 4 usa Tailwind 3, e o parser de Tailwind do Biome só
  conhece as diretivas da v4. O ícone gerado pelo Expo (`apps/mobile/assets/expo.icon`) fica fora do lint.

## Como atualizar

1. Leia o changelog e o guia de migração oficiais da ferramenta.
2. Expo: `bunx expo install expo@^<sdk>`, depois `bunx expo install --fix` e `bun run doctor`
   (guia: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/). Confira o NativeWind antes.
3. Rode `bun run check`, `bun run typecheck`, `bun run test` e um bundle do app (`bun run export` em `apps/mobile`).
4. Atualize a tabela acima e as restrições conhecidas.
