# Usuários

Pessoas que entram no app. A tela fica em Loja > Usuários.

## Regras funcionais

- **RF-USU-01.** O usuário pode ver a lista de usuários da loja, em ordem alfabética, com nome, e-mail e situação
  (ativo ou desativado).
- **RF-USU-02.** O usuário pode criar um usuário informando nome, e-mail e senha.
- **RF-USU-03.** O usuário pode desativar outro usuário.
- **RF-USU-04.** O usuário pode reativar um usuário desativado.

## Regras de negócio

- **RN-USU-01.** Obrigatórios: nome (até 120 caracteres), e-mail válido e senha (de 8 a 128 caracteres).
- **RN-USU-02.** O e-mail é único no sistema, sem diferenciar maiúsculas de minúsculas, contando os usuários
  desativados.
- **RN-USU-03.** Qualquer usuário cria, desativa e reativa os outros.
- **RN-USU-04.** Usuário não é excluído, é desativado. Desativar encerra na hora todas as sessões dele, e ele não
  consegue mais entrar.
- **RN-USU-05.** Ninguém desativa o próprio usuário.
- **RN-USU-06.** Um usuário desativado no momento da ação não consegue desativar outro. Assim a loja nunca fica sem
  usuário ativo.
- **RN-USU-07.** Usuário desativado continua como autor das compras, vendas e movimentações que lançou.
- **RN-USU-08.** Não há edição de nome nem de e-mail de usuário.
