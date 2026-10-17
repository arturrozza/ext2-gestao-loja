# ext2

Sistema de gerenciamento de loja: app mobile (Expo) e API (Bun + Elysia), num monorepo Bun.

## Requisitos

- Bun 1.4+
- Node.js 22.13+ / 24.3+ (usado pelo Expo CLI)
- Docker

## Começando

Passo a passo completo: [`docs/getting-started.md`](docs/getting-started.md).

```bash
bun install
cp .env.example .env
bun run up           # postgres + server no Docker → http://localhost:3000/health
bun run dev:mobile
```

Para desenvolver o server com hot reload, use `bun run db:up` + `bun run dev:server` no lugar do `bun run up`.

## Documentação

- [`docs/product.md`](docs/product.md) — visão de produto, módulos e decisões pendentes
- [`docs/domain.md`](docs/domain.md) — glossário, entidades e cálculos (custo médio, lucro real)
- [`docs/non-functional-requirements.md`](docs/non-functional-requirements.md) — requisitos não funcionais
- [`docs/getting-started.md`](docs/getting-started.md) — como rodar o projeto
- [`docs/architecture.md`](docs/architecture.md) — como as partes se conectam, env, Docker
- [`docs/stack.md`](docs/stack.md) — ferramentas, versões e restrições conhecidas
- [`docs/conventions.md`](docs/conventions.md) — nomes, código, validação, dados, git
- [`docs/testing.md`](docs/testing.md) — estratégia de testes
- [`docs/features/`](docs/features/README.md) — specs das features (regras de negócio, requisitos, casos de uso)
- [`AGENTS.md`](AGENTS.md) — regras para agentes de IA
