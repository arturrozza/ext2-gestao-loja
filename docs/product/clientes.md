# Clientes

> Módulo novo em relação à EXT1, inspirado no Pedido OK. O cliente confirma nos testes se usa (ver
> [validar com o cliente](README.md#validar-com-o-cliente)).

## Objetivo

Manter os clientes fixos da loja e saber o que cada um compra.

## Funcionalidades

- Cadastrar e editar cliente.
- Arquivar e reativar.
- Ver histórico de compras, total gasto e data da última compra.
- Buscar por nome ou telefone, com ou sem a máscara.
- Abrir a conversa com o cliente no WhatsApp, a partir da tela dele.

## Regras

- Dados: nome, telefone, endereço e observação.
- Obrigatório: só o nome. Telefone, endereço e observação são opcionais.
- O endereço é um texto livre, escrito como a loja quiser ("Rua das Flores, 120, ap 32 – Jardins"). Não entra na
  busca.
- O botão do WhatsApp aparece só na tela do cliente, e só quando ele tem telefone. A conversa abre com o número do
  cadastro, como número do Brasil.
- O nome pode se repetir. Na lista e na escolha da venda, o telefone aparece embaixo do nome para diferenciar.
- O telefone, quando informado, tem DDD.
- Cliente não é excluído, só arquivado. Só clientes ativos aparecem em novas vendas. Arquivados continuam no histórico,
  e dá para reativar.
- Cliente arquivado não se edita: para mudar algo, primeiro reativa.
- Vendas canceladas não entram no total gasto nem na última compra.
- O cliente é opcional na venda, para não travar a venda no balcão.
- Na venda, a pessoa busca um cliente ou cria um ali mesmo, só com o nome.

## Fora do escopo

Fiado, limite de crédito e CPF.
