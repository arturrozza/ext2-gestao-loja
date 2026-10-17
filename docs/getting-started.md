# Rodando o projeto

## 1. Ferramentas

| Ferramenta | Versão | Instalação |
| --- | --- | --- |
| Git | recente | https://git-scm.com/downloads |
| Bun | 1.4+ | https://bun.sh/docs/installation |
| Node.js (usado pelo Expo) | 22.13+ | https://nodejs.org/en/download |
| Docker + Compose | recente | https://docs.docker.com/get-started/get-docker/ |

No Linux, siga também o [pós-instalação do Docker](https://docs.docker.com/engine/install/linux-postinstall/) para
rodar sem `sudo`. Use só `bun`/`bunx`, nunca npm/yarn/pnpm/npx.

## 2. Fork e clone

Faça o fork de https://github.com/gugeldev/ext.2 pelo botão **Fork** no GitHub e depois:

```bash
git clone https://github.com/<seu-usuario>/ext.2.git
cd ext.2
git remote add upstream https://github.com/gugeldev/ext.2.git
```

Para trazer as novidades do repositório oficial: `git pull upstream main`.

## 3. Dependências e `.env`

```bash
bun install
cp .env.example .env
```

## 4. Banco e API

Com o Docker rodando:

```bash
bun run up     # postgres + API em http://localhost:3000
```

Confira em http://localhost:3000/health. A resposta deve ser `{"status":"ok","database":"up"}`. Para parar, use
`bun run down`.

Se for mexer na API, use `bun run db:up` + `bun run dev:server` (com hot reload) no lugar do `up`. Os dois usam a
porta 3000, então não rode juntos.

## 5. App (Expo Go)

1. Instale o **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) ·
   [iOS](https://apps.apple.com/app/expo-go/id982107779)).
2. Deixe o celular na mesma Wi-Fi do computador.
3. No `.env`, troque `localhost` pelo IP do computador na rede local:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
   ```

   O IP aparece na linha `Metro waiting on exp://<IP>:8081` quando o Expo sobe.
4. Rode o Expo e escaneie o QR code com o Expo Go:

   ```bash
   bun run dev:mobile
   ```

A tela deve mostrar `ok · db up`. Se aparecer **Indisponível**, o app não está chegando na API. Confira o IP no
`.env`, reinicie o Expo e veja se o firewall libera as portas 3000 e 8081. Se mudou o `.env` e o valor antigo
continua, rode `bun run start --clear` dentro de `apps/mobile`.

## 6. Verificações

Com o postgres rodando:

```bash
bun run check && bun run typecheck && bun run test
```
