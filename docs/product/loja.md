# Loja

Dados cadastrais e configurações da loja. A tela da Loja também reúne a conta do usuário (usuários, trocar senha e
sair, ver [Acesso](acesso.md) e [Usuários](usuarios.md)).

## Regras funcionais

- **RF-LOJ-01.** O usuário pode ver e editar os dados da loja: nome, documento, telefone e endereço.
- **RF-LOJ-02.** O usuário pode ver e editar as configurações da loja: imposto padrão, taxa do Mercado Livre e
  antecedência do aviso de vencimento.
- **RF-LOJ-03.** A tela da Loja mostra o nome e o e-mail do usuário logado.

## Regras de negócio

- **RN-LOJ-01.** Obrigatório: nome (até 120 caracteres). Documento (CPF ou CNPJ, até 30 caracteres), telefone (até 30
  caracteres) e endereço (até 300 caracteres) são opcionais e livres.
- **RN-LOJ-02.** O imposto padrão e a taxa do Mercado Livre vão de 0% a 100%. São sugeridos em cada venda e podem ser
  alterados nela ([Vendas](vendas.md)). Mudar uma configuração não altera vendas já registradas.
- **RN-LOJ-03.** A antecedência do aviso de vencimento vai de 1 a 365 dias e define o alerta "Perto de vencer"
  ([Alertas](alertas.md)).
- **RN-LOJ-04.** Uma loja nova começa com imposto padrão de 0%, taxa do Mercado Livre de 0% e antecedência de
  vencimento de 30 dias.
- **RN-LOJ-05.** A loja é criada na implantação do sistema. Não há cadastro nem troca de loja pelo app.
