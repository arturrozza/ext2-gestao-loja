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

## Autoria

Projeto das disciplinas de Extensão Universitária (BSI), feito em dupla.

- **João Vitor Gugel** ([@gugeldev](https://github.com/gugeldev)): código do aplicativo e da API, autor dos commits da branch `main`.
- **Artur Scussel Rozza** ([@arturrozza](https://github.com/arturrozza)): documentação do projeto (requisitos funcionais e não funcionais, regras de negócio, casos de uso, diagramas de sequência e modelagem de dados), a atualização desses documentos conforme o sistema implementado, o relatório final da disciplina e a especificação do controle de vendas a prazo (fiado) em [`docs/product/vendas.md`](docs/product/vendas.md).

## Documentação

- [`docs/product/`](docs/product/README.md): o que o sistema faz (módulos, regras funcionais, regras de negócio e modelo
  de dados)
- [`docs/getting-started.md`](docs/getting-started.md): como rodar o projeto
- [`docs/architecture.md`](docs/architecture.md): como as partes se conectam, env, Docker
- [`docs/stack.md`](docs/stack.md): ferramentas, versões e restrições conhecidas
- [`docs/conventions.md`](docs/conventions.md): nomes, código, validação, dados, git
- [`docs/testing.md`](docs/testing.md): estratégia de testes
- [`AGENTS.md`](AGENTS.md): regras para agentes de IA
