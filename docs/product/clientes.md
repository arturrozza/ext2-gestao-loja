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

## Regras

- Dados: nome, telefone e observação.
- Obrigatório: só o nome. Telefone e observação são opcionais.
- O nome pode se repetir. Na lista e na escolha da venda, o telefone aparece embaixo do nome para diferenciar.
- O telefone, quando informado, tem DDD.
- Cliente não é excluído, só arquivado. Só clientes ativos aparecem em novas vendas. Arquivados continuam no histórico,
  e dá para reativar.
- Cliente arquivado não se edita: para mudar algo, primeiro reativa.
- Vendas canceladas não entram no total gasto nem na última compra.
- O cliente é opcional na venda, para não travar a venda no balcão.
- Na venda, a pessoa busca um cliente ou cria um ali mesmo, só com o nome.

## Ainda não disponível no app

O histórico de compras, o total gasto e a última compra chegam junto com [Vendas](vendas.md). Até lá, a tela do cliente
mostra os totais zerados e as compras como "Em construção".

## Fora do escopo

Fiado, limite de crédito, CPF e endereço.
