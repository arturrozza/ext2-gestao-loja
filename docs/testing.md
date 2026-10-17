# Testes

> Atualize este arquivo sempre que a estratégia ou as ferramentas de teste mudarem.

## Server (`bun test`)

| Tipo | Onde | Banco | Comando (em `apps/server`) |
| --- | --- | --- | --- |
| Unit | `src/**/*.test.ts`, ao lado do código (ex.: `products.service.test.ts`) | nenhum | `bun run test:unit` |
| E2E | `test/e2e/<module>.e2e.test.ts` (ex.: `products.e2e.test.ts`) | `ext2_test` | `bun run test:e2e` (migra o banco de teste antes) |

- Os scripts de teste carregam `.env` e, por cima, `.env.test` (na raiz), que aponta o `DATABASE_URL` para o
  `ext2_test`. O banco de teste é criado pelo `docker/postgres-init.sql` no mesmo container do Postgres.
- Os e2e usam o `app` em memória (sem abrir porta), com um client Eden tipado:

  ```ts
  import { treaty } from "@elysia/eden";
  import { app } from "../../src/app";

  const api = treaty(app);
  const { data, status } = await api.health.get();
  ```

- Se usar `app.handle(new Request(...))`, a URL precisa ser absoluta (`http://localhost/...`).

### O que testar

- **Unit:** regras de negócio dos services (cálculos, validações de domínio) e schemas Zod com regras próprias.
- **E2E:** toda rota tem pelo menos o caminho feliz e um erro de validação (422). Rotas com regra de negócio também
  cobrem os erros de domínio.
- Cada e2e cria os próprios dados e não depende da ordem dos testes. Quando surgirem as primeiras tabelas, criar um
  helper em `test/` que limpa o banco (`TRUNCATE ... RESTART IDENTITY CASCADE`) no `beforeEach`.

## Mobile

Ainda sem testes automatizados. Por enquanto, o mínimo é `bun run typecheck` + `bun run doctor` + subir o app.
Quando forem adotados, seguir a doc oficial: https://docs.expo.dev/develop/unit-testing/

## Definição de pronto

```bash
bun run check && bun run typecheck && bun run test
```
