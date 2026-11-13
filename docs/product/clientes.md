# Clientes

Cadastro dos clientes da loja e histórico de compras de cada um.

## Regras funcionais

- **RF-CLI-01.** O usuário pode ver a lista de clientes em ordem alfabética, com nome e telefone.
- **RF-CLI-02.** O usuário pode buscar clientes por nome ou telefone, com ou sem máscara.
- **RF-CLI-03.** O usuário pode alternar entre clientes ativos e arquivados.
- **RF-CLI-04.** O usuário pode cadastrar e editar um cliente com nome, telefone, endereço e observação.
- **RF-CLI-05.** O usuário pode criar um cliente na própria venda, informando só o nome.
- **RF-CLI-06.** A tela do cliente mostra os dados dele, o número de compras, o total gasto, a data da última compra e
  a lista das vendas com ele.
- **RF-CLI-07.** Na tela do cliente com telefone, o usuário pode abrir a conversa com ele no WhatsApp.
- **RF-CLI-08.** O usuário pode arquivar e reativar um cliente.

## Regras de negócio

- **RN-CLI-01.** Obrigatório: nome (até 120 caracteres). Telefone, endereço (texto livre, até 300 caracteres) e
  observação (até 500 caracteres) são opcionais.
- **RN-CLI-02.** O nome pode se repetir. Na lista e na escolha do cliente na venda, o telefone aparece abaixo do nome.
- **RN-CLI-03.** O endereço não entra na busca.
- **RN-CLI-04.** O WhatsApp abre com o telefone do cadastro como número do Brasil.
- **RN-CLI-05.** Cliente não é excluído, é arquivado. Só clientes ativos podem ser escolhidos em novas vendas. Clientes
  arquivados continuam nas vendas já registradas e podem ser reativados.
- **RN-CLI-06.** Cliente arquivado não é editado. Para alterar, o usuário reativa o cliente antes.
- **RN-CLI-07.** Número de compras, total gasto e última compra consideram só as vendas não canceladas. O total gasto é
  a soma das receitas dessas vendas.

## Fora do escopo

Limite de crédito e CPF.
