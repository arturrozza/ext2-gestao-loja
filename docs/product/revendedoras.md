# Revendedoras

## Objetivo

Controlar as vendas feitas por revendedoras e calcular a comissão sem conta manual. A revendedora é um cadastro: ela não
acessa o app.

## Funcionalidades

- Cadastrar e editar revendedora.
- Arquivar e reativar.
- Ver as vendas e as comissões de cada uma.

## Regras

- Dados: nome, telefone, comissão padrão (%) e observação.
- Ao escolher o canal Revendedora na venda, a pessoa seleciona quem vendeu e a comissão padrão vem preenchida, editável só
  naquela venda.
- A comissão incide sobre o valor final da venda e entra como custo no lucro real.
- Mudar a comissão padrão não altera vendas antigas.
- Só revendedoras ativas entram em novas vendas. Arquivadas continuam no histórico e nos relatórios.
- Vendas canceladas não entram no total de comissões.

Exemplo: venda de R$ 200 com comissão de 10% = R$ 20 de custo.

## Fora do escopo

Consignado e registro de acerto, até a resposta do cliente.

## Em aberto

- A revendedora leva o produto e acerta depois? Se sim, este módulo e o estoque mudam:
  [perguntas para o cliente](README.md#perguntas-para-o-cliente).
