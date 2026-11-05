# Acesso e loja

## Objetivo

Garantir que só quem é da loja acesse os dados dela e permitir manter os dados e as configurações da loja.

## Funcionalidades

- Entrar com e-mail e senha.
- Sair.
- Trocar a senha, já logado.
- Ver os usuários da loja, criar um novo (nome, e-mail e senha), desativar e reativar.
- Ver e editar os dados da loja.
- Editar as configurações da loja.

## Regras

- A loja e o primeiro usuário são criados pela equipe na implantação. Não há cadastro aberto: quem já usa o app cria
  os outros usuários.
- Todos os usuários podem o mesmo, sem permissões diferentes. Qualquer um cria, desativa e reativa os outros.
- O e-mail é único: não dá para criar dois usuários com o mesmo e-mail.
- Usuário não é excluído, é desativado: sai do app na hora e não consegue mais entrar. Dá para reativar.
- Ninguém desativa o próprio usuário, para a loja nunca ficar sem acesso.
- Trocar a senha encerra o acesso nos outros aparelhos do usuário.
- A equipe tem uma senha mestra, que entra como qualquer usuário, para suporte. Ela fica fora do app e pode ser
  desligada.
- Sem login, nenhuma tela além da de entrada fica acessível e nenhum dado é retornado.
- O usuário só acessa os dados da própria loja.
- A sessão expira após 30 dias sem uso.
- Depois de 5 senhas erradas seguidas, aquele e-mail fica bloqueado por 15 minutos.
- Se a pessoa esquecer a senha, a equipe redefine (entrando com a senha mestra), ou outro usuário da loja desativa
  esse usuário e cria outro.
- Dados da loja: nome, documento, telefone e endereço.
- Configurações: imposto padrão, taxa do Mercado Livre, antecedência de vencimento, período de produto parado e limite de
  margem baixa.
- Uma loja nova começa com imposto e taxa do Mercado Livre em 0% e os alertas em 30 dias, 60 dias e 10%
  ([Alertas](alertas.md)).

## Em aberto

- Se há restrição de ver custo e lucro: [validar com o cliente](README.md#validar-com-o-cliente).
