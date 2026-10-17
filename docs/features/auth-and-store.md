# Autenticação e gestão da loja

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC01, UC02, UC03, UC04

## Objetivo

Garantir que só o usuário da loja acesse os dados dela (produtos, estoque, vendas, relatórios) e permitir manter os
dados básicos da loja.

## Premissas do MVP

- **Uma loja e um usuário.** Os dados são separados por loja, para permitir mais lojas no futuro, mas o MVP atende
  uma só.
- **Sem cadastro pelo app.** A loja e o usuário são criados pela equipe na implantação; o app só tem login.

## Requisitos funcionais

- [ ] RF001 — Criar conta de usuário. *(feito na implantação, não pelo app)*
- [ ] RF002 — Realizar login.
- [ ] RF003 — Realizar logout.
- [ ] RF004 — Recuperar a senha. *(forma em aberto, ver dúvidas)*
- [ ] RF005 — Cadastrar os dados básicos da loja. *(nome na implantação; o resto pelo app, RF010)*
- [ ] RF006 — Vincular a loja ao usuário.
- [ ] RF007 — Restringir o acesso aos dados da loja aos usuários vinculados a ela.
- [ ] RF008 — Manter os dados de cada loja isolados das demais.
- [ ] RF009 — Visualizar os dados básicos da loja.
- [ ] RF010 — Editar os dados básicos da loja.
- [ ] RF011 — Impedir o acesso às funcionalidades principais sem autenticação.

## Regras de negócio

- RN001 — Cada usuário acessa apenas os dados da loja à qual está vinculado.
- RN002 — Os dados de produtos, estoque, entradas, vendas, custos, relatórios e alertas ficam isolados entre lojas.
- RN003 — Cada usuário está vinculado a uma única loja. *(MVP: e cada loja tem um único usuário)*
- RN004 — O usuário precisa estar autenticado para acessar as funcionalidades principais.

Não funcionais relacionados: RNF001, RNF002, RNF003, RNF004, RNF006.

## Fora do escopo

- Cadastro de conta ou de loja pelo app.
- Vários usuários por loja, perfis e permissões.
- Um usuário com várias lojas e troca de loja no app.
- Login social, verificação em duas etapas.

## Fluxos / telas

**UC01 — Cadastrar conta e loja.** Feito pela equipe na implantação: nome da loja, nome, e-mail e senha do usuário.

**UC02 — Autenticar.**
1. App aberto sem login → tela de login (e-mail + senha). Nenhuma outra tela é acessível.
2. Login correto → abre o início. O usuário continua logado até sair ou até a sessão expirar.
3. Login errado → "E-mail ou senha inválidos", sem dizer qual dos dois está errado.
4. Sessão expirada → o app volta para o login.
5. Sair (menu da loja) → volta para o login.

**UC03 — Recuperar senha.** Forma em aberto (ver dúvidas).

**UC04 — Gerenciar dados da loja.** Tela "Loja": visualizar e editar nome, documento (CPF/CNPJ), telefone e endereço.
Mostra também o e-mail do usuário e o botão de sair. Depois recebe as configurações de alertas (D09) e o acesso ao
Mercado Livre.

## Dados

| Entidade | Campo | Obrigatório | Validação |
| --- | --- | --- | --- |
| Loja | nome | sim | 1–120 caracteres |
| Loja | documento | não | CPF ou CNPJ válido |
| Loja | telefone | não | |
| Loja | endereço | não | |
| Usuário | nome | sim | |
| Usuário | e-mail | sim | único, formato de e-mail |
| Usuário | senha | sim | mínimo 8 caracteres (RNF002) |

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dado um usuário sem login, então nenhuma tela além do login fica acessível e nenhum dado é retornado.
- [ ] Dado e-mail e senha corretos, quando faz login, então acessa o app; com senha errada, vê "E-mail ou senha
      inválidos".
- [ ] Dado um usuário que saiu, então precisa fazer login de novo para acessar qualquer dado.
- [ ] Dadas duas lojas A e B, então o usuário de A não consegue ver nem alterar nada de B.
- [ ] Dado um usuário logado, quando edita o nome da loja, então o novo nome aparece no app.
- [ ] A senha nunca é exibida nem armazenada em texto puro.

## Dúvidas em aberto

- **Recuperar senha (RF004):** no MVP, basta a equipe redefinir a senha quando o cliente pedir, ou o cliente precisa
  recuperar sozinho pelo app (por e-mail)?
- **Tempo logado:** quanto tempo o usuário fica logado sem abrir o app? (Proposta: 30 dias.)
- **Trocar a senha** pelo app, já logado, entra no MVP?
- Quais dados da loja são realmente usados (o documento aparece em algum relatório)?
