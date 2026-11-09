# Revendedoras

## Objetivo

Controlar as vendas feitas por revendedoras e calcular a comissão sem conta manual. A revendedora é um cadastro: ela não
acessa o app.

## Funcionalidades

- Cadastrar e editar revendedora.
- Arquivar e reativar.
- Ver as vendas e as comissões de cada uma, por período.
- Buscar por nome ou telefone, com ou sem a máscara.

## Regras

- Dados: nome, telefone, comissão padrão (%) e observação.
- Obrigatórios: nome e comissão padrão. Telefone e observação são opcionais.
- O nome pode se repetir. Na lista e na escolha da venda, a comissão e o telefone aparecem embaixo do nome para
  diferenciar.
- O telefone, quando informado, tem DDD.
- A comissão padrão vai de 0% a 100%, com até duas casas decimais.
- Ao escolher o canal Revendedora na venda, a pessoa seleciona quem vendeu e a comissão padrão vem preenchida, editável só
  naquela venda.
- A comissão incide sobre o valor final da venda e entra como custo no lucro real.
- Mudar a comissão padrão não altera vendas antigas.
- Revendedora não é excluída, só arquivada. Só revendedoras ativas entram em novas vendas. Arquivadas continuam no
  histórico e nos relatórios, e dá para reativar.
- Revendedora arquivada não se edita: para mudar algo, primeiro reativa.
- Vendas canceladas não entram no total de comissões.
- Na tela dela, os números (vendido, número de vendas e comissão) e a lista de vendas seguem um período: hoje, últimos
  7 dias, mês atual ou tudo. Começa no mês atual, para acertar o mês com ela. Na lista de revendedoras, os totais são
  de todas as vendas.

Exemplo: venda de R$ 200 com comissão de 10% = R$ 20 de custo.

## Fora do escopo

Consignado e registro de acerto, até a resposta do cliente.

## Em aberto

- A revendedora leva o produto e acerta depois? Se sim, este módulo e o estoque mudam:
  [validar com o cliente](README.md#validar-com-o-cliente).
